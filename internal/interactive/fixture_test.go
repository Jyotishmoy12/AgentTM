package interactive

import (
	"os"
	"os/exec"
	"testing"
	"time"

	"agenttm/internal/config"
	"agenttm/internal/project"
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
)

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
