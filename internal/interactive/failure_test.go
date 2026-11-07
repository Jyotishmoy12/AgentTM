package interactive

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLaunchFailureFinalizesHistoryAndReleasesRecordingLock(t *testing.T) {
	m := managerFixture(t)
	m.Executable = filepath.Join(t.TempDir(), "missing-codex.exe")
	id, err := m.Start(context.Background(), "", "private user prompt", "", "read-only")
	if err != nil {
		t.Fatal(err)
	}
	waitTurn(t, m)
	m.Shutdown()
	state := m.Status()
	if state.Running || state.Error == "" || state.Draft != "" || len(state.Approvals) != 0 {
		t.Fatalf("invalid failure state: %+v", state)
	}
	var status string
	var code int
	if err := m.Engine.Store.DB.QueryRow("SELECT status,exit_code FROM sessions WHERE id=?", id).Scan(&status, &code); err != nil || status != "failed" || code != 1 {
		t.Fatalf("session not finalized: %s, %d, %v", status, code, err)
	}
	records, err := m.Engine.Store.Events(id, 0, 100)
	if err != nil {
		t.Fatal(err)
	}
	if len(records) == 0 || records[len(records)-1].Kind != "agenttm.process.exited" {
		t.Fatal("missing terminal event")
	}
	for _, record := range records {
		if strings.Contains(string(record.Payload), "private user prompt") {
			t.Fatal("metadata-only prompt leaked on failure")
		}
	}
	if _, err := os.Stat(filepath.Join(m.Engine.Root, ".agenttm", "data", "recording.lock")); !os.IsNotExist(err) {
		t.Fatalf("recording lock retained: %v", err)
	}
}
