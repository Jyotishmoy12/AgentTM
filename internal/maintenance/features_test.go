package maintenance

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"testing"

	"agenttm/internal/capture"
	"agenttm/internal/events"
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
)

func TestEncryptedBackupRoundTripAndAuthentication(t *testing.T) {
	ctx := context.Background()
	e := historyFixture(t)
	session, cp := captureFile(t, e, "private historical content")
	if err := e.Store.RenameSession(session, "Investigate parser failure"); err != nil {
		t.Fatal(err)
	}
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
	if stages, stageErr := filepath.Glob(filepath.Join(target, ".agenttm-restore-*")); stageErr != nil || len(stages) != 0 {
		t.Fatal("failed restore retained staging content", stageErr)
	}
	if err = RestoreBackup(ctx, archive, target, password); err != nil {
		t.Fatal(err)
	}
	restored, err := storage.Open(target)
	if err != nil {
		t.Fatal(err)
	}
	defer restored.DB.Close()
	sessions, err := restored.Sessions()
	if err != nil || len(sessions) != 1 || sessions[0].Title != "Investigate parser failure" {
		t.Fatalf("session name lost in backup: %+v %v", sessions, err)
	}
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
