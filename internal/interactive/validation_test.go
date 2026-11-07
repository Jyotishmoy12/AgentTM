package interactive

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"agenttm/internal/storage"
)

func TestInvalidStartDoesNotCreateSessionOrRetainLock(t *testing.T) {
	m := managerFixture(t)
	for _, input := range []struct{ session, prompt, model, sandbox string }{
		{"", " ", "", "read-only"},
		{"", strings.Repeat("x", 65537), "", "read-only"},
		{"", "hello", strings.Repeat("m", 201), "read-only"},
		{"", "hello", "", "danger-full-access"},
		{"invalid", "hello", "", "read-only"},
		{storage.ID(), "hello", "", "read-only"},
	} {
		if _, err := m.Start(context.Background(), input.session, input.prompt, input.model, input.sandbox); err == nil {
			t.Fatalf("invalid input accepted: %+v", input)
		}
	}
	sessions, err := m.Engine.Store.Sessions()
	if err != nil || len(sessions) != 0 {
		t.Fatalf("invalid input persisted session: %+v, %v", sessions, err)
	}
	if _, err := os.Stat(filepath.Join(m.Engine.Root, ".agenttm", "data", "recording.lock")); !os.IsNotExist(err) {
		t.Fatalf("invalid input retained lock: %v", err)
	}
}

func TestManagerStatusCopiesApprovalsAndRedactsDraft(t *testing.T) {
	m := &Manager{state: State{Draft: "password=private-value", Approvals: []Approval{{ID: "original"}}}}
	state := m.Status()
	if strings.Contains(state.Draft, "private-value") {
		t.Fatal("draft exposed credentials")
	}
	state.Approvals[0].ID = "changed"
	if m.Status().Approvals[0].ID != "original" {
		t.Fatal("status caller modified pending approvals")
	}
	m.state.Running = true
	if err := m.SetExecutable("different-codex"); err == nil {
		t.Fatal("executable changed during active turn")
	}
	m.state.Running = false
	if err := m.SetExecutable("selected-codex"); err != nil || m.ExecutablePath() != "selected-codex" {
		t.Fatalf("executable preference failed: %v", err)
	}
}
