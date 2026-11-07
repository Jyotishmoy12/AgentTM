package interactive

import (
	"context"
	"fmt"
	"strings"
	"time"

	"agenttm/internal/capture"
	"agenttm/internal/events"
)

func (m *Manager) finish(ctx context.Context, session, prompt string, observer *capture.Observer, runErr error, finalStatus string) {
	if err := observer.Finish(); err != nil && finalStatus == "completed" && ctx.Err() == nil {
		runErr = err
		finalStatus = "recording_failed"
	}
	cleanup, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	if _, err := m.Engine.Capture(cleanup, session, "final"); err != nil {
		runErr = fmt.Errorf("final checkpoint failed: %w", err)
		finalStatus = "recording_failed"
	}
	if ctx.Err() != nil && finalStatus != "recording_failed" {
		finalStatus = "cancelled"
	}
	if runErr != nil && finalStatus == "completed" {
		finalStatus = "failed"
	}
	code := 0
	if finalStatus != "completed" {
		code = 1
	}
	if finalStatus == "cancelled" {
		code = 130
	}
	payload := events.Encode(map[string]any{"status": finalStatus, "exit_code": code}, m.Engine.Config.Capture.MaxEventPayloadBytes, "")
	if err := m.Engine.Store.Append(session, "agenttm.process.exited", "", "", payload); err != nil {
		runErr = err
		finalStatus = "recording_failed"
	}
	if err := m.Engine.Store.Finish(session, finalStatus, code); err != nil {
		runErr = err
	}
	m.mu.Lock()
	m.state.Draft = ""
	m.state.Approvals = []Approval{}
	m.rpc = nil
	m.thread = ""
	m.turn = ""
	if runErr != nil && m.state.Error == "" {
		m.state.Error = events.Redact(strings.ReplaceAll(runErr.Error(), prompt, "[PROMPT OMITTED]"))
	}
	m.mu.Unlock()
}
