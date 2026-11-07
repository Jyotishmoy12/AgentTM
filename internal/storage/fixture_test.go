package storage

import (
	"database/sql"
	"path/filepath"
	"testing"

	"agenttm/internal/project"
)

func storageRoot(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	if output, err := project.Git(root, "init"); err != nil {
		t.Fatalf("git init: %s, %v", output, err)
	}
	if err := project.Init(root); err != nil {
		t.Fatal(err)
	}
	return root
}

func storageFixture(t *testing.T) *Store {
	t.Helper()
	s, err := Open(storageRoot(t))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { s.DB.Close() })
	return s
}

func rawHistory(t *testing.T, root string) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", filepath.Join(root, ".agenttm", "data", "events.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}
