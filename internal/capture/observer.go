// Package capture records received operation boundaries and their workspace
// observations. It cannot pause Codex's tools or exclude other filesystem writers.
package capture

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"agenttm/internal/events"
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
)

type Observer struct {
	Engine                 *snapshot.Engine
	Session, RunID, TurnID string
	Enabled                bool
}

func New(engine *snapshot.Engine, session string, enabled bool) *Observer {
	return &Observer{Engine: engine, Session: session, RunID: storage.ID(), Enabled: enabled}
}

type operation struct {
	id, tool, before, after, start, completion string
	missing                                    bool
}

func (o *Observer) lookup(item string) (operation, error) {
	var op operation
	err := o.Engine.Store.DB.QueryRow("SELECT id,tool_name,COALESCE(before_checkpoint_id,''),COALESCE(after_checkpoint_id,''),COALESCE(start_event_id,''),COALESCE(completion_event_id,''),missing_start FROM operations WHERE session_id=? AND run_id=? AND upstream_item_id=?", o.Session, o.RunID, item).Scan(&op.id, &op.tool, &op.before, &op.after, &op.start, &op.completion, &op.missing)
	return op, err
}
func supported(tool string) bool {
	return tool == "command_execution" || tool == "file_change" || tool == "mcp_tool_call" || tool == "dynamic_tool_call"
}

