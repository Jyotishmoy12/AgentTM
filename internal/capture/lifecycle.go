package capture

import (
	"context"
	"errors"
	"fmt"

	"agenttm/internal/storage"
)

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
