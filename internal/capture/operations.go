package capture

import (
	"context"

	"agenttm/internal/events"
	"agenttm/internal/storage"
)

func (o *Observer) lookup(item string) (operation, error) {
	var op operation
	err := o.Engine.Store.DB.QueryRow("SELECT id,tool_name,COALESCE(before_checkpoint_id,''),COALESCE(after_checkpoint_id,''),COALESCE(start_event_id,''),COALESCE(completion_event_id,''),missing_start FROM operations WHERE session_id=? AND run_id=? AND upstream_item_id=?", o.Session, o.RunID, item).Scan(&op.id, &op.tool, &op.before, &op.after, &op.start, &op.completion, &op.missing)
	return op, err
}

func (o *Observer) start(ctx context.Context, r events.Record, eventID, item string) (operation, error) {
	missing := r.Kind != "item.started"
	op := operation{id: storage.ID(), tool: r.Tool, missing: missing}
	captureStatus := "pending"
	if !o.Enabled {
		captureStatus = "disabled"
	}
	tx, err := o.Engine.Store.DB.Begin()
	if err != nil {
		return operation{}, err
	}
	defer tx.Rollback()
	var active int
	if err = tx.QueryRow("SELECT count(*) FROM operations WHERE session_id=? AND run_id=? AND status='running'", o.Session, o.RunID).Scan(&active); err != nil {
		return operation{}, err
	}
	if active > 0 {
		if _, err = tx.Exec("UPDATE operations SET overlapping=1 WHERE session_id=? AND run_id=? AND status='running'", o.Session, o.RunID); err != nil {
			return operation{}, err
		}
	}
	var start any
	if !missing {
		start = eventID
		op.start = eventID
	}
	_, err = tx.Exec("INSERT INTO operations(id,session_id,run_id,upstream_item_id,upstream_turn_id,tool_name,start_event_id,started_at,capture_status,overlapping,missing_start) VALUES (?,?,?,?,?,?,?,?,?,?,?)", op.id, o.Session, o.RunID, item, o.TurnID, r.Tool, start, storage.Now(), captureStatus, active > 0, missing)
	if err != nil {
		return operation{}, err
	}
	if err = tx.Commit(); err != nil {
		return operation{}, err
	}
	if !missing && o.Enabled {
		boundary, err := o.Engine.CaptureBoundary(ctx, o.Session, eventID, "operation_before")
		if err != nil {
			return operation{}, o.failed(op.id, "before", err)
		}
		op.before = boundary.Manifest.ID
		if _, err = o.Engine.Store.DB.Exec("UPDATE operations SET before_checkpoint_id=? WHERE id=?", op.before, op.id); err != nil {
			return operation{}, err
		}
	}

	return op, nil
}
