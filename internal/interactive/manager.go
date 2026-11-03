package interactive

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"agenttm/internal/events"
	"agenttm/internal/operation"
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
)

type Approval struct {
	ID        string `json:"id"`
	Method    string `json:"method"`
	Command   string `json:"command"`
	Reason    string `json:"reason"`
	Directory string `json:"directory"`
	rawID     json.RawMessage
	rpc       *client
}
type State struct {
	SessionID string     `json:"session_id"`
	Running   bool       `json:"running"`
	Draft     string     `json:"draft"`
	Error     string     `json:"error"`
	Approvals []Approval `json:"approvals"`
}
type Manager struct {
	Engine     *snapshot.Engine
	Executable string
	mu         sync.Mutex
	state      State
	cancel     context.CancelFunc
	done       chan struct{}
	rpc        *client
	thread     string
	turn       string
}

func (m *Manager) SetExecutable(executable string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.state.Running {
		return fmt.Errorf("stop the current turn before changing Codex")
	}
	m.Executable = executable
	return nil
}
func (m *Manager) ExecutablePath() string { m.mu.Lock(); defer m.mu.Unlock(); return m.Executable }

func (m *Manager) Status() State {
	m.mu.Lock()
	defer m.mu.Unlock()
	state := m.state
	state.Draft = events.Redact(state.Draft)
	state.Approvals = append([]Approval{}, m.state.Approvals...)
	return state
}
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

func (m *Manager) run(ctx context.Context, session, thread, prompt, model, sandbox string) {
	var runErr error
	finalStatus := "completed"
	defer func() {
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
	}()
	omit := prompt
	meta := map[string]any{"source": "agenttm", "text": "[Prompt text capture is off]", "prompt_bytes": len(prompt)}
	if m.Engine.Config.Capture.PromptMode == "sanitized" {
		omit = ""
		meta["text"] = prompt
	}
	if runErr = m.Engine.Store.Append(session, "agenttm.chat.prompt", "", "", events.Encode(meta, m.Engine.Config.Capture.MaxEventPayloadBytes, "")); runErr != nil {
		return
	}
	kind := "baseline"
	if thread != "" {
		kind = "manual"
	}
	if _, runErr = m.Engine.Capture(ctx, session, kind); runErr != nil {
		return
	}
	completed := make(chan string, 1)
	filePreviews := map[string]string{}
	rpc, err := launch(ctx, m.Executable, m.Engine.Root, func(c *client, message wireMessage) error {
		if len(message.ID) > 0 && message.Method != "" {
			return m.request(c, message, filePreviews)
		}
		var params map[string]any
		_ = json.Unmarshal(message.Params, &params)
		if message.Method == "item/started" {
			if item, ok := params["item"].(map[string]any); ok && item["type"] == "fileChange" {
				id, _ := item["id"].(string)
				preview, _ := json.MarshalIndent(item["changes"], "", "  ")
				if len(preview) > 16384 {
					preview = append(preview[:16384], []byte("\n[preview truncated]")...)
				}
				filePreviews[id] = string(preview)
			}
		}
		if message.Method == "turn/started" {
			if turn, ok := params["turn"].(map[string]any); ok {
				id, _ := turn["id"].(string)
				m.mu.Lock()
				m.turn = id
				m.mu.Unlock()
			}
		}
		if message.Method == "serverRequest/resolved" {
			raw, _ := json.Marshal(params["requestId"])
			m.mu.Lock()
			kept := m.state.Approvals[:0]
			for _, a := range m.state.Approvals {
				if string(a.rawID) != string(raw) {
					kept = append(kept, a)
				}
			}
			m.state.Approvals = kept
			m.mu.Unlock()
			return nil
		}
		if message.Method == "item/agentMessage/delta" {
			delta, _ := params["delta"].(string)
			m.mu.Lock()
			if len(m.state.Draft)+len(delta) < 65536 {
				m.state.Draft += delta
			}
			m.mu.Unlock()
			return nil
		}
		switch message.Method {
		case "thread/started", "turn/started", "turn/completed", "item/started", "item/completed":
		default:
			return nil
		}
		r := normalize(message, m.Engine.Config.Capture.MaxEventPayloadBytes, omit)
		eventID, err := m.Engine.Store.AppendID(session, r.Kind, r.Tool, r.Call, r.Payload)
		if err != nil {
			return err
		}
		if r.Kind == "item.completed" && r.Tool != "" && m.Engine.Config.Capture.SnapshotAfterTool {
			if _, err = m.Engine.CaptureNear(ctx, session, eventID); err != nil {
				return err
			}
		}
		if message.Method == "item/completed" {
			if item, ok := params["item"].(map[string]any); ok && item["type"] == "agentMessage" {
				m.mu.Lock()
				m.state.Draft = ""
				m.mu.Unlock()
			}
		}
		if message.Method == "turn/completed" {
			status := "failed"
			if turn, ok := params["turn"].(map[string]any); ok {
				status, _ = turn["status"].(string)
				if status == "failed" {
					runError := events.Encode(turn["error"], m.Engine.Config.Capture.MaxEventPayloadBytes, omit)
					m.mu.Lock()
					m.state.Error = events.Redact(string(runError))
					m.mu.Unlock()
				}
			}
			select {
			case completed <- status:
			default:
			}
		}
		return nil
	})
	if err != nil {
		runErr = err
		return
	}
	defer rpc.close()
	m.mu.Lock()
	m.rpc = rpc
	m.mu.Unlock()
	initCtx, cancel := context.WithTimeout(ctx, 45*time.Second)
	defer cancel()
	if runErr = rpc.call(initCtx, "initialize", map[string]any{"clientInfo": map[string]any{"name": "agenttm", "title": "AgentTM", "version": "0.2.0"}}, nil); runErr != nil {
		return
	}
	if runErr = rpc.send(map[string]any{"method": "initialized", "params": map[string]any{}}); runErr != nil {
		return
	}
	params := map[string]any{"cwd": m.Engine.Root, "sandbox": sandbox, "approvalPolicy": "on-request", "approvalsReviewer": "user"}
	if model != "" {
		params["model"] = model
	}
	method := "thread/start"
	if thread != "" {
		method = "thread/resume"
		params["threadId"] = thread
	}
	var response struct {
		Thread struct {
			ID string `json:"id"`
		} `json:"thread"`
	}
	if runErr = rpc.call(initCtx, method, params, &response); runErr != nil {
		return
	}
	if response.Thread.ID == "" || len(response.Thread.ID) > 256 {
		runErr = fmt.Errorf("Codex returned an invalid thread ID")
		return
	}
	thread = response.Thread.ID
	m.mu.Lock()
	m.thread = thread
	m.mu.Unlock()
	if _, runErr = m.Engine.Store.DB.Exec("UPDATE sessions SET upstream_session_id=? WHERE id=? AND project_id=?", thread, session, m.Engine.Store.ProjectID); runErr != nil {
		return
	}
	var started struct {
		Turn struct {
			ID string `json:"id"`
		} `json:"turn"`
	}
	turnParams := map[string]any{"threadId": thread, "input": []map[string]any{{"type": "text", "text": prompt}}}
	if model != "" {
		turnParams["model"] = model
	}
	if runErr = rpc.call(initCtx, "turn/start", turnParams, &started); runErr != nil {
		return
	}
	if started.Turn.ID != "" {
		m.mu.Lock()
		m.turn = started.Turn.ID
		m.mu.Unlock()
	}
	select {
	case status := <-completed:
		if status == "interrupted" {
			finalStatus = "cancelled"
		} else if status != "completed" {
			runErr = fmt.Errorf("Codex turn failed; inspect the recorded error and model access")
		}
	case <-ctx.Done():
		runErr = ctx.Err()
	case <-rpc.done:
		rpc.mu.Lock()
		runErr = rpc.err
		rpc.mu.Unlock()
	}
}

