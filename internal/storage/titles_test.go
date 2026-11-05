package storage

import (
	"agenttm/internal/project"
	"database/sql"
	"errors"
	"os/exec"
	"strings"
	"testing"
)

func TestSessionTitleMigrationPersistenceAndScope(t *testing.T) {
	root := t.TempDir()
	if b, err := exec.Command("git", "init", root).CombinedOutput(); err != nil {
		t.Fatalf("%s: %v", b, err)
	}
	if err := project.Init(root); err != nil {
		t.Fatal(err)
	}
	s, err := Open(root)
	if err != nil {
		t.Fatal(err)
	}
	id, err := s.Start()
	if err != nil {
		t.Fatal(err)
	}
	if err = s.Append(id, "turn.completed", "", "", []byte(`{"preserve":"event"}`)); err != nil {
		t.Fatal(err)
	}
	// Simulate the actual v4 schema, then verify upgrading preserves history.
	if _, err = s.DB.Exec("ALTER TABLE sessions DROP COLUMN title; PRAGMA user_version=4"); err != nil {
		t.Fatal(err)
	}
	s.DB.Close()
	s, err = Open(root)
	if err != nil {
		t.Fatal(err)
	}
	if err = s.RenameSession(id, "  Fix parser edge cases  "); err != nil {
		t.Fatal(err)
	}
	other := &Store{DB: s.DB, ProjectID: ID()}
	if err = other.RenameSession(id, "must not change another project"); !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("scope: %v", err)
	}
	s.DB.Close()
	s, err = Open(root)
	if err != nil {
		t.Fatal(err)
	}
	defer s.DB.Close()
	sessions, err := s.Sessions()
	if err != nil || len(sessions) != 1 || sessions[0].Title != "Fix parser edge cases" {
		t.Fatalf("persisted name: %+v %v", sessions, err)
	}
	records, err := s.Events(id, 0, 10)
	if err != nil || len(records) != 1 || string(records[0].Payload) != `{"preserve":"event"}` {
		t.Fatalf("history changed: %+v %v", records, err)
	}
	if err = s.RenameSession(id, ""); err != nil {
		t.Fatal(err)
	}
	sessions, _ = s.Sessions()
	if sessions[0].Title != "" {
		t.Fatal("reset failed")
	}
}

func TestSessionTitleValidation(t *testing.T) {
	for _, invalid := range []string{strings.Repeat("x", 121), "first\nsecond", "bad\x00name", string([]byte{0xff})} {
		if _, err := ValidateSessionTitle(invalid); err == nil {
			t.Fatalf("accepted %q", invalid)
		}
	}
	if _, err := ValidateSessionTitle(strings.Repeat("界", 120)); err != nil {
		t.Fatal(err)
	}
}
