package capture

import (
	"context"
	"encoding/json"

	"agenttm/internal/events"
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
)

func (o *Observer) complete(ctx context.Context, op operation, r events.Record, eventID string) error {
	var err error
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
	var payload completionPayload
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
