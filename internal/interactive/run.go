package interactive

import (
	"context"
	"fmt"
	"time"

	"agenttm/internal/capture"
	"agenttm/internal/events"
)

func (m *Manager) run(ctx context.Context, session, thread, prompt, model, sandbox string) {
	var runErr error
	finalStatus := "completed"
	observer := capture.New(m.Engine, session, m.Engine.Config.Capture.SnapshotAfterTool)
	defer func() { m.finish(ctx, session, prompt, observer, runErr, finalStatus) }()
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
	rpc, err := launch(ctx, m.Executable, m.Engine.Root, m.notifications(ctx, session, omit, observer, completed, filePreviews))
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
