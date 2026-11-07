package maintenance

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"testing"

	"agenttm/internal/storage"
)

func directoryAlias(t *testing.T, target, link string) {
	t.Helper()
	if err := os.Symlink(target, link); err != nil {
		t.Skipf("directory symlinks unavailable on this host: %v", err)
	}
}

func TestBackupAndRestoreThroughDirectoryAlias(t *testing.T) {
	ctx := context.Background()
	e := historyFixture(t)
	_, checkpoint := captureFile(t, e, "directory alias history")
	parent := t.TempDir()
	parent, err := filepath.EvalSymlinks(parent)
	if err != nil {
		t.Fatal(err)
	}
	real := filepath.Join(parent, "real")
	if err = os.Mkdir(real, 0700); err != nil {
		t.Fatal(err)
	}
	alias := filepath.Join(parent, "alias")
	directoryAlias(t, real, alias)
	archive := filepath.Join(alias, "history.age")
	password := "a backup alias passphrase"
	if err = Backup(ctx, e, archive, password); err != nil {
		t.Fatal(err)
	}
	if _, err = os.Stat(filepath.Join(real, "history.age")); err != nil {
		t.Fatal(err)
	}
	target := t.TempDir()
	if out, err := exec.Command("git", "init", target).CombinedOutput(); err != nil {
		t.Fatalf("%s: %v", out, err)
	}
	if err = RestoreBackup(ctx, archive, target, password); err != nil {
		t.Fatal(err)
	}
	restored, err := storage.Open(target)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { restored.DB.Close() })
	restoredEngine := *e
	restoredEngine.Root = target
	restoredEngine.Store = restored
	contents, err := restoredEngine.File(checkpoint.ID, "note.txt")
	if err != nil || string(contents) != "directory alias history" {
		t.Fatalf("restored contents %q: %v", contents, err)
	}
}

func TestBackupPathAliasesCannotBypassStorageProtection(t *testing.T) {
	e := historyFixture(t)
	outside := t.TempDir()
	alias := filepath.Join(t.TempDir(), "project-alias")
	directoryAlias(t, e.Root, alias)
	if err := Backup(context.Background(), e, filepath.Join(alias, ".agenttm", "forbidden.age"), "a backup alias passphrase"); err == nil {
		t.Fatal("backup inside aliased storage accepted")
	}
	escape := filepath.Join(e.Root, ".agenttm", "escape")
	directoryAlias(t, outside, escape)
	if _, err := canonicalBackupFile(filepath.Join(escape, "history.age")); err == nil {
		t.Fatal("symlink inside protected storage accepted")
	}
	regular := filepath.Join(outside, "regular.age")
	if err := os.WriteFile(regular, []byte("existing"), 0600); err != nil {
		t.Fatal(err)
	}
	link := filepath.Join(outside, "linked.age")
	if err := os.Symlink(regular, link); err != nil {
		t.Fatal(err)
	}
	if _, err := canonicalBackupFile(link); err == nil {
		t.Fatal("archive file symlink accepted")
	}
}