func (m *Manager) request(c *client, message wireMessage, filePreviews map[string]string) error {
	switch message.Method {
	case "item/commandExecution/requestApproval", "item/fileChange/requestApproval":
		var p struct {
			Command   string `json:"command"`
			Reason    string `json:"reason"`
			Directory string `json:"cwd"`
			Root      string `json:"grantRoot"`
			ItemID    string `json:"itemId"`
		}
		_ = json.Unmarshal(message.Params, &p)
		if p.Directory == "" {
			p.Directory = p.Root
		}
		if message.Method == "item/fileChange/requestApproval" {
			p.Command = filePreviews[p.ItemID]
			if p.Command == "" {
				p.Command = "File-change preview is unavailable. Decline and ask Codex to describe the proposed changes."
			}
		}
		m.mu.Lock()
		defer m.mu.Unlock()
		if len(m.state.Approvals) >= 32 {
			return fmt.Errorf("too many pending approval requests")
		}
		m.state.Approvals = append(m.state.Approvals, Approval{storage.ID(), message.Method, p.Command, p.Reason, p.Directory, message.ID, c})
		return nil
	case "item/permissions/requestApproval":
		return c.send(map[string]any{"id": message.ID, "result": map[string]any{"permissions": map[string]any{}, "scope": "turn"}})
	case "mcpServer/elicitation/request":
		return c.send(map[string]any{"id": message.ID, "result": map[string]any{"action": "decline", "content": nil}})
	default:
		return c.send(map[string]any{"id": message.ID, "error": map[string]any{"code": -32601, "message": "AgentTM does not support this interactive request; ask in an ordinary chat message instead"}})
	}
}
func (m *Manager) Decide(id string, allow bool) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i, a := range m.state.Approvals {
		if a.ID == id {
			decision := "decline"
			if allow {
				decision = "accept"
			}
			payload := events.Encode(map[string]any{"method": a.Method, "decision": decision}, m.Engine.Config.Capture.MaxEventPayloadBytes, "")
			if err := m.Engine.Store.Append(m.state.SessionID, "agenttm.approval.decided", "", "", payload); err != nil {
				return err
			}
			if err := a.rpc.send(map[string]any{"id": a.rawID, "result": map[string]any{"decision": decision}}); err != nil {
				return err
			}
			m.state.Approvals = append(m.state.Approvals[:i], m.state.Approvals[i+1:]...)
			return nil
		}
	}
	return fmt.Errorf("approval expired or was already answered")
}
func (m *Manager) Stop() {
	m.mu.Lock()
	rpc, thread, turn, cancel, done := m.rpc, m.thread, m.turn, m.cancel, m.done
	running := m.state.Running
	m.mu.Unlock()
	if !running || cancel == nil {
		return
	}
	if rpc == nil || thread == "" || turn == "" {
		cancel()
		return
	}
	ctx, finish := context.WithTimeout(context.Background(), 5*time.Second)
	err := rpc.call(ctx, "turn/interrupt", map[string]any{"threadId": thread, "turnId": turn}, nil)
	finish()
	if err != nil {
		cancel()
		return
	}
	go func() {
		select {
		case <-done:
		case <-time.After(5 * time.Second):
			cancel()
		}
	}()
}
func (m *Manager) Shutdown() {
	m.Stop()
	m.mu.Lock()
	done := m.done
	m.mu.Unlock()
	if done != nil {
		<-done
	}
}