func (o *Observer) Observe(ctx context.Context, r events.Record, eventID string) error {
	if r.Kind == "turn.started" {
		var p struct {
			TurnID string `json:"turn_id"`
		}
		_ = json.Unmarshal(r.Payload, &p)
		if p.TurnID != "" {
			o.TurnID = p.TurnID
		}
		return nil
	}
	if !supported(r.Tool) || (r.Kind != "item.started" && r.Kind != "item.completed") {
		return nil
	}
	if !snapshot.ValidID(eventID) {
		return fmt.Errorf("invalid operation event UUID")
	}
	item := r.Call
	if item == "" {
		item = "missing-id:" + eventID
	}
	op, err := o.lookup(item)
	if err != nil && err != sql.ErrNoRows {
		return err
	}
	if err == sql.ErrNoRows {
		err = nil
		missing := r.Kind != "item.started"
		op = operation{id: storage.ID(), tool: r.Tool, missing: missing}
		captureStatus := "pending"
		if !o.Enabled {
			captureStatus = "disabled"
		}
		tx, err := o.Engine.Store.DB.Begin()
		if err != nil {
			return err
		}
		defer tx.Rollback()
		var active int
		if err = tx.QueryRow("SELECT count(*) FROM operations WHERE session_id=? AND run_id=? AND status='running'", o.Session, o.RunID).Scan(&active); err != nil {
			return err
		}
		if active > 0 {
			if _, err = tx.Exec("UPDATE operations SET overlapping=1 WHERE session_id=? AND run_id=? AND status='running'", o.Session, o.RunID); err != nil {
				return err
			}
		}
		var start any
		if !missing {
			start = eventID
			op.start = eventID
		}
		_, err = tx.Exec("INSERT INTO operations(id,session_id,run_id,upstream_item_id,upstream_turn_id,tool_name,start_event_id,started_at,capture_status,overlapping,missing_start) VALUES (?,?,?,?,?,?,?,?,?,?,?)", op.id, o.Session, o.RunID, item, o.TurnID, r.Tool, start, storage.Now(), captureStatus, active > 0, missing)
		if err != nil {
			return err
		}
		if err = tx.Commit(); err != nil {
			return err
		}
		if !missing && o.Enabled {
			boundary, err := o.Engine.CaptureBoundary(ctx, o.Session, eventID, "operation_before")
			if err != nil {
				return o.failed(op.id, "before", err)
			}
			op.before = boundary.Manifest.ID
			if _, err = o.Engine.Store.DB.Exec("UPDATE operations SET before_checkpoint_id=? WHERE id=?", op.before, op.id); err != nil {
				return err
			}
		}
	} else if op.tool != r.Tool {
		return fmt.Errorf("operation item ID was reused for a different tool")
	}
	if r.Kind == "item.started" {
		if op.before != "" {
			_, err = o.Engine.Store.DB.Exec("UPDATE events SET checkpoint_id=? WHERE id=? AND session_id=?", op.before, eventID, o.Session)
		}
		return err
	}
	// Deduplicate repeated terminal notifications within this local run. A new
	// turn/run may safely reuse the same upstream item ID.
	if op.completion != "" {
		if op.after != "" {
			_, err = o.Engine.Store.DB.Exec("UPDATE events SET checkpoint_id=? WHERE id=? AND session_id=?", op.after, eventID, o.Session)
		}
		return err
	}
	if _, err = o.Engine.Store.DB.Exec("UPDATE operations SET completion_event_id=? WHERE id=?", eventID, op.id); err != nil {
		return err
	}
	captureStatus := "disabled"
	afterID := ""
	paths := []string{}
	pathCount := 0
	if o.Enabled {
		boundary, err := o.Engine.CaptureBoundary(ctx, o.Session, eventID, "operation_after")
		if err != nil {
			return o.failed(op.id, "after", err)
		}
		afterID = boundary.Manifest.ID
		captureStatus = "complete"
		if boundary.Manifest.Partial {
			captureStatus = "partial"
		}
		if op.before != "" {
			before, err := o.Engine.Load(op.before)
			if err != nil {
				return o.failed(op.id, "comparison", err)
			}
			paths = snapshot.ChangedPaths(before, boundary.Manifest)
			pathCount = len(paths)
			if before.Partial {
				captureStatus = "partial"
			}
		}
		if op.missing {
			captureStatus = "missing_start"
		}
	}
	if len(paths) > 200 {
		paths = paths[:200]
	}
	encoded, _ := json.Marshal(paths)
	var payload struct {
		Item struct {
			Status string `json:"status"`
		} `json:"item"`
	}
	_ = json.Unmarshal(r.Payload, &payload)
	status := "completed"
	switch payload.Item.Status {
	case "failed", "declined", "cancelled", "interrupted":
		status = payload.Item.Status
	}
	var after any
	if afterID != "" {
		after = afterID
	}
	_, err = o.Engine.Store.DB.Exec("UPDATE operations SET after_checkpoint_id=?,completed_at=?,status=?,capture_status=?,changed_paths_json=?,changed_path_count=? WHERE id=?", after, storage.Now(), status, captureStatus, string(encoded), pathCount, op.id)
	return err
}
func (o *Observer) failed(id, boundary string, cause error) error {
	captureStatus := "failed"
	if errors.Is(cause, context.Canceled) || errors.Is(cause, context.DeadlineExceeded) {
		captureStatus = "interrupted"
	}
	_, err := o.Engine.Store.DB.Exec("UPDATE operations SET status='interrupted',capture_status=?,error=?,completed_at=? WHERE id=?", captureStatus, boundary+" checkpoint capture failed; inspect recording and storage", storage.Now(), id)
	if err != nil {
		return err
	}
	return fmt.Errorf("operation %s checkpoint failed: %w", boundary, cause)
}

// Finish never pretends that an operation with no completion notification
// completed successfully. Crash leftovers remain running for doctor to report.
func (o *Observer) Finish() error {
	result, err := o.Engine.Store.DB.Exec("UPDATE operations SET status='interrupted',capture_status=CASE WHEN capture_status='disabled' THEN 'disabled' ELSE 'interrupted' END,completed_at=?,error='Operation ended without a completed boundary' WHERE session_id=? AND run_id=? AND status='running'", storage.Now(), o.Session, o.RunID)
	if err != nil {
		return err
	}
	n, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if n > 0 {
		return fmt.Errorf("%d operations ended without a completion boundary", n)
	}
	return nil
}
