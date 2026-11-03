package interactive

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"agenttm/internal/config"
	"agenttm/internal/project"
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
)

func TestMain(m *testing.M) {
	if os.Getenv("AGENTTM_APP_SERVER_TEST") == "1" {
		scanner := bufio.NewScanner(os.Stdin)
		waiting := false
		emit := func(v any) { b, _ := json.Marshal(v); fmt.Println(string(b)) }
		finish := func() {
			emit(map[string]any{"method": "item/completed", "params": map[string]any{"item": map[string]any{"id": "reply", "type": "agentMessage", "text": "Hello from synthetic Codex"}}})
			emit(map[string]any{"method": "turn/completed", "params": map[string]any{"turn": map[string]any{"status": "completed"}}})
		}
		for scanner.Scan() {
			var msg map[string]any
			json.Unmarshal(scanner.Bytes(), &msg)
			method, _ := msg["method"].(string)
			if method == "initialized" {
				continue
			}
			if method == "" && waiting {
				finish()
				waiting = false
				continue
			}
			result := map[string]any{}
			if method == "thread/start" || method == "thread/resume" {
				result["thread"] = map[string]any{"id": "synthetic-thread"}
			}
			if method == "model/list" {
				result["data"] = []map[string]any{
					{"model": "synthetic-model", "displayName": "Test model", "isDefault": true},
					{"model": "hidden-model", "hidden": true},
					{"model": "image-only", "inputModalities": []string{"image"}},
				}
				result["nextCursor"] = nil
			}
			if method == "turn/start" {
				result["turn"] = map[string]any{"id": "synthetic-turn"}
			}
			emit(map[string]any{"id": msg["id"], "result": result})
			if method == "turn/interrupt" {
				emit(map[string]any{"method": "turn/completed", "params": map[string]any{"turn": map[string]any{"status": "interrupted"}}})
			}
			if method == "turn/start" {
				payload, _ := json.Marshal(msg["params"])
				if strings.Contains(string(payload), "approval") {
					emit(map[string]any{"id": 90, "method": "item/commandExecution/requestApproval", "params": map[string]any{"command": "echo synthetic-test", "reason": "Test approval"}})
					waiting = true
				} else if !strings.Contains(string(payload), "cancel") {
					finish()
				}
			}
		}
		os.Exit(0)
	}
	os.Exit(m.Run())
}
func managerFixture(t *testing.T) *Manager {
	t.Helper()
	root := t.TempDir()
	if b, err := exec.Command("git", "init", root).CombinedOutput(); err != nil {
		t.Fatalf("%s %v", b, err)
	}
	if err := project.Init(root); err != nil {
		t.Fatal(err)
	}
	s, err := storage.Open(root)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { s.DB.Close() })
	manager := &Manager{Engine: &snapshot.Engine{Root: root, Store: s, Config: config.Default()}, Executable: os.Args[0]}
	t.Cleanup(manager.Shutdown)
	return manager
}
func waitTurn(t *testing.T, m *Manager) {
	t.Helper()
	deadline := time.Now().Add(15 * time.Second)
	for time.Now().Before(deadline) {
		if !m.Status().Running {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatal("turn did not finish")
}
func TestInteractiveResumeApprovalAndCancellation(t *testing.T) {
	t.Setenv("AGENTTM_APP_SERVER_TEST", "1")
	m := managerFixture(t)
	id, err := m.Start(context.Background(), "", "hello", "", "read-only")
	if err != nil {
		t.Fatal(err)
	}
	waitTurn(t, m)
	if state := m.Status(); state.Error != "" {
		t.Fatal(state.Error)
	}
	var thread string
	if err = m.Engine.Store.DB.QueryRow("SELECT upstream_session_id FROM sessions WHERE id=?", id).Scan(&thread); err != nil || thread != "synthetic-thread" {
		t.Fatal(thread, err)
	}
	if _, err = m.Start(context.Background(), id, "approval", "", "workspace-write"); err != nil {
		t.Fatal(err)
	}
	deadline := time.Now().Add(10 * time.Second)
	for len(m.Status().Approvals) == 0 && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	state := m.Status()
	if len(state.Approvals) != 1 {
		t.Fatalf("approval not exposed: %+v", state)
	}
	if err = m.Decide(state.Approvals[0].ID, false); err != nil {
		t.Fatal(err)
	}
	waitTurn(t, m)
	if err = m.Decide(state.Approvals[0].ID, true); err == nil {
		t.Fatal("expired approval accepted")
	}
	if _, err = m.Start(context.Background(), id, "cancel", "", "read-only"); err != nil {
		t.Fatal(err)
	}
	deadline = time.Now().Add(10 * time.Second)
	for time.Now().Before(deadline) {
		m.mu.Lock()
		ready := m.turn != ""
		m.mu.Unlock()
		if ready {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	m.Stop()
	waitTurn(t, m)
	sessions, err := m.Engine.Store.Sessions()
	if err != nil || len(sessions) != 1 || sessions[0].Status != "cancelled" {
		t.Fatalf("%+v %v", sessions, err)
	}
	records, err := m.Engine.Store.Events(id, 0, 100)
	if err != nil {
		t.Fatal(err)
	}
	for _, r := range records {
		if strings.Contains(string(r.Payload), `"text":"hello"`) {
			t.Fatal("metadata-only prompt leaked")
		}
	}
	if _, err = os.Stat(filepath.Join(m.Engine.Root, ".agenttm", "data", "recording.lock")); !os.IsNotExist(err) {
		m.Shutdown()
		if _, err = os.Stat(filepath.Join(m.Engine.Root, ".agenttm", "data", "recording.lock")); !os.IsNotExist(err) {
			t.Fatal("recording lock retained")
		}
	}
}
func TestUnknownAndReasoningFieldsAreNotRecorded(t *testing.T) {
	msg := wireMessage{Method: "item/completed", Params: json.RawMessage(`{"item":{"type":"reasoning","content":"never persist this","secret":"password"}}`)}
	r := normalize(msg, 4096, "")
	if strings.Contains(string(r.Payload), "never persist") {
		t.Fatal("reasoning leaked")
	}
}

func TestModelCatalogFiltersHiddenAndNonTextModels(t *testing.T) {
	t.Setenv("AGENTTM_APP_SERVER_TEST", "1")
	models, err := ListModels(context.Background(), os.Args[0], t.TempDir())
	if err != nil || len(models) != 1 || models[0].Model != "synthetic-model" || !models[0].IsDefault {
		t.Fatalf("%+v %v", models, err)
	}
}
