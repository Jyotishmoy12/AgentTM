package snapshot

import (
	"context"
	"fmt"
)

func (e *Engine) Capture(ctx context.Context, session, kind string) (CaptureResult, error) {
	return e.capture(ctx, session, kind, "")
}

func (e *Engine) CaptureNear(ctx context.Context, session, event string) (CaptureResult, error) {
	if !ValidID(event) {
		return CaptureResult{}, fmt.Errorf("invalid observed event UUID")
	}
	var count int
	if err := e.Store.DB.QueryRow("SELECT count(*) FROM events WHERE id=? AND session_id=? AND kind='item.completed' AND tool_name IN ('command_execution','file_change')", event, session).Scan(&count); err != nil {
		return CaptureResult{}, err
	}
	if count != 1 {
		return CaptureResult{}, fmt.Errorf("event is not a supported completed tool observation")
	}
	return e.capture(ctx, session, "observed", event)
}

func (e *Engine) CaptureBoundary(ctx context.Context, session, event, kind string) (CaptureResult, error) {
	expected := "item.started"
	if kind == "operation_after" {
		expected = "item.completed"
	} else if kind != "operation_before" {
		return CaptureResult{}, fmt.Errorf("invalid operation boundary")
	}
	var count int
	if err := e.Store.DB.QueryRow("SELECT count(*) FROM events WHERE id=? AND session_id=? AND kind=? AND tool_name!=''", event, session, expected).Scan(&count); err != nil {
		return CaptureResult{}, err
	}
	if count != 1 {
		return CaptureResult{}, fmt.Errorf("event does not match operation boundary")
	}
	return e.capture(ctx, session, kind, event)
}
