package interactive

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

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
	if _, err := m.Start(context.Background(), "", "second turn", "", "read-only"); err == nil {
		t.Fatal("concurrent turn accepted")
	}
	if err := m.SetExecutable("different-codex"); err == nil {
		t.Fatal("active executable changed")
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
	ops, err := m.Engine.Store.Operations(id, 0, 100)
	if err != nil || len(ops) != 2 || ops[0].After == "" || ops[1].After == "" || ops[0].After == ops[1].After {
		t.Fatalf("operation boundaries not recorded across resumed turns: %+v %v", ops, err)
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
