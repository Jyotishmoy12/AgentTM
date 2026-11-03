package maintenance

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"

	"agenttm/internal/capture"
	"agenttm/internal/config"
	"agenttm/internal/events"
	"agenttm/internal/project"
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
)

func historyFixture(t *testing.T) *snapshot.Engine {
	t.Helper()
	root := t.TempDir()
	if b, err := exec.Command("git", "init", root).CombinedOutput(); err != nil {
		t.Fatalf("%s: %v", b, err)
	}
	if err := project.Init(root); err != nil {
		t.Fatal(err)
	}
	s, err := storage.Open(root)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { s.DB.Close() })
	return &snapshot.Engine{Root: root, Store: s, Config: config.Default()}
}
func captureFile(t *testing.T, e *snapshot.Engine, content string) (string, snapshot.Manifest) {
	t.Helper()
	if err := os.WriteFile(filepath.Join(e.Root, "note.txt"), []byte(content), 0600); err != nil {
		t.Fatal(err)
	}
	id, err := e.Store.Start()
	if err != nil {
		t.Fatal(err)
	}
	cp, err := e.Capture(context.Background(), id, "baseline")
	if err != nil {
		t.Fatal(err)
	}
	if err = e.Store.Finish(id, "completed", 0); err != nil {
		t.Fatal(err)
	}
	return id, cp.Manifest
}
func TestGCSharedObjectsAndPreview(t *testing.T) {
	e := historyFixture(t)
	first, _ := captureFile(t, e, "shared")
	_, retained := captureFile(t, e, "shared")
	removedID, _ := captureFile(t, e, "orphan")
	if _, err := Purge(e.Root, e.Store, first); err != nil {
		t.Fatal(err)
	}
	if _, err := Purge(e.Root, e.Store, removedID); err != nil {
		t.Fatal(err)
	}
	report, err := Collect(e, false, "", 0)
	if err != nil || report.Candidates != 1 {
		t.Fatalf("%+v %v", report, err)
	}
	if _, err = Collect(e, true, "wrong-preview", 0); err == nil {
		t.Fatal("stale preview accepted")
	}
	report, err = Collect(e, true, report.Token, 0)
	if err != nil || report.Removed != 1 {
		t.Fatalf("%+v %v", report, err)
	}
	if _, err = e.ReadObject(retained.Files[0]); err != nil {
		t.Fatal("shared referenced blob removed", err)
	}
	if _, err = Collect(e, false, "", 24*time.Hour); err != nil {
		t.Fatal(err)
	}
	if err = os.WriteFile(filepath.Join(e.Root, ".agenttm", "manifests", storage.ID()+".json"), []byte("{}"), 0600); err != nil {
		t.Fatal(err)
	}
	if _, err = Collect(e, false, "", 0); err == nil {
		t.Fatal("unindexed manifest ignored")
	}
}
func TestEncryptedBackupRoundTripAndAuthentication(t *testing.T) {
	ctx := context.Background()
	e := historyFixture(t)
	session, cp := captureFile(t, e, "private historical content")
	observer := capture.New(e, session, true)
	for _, kind := range []string{"item.started", "item.completed"} {
		r := events.Record{Kind: kind, Tool: "command_execution", Call: "backup-operation", Payload: []byte(`{"item":{"status":"completed"}}`)}
		id, err := e.Store.AppendID(session, r.Kind, r.Tool, r.Call, r.Payload)
		if err != nil {
			t.Fatal(err)
		}
		if err = observer.Observe(ctx, r, id); err != nil {
			t.Fatal(err)
		}
	}
	password := "a long passphrase for testing"
	archive := filepath.Join(t.TempDir(), "history.age")
	if err := Backup(ctx, e, archive, password); err != nil {
		t.Fatal(err)
	}
	b, err := os.ReadFile(archive)
	if err != nil {
		t.Fatal(err)
	}
	target := t.TempDir()
	if out, err := exec.Command("git", "init", target).CombinedOutput(); err != nil {
		t.Fatalf("%s %v", out, err)
	}
	if err = RestoreBackup(ctx, archive, target, "wrong"); err == nil {
		t.Fatal("wrong password accepted")
	}
	if _, err = os.Stat(filepath.Join(target, ".agenttm")); !os.IsNotExist(err) {
		t.Fatal("failed restore published data")
	}
	damaged := filepath.Join(t.TempDir(), "damaged.age")
	b[len(b)-1] ^= 1
	os.WriteFile(damaged, b, 0600)
	if err = RestoreBackup(ctx, damaged, target, password); err == nil {
		t.Fatal("tampering accepted")
	}
	if err = RestoreBackup(ctx, archive, target, password); err != nil {
		t.Fatal(err)
	}
	restored, err := storage.Open(target)
	if err != nil {
		t.Fatal(err)
	}
	defer restored.DB.Close()
	operations, err := restored.Operations(session, 0, 100)
	if err != nil || len(operations) != 1 || operations[0].After == "" {
		t.Fatalf("operation history lost on restore: %+v %v", operations, err)
	}
	engine := snapshot.Engine{Root: target, Store: restored, Config: e.Config}
	text, err := engine.File(cp.ID, "note.txt")
	if err != nil || string(text) != "private historical content" {
		t.Fatalf("%q %v", text, err)
	}
	if err = RestoreBackup(ctx, archive, target, password); err == nil {
		t.Fatal("existing history overwritten")
	}
	if err = Backup(ctx, e, archive, password); err == nil {
		t.Fatal("existing archive overwritten")
	}
	for _, p := range []string{"../escape", "objects/aa/../file", "data/events.db-wal", "worktrees/a", "objects/aa/a"} {
		if allowedBackupPath(p) {
			t.Fatal("unsafe path accepted", p)
		}
	}
	if _, err = Purge(e.Root, e.Store, session); err != nil {
		t.Fatalf("operation references blocked purge: %v", err)
	}
	var count int
	if err = e.Store.DB.QueryRow("SELECT count(*) FROM operations").Scan(&count); err != nil || count != 0 {
		t.Fatal("operation ledger not purged", err)
	}
}
