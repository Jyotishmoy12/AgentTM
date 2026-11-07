package interactive

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"agenttm/internal/operation"
	"agenttm/internal/snapshot"
)

func (m *Manager) Start(ctx context.Context, session, prompt, model, sandbox string) (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.state.Running {
		return "", fmt.Errorf("a Codex turn is already running")
	}
	if strings.TrimSpace(prompt) == "" || len(prompt) > 65536 {
		return "", fmt.Errorf("enter a message of 1..65536 bytes")
	}
	if len(model) > 200 {
		return "", fmt.Errorf("model name is too long")
	}
	if sandbox != "read-only" && sandbox != "workspace-write" {
		return "", fmt.Errorf("choose read-only or workspace-write permissions")
	}
	unlock, err := operation.Acquire(m.Engine.Root, "recording")
	if err != nil {
		return "", err
	}
	thread := ""
	if session != "" {
		if !snapshot.ValidID(session) {
			unlock()
			return "", fmt.Errorf("invalid session")
		}
		var upstream sql.NullString
		var status string
		err = m.Engine.Store.DB.QueryRow("SELECT upstream_session_id,status FROM sessions WHERE id=? AND project_id=?", session, m.Engine.Store.ProjectID).Scan(&upstream, &status)
		if err != nil || !upstream.Valid || upstream.String == "" || status == "active" {
			unlock()
			return "", fmt.Errorf("this session has no resumable Codex thread or is still active")
		}
		thread = upstream.String
		_, err = m.Engine.Store.DB.Exec("UPDATE sessions SET status='active',ended_at=NULL,exit_code=NULL WHERE id=?", session)
	} else {
		session, err = m.Engine.Store.Start()
		if err == nil {
			_, err = m.Engine.Store.DB.Exec("UPDATE sessions SET agent='codex-interactive' WHERE id=?", session)
		}
	}
	if err != nil {
		unlock()
		return "", err
	}
	runCtx, cancel := context.WithCancel(ctx)
	m.cancel = cancel
	m.done = make(chan struct{})
	m.state = State{SessionID: session, Running: true, Approvals: []Approval{}}
	m.rpc = nil
	m.thread = ""
	m.turn = ""
	done := m.done
	go func() {
		defer func() { unlock(); m.mu.Lock(); m.state.Running = false; m.mu.Unlock(); close(done) }()
		m.run(runCtx, session, thread, prompt, model, sandbox)
	}()
	return session, nil
}
