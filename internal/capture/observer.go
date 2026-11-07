package capture

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"agenttm/internal/events"
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
)

func New(engine *snapshot.Engine, session string, enabled bool) *Observer {
	return &Observer{Engine: engine, Session: session, RunID: storage.ID(), Enabled: enabled}
}

func supported(tool string) bool {
	return tool == "command_execution" || tool == "file_change" || tool == "mcp_tool_call" || tool == "dynamic_tool_call"
}

func (o *Observer) Observe(ctx context.Context, r events.Record, eventID string) error {
	if r.Kind == "turn.started" {
		var payload turnPayload
		_ = json.Unmarshal(r.Payload, &payload)
		if payload.TurnID != "" {
			o.TurnID = payload.TurnID
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
		op, err = o.start(ctx, r, eventID, item)
		if err != nil {
			return err
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
	return o.complete(ctx, op, r, eventID)
}
