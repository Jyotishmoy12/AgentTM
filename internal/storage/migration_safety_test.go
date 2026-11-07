package storage

import (
	"strings"
	"testing"
)

func TestFailedMigrationRollsBackSchemaChanges(t *testing.T) {
	root := storageRoot(t)
	db := rawHistory(t, root)
	if _, err := db.Exec(initial + "; ALTER TABLE sessions ADD COLUMN title TEXT NOT NULL DEFAULT ''; PRAGMA user_version=1"); err != nil {
		t.Fatal(err)
	}
	if err := db.Close(); err != nil {
		t.Fatal(err)
	}
	if s, err := Open(root); err == nil || s != nil {
		if s != nil {
			s.DB.Close()
		}
		t.Fatal("conflicting migration succeeded")
	}
	db = rawHistory(t, root)
	var version, operations, checksumColumn int
	if err := db.QueryRow("PRAGMA user_version").Scan(&version); err != nil || version != 1 {
		t.Fatalf("failed migration advanced schema: %d, %v", version, err)
	}
	if err := db.QueryRow("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='operations'").Scan(&operations); err != nil || operations != 0 {
		t.Fatalf("failed migration retained operations table: %d, %v", operations, err)
	}
	if err := db.QueryRow("SELECT count(*) FROM pragma_table_info('checkpoints') WHERE name='manifest_sha256'").Scan(&checksumColumn); err != nil || checksumColumn != 0 {
		t.Fatalf("failed migration retained checksum column: %d, %v", checksumColumn, err)
	}
}

func TestNewerSchemaIsRefusedWithoutDowngrade(t *testing.T) {
	root := storageRoot(t)
	db := rawHistory(t, root)
	if _, err := db.Exec("PRAGMA user_version=999; CREATE TABLE retained(value TEXT); INSERT INTO retained VALUES ('keep')"); err != nil {
		t.Fatal(err)
	}
	if err := db.Close(); err != nil {
		t.Fatal(err)
	}
	if s, err := Open(root); err == nil || s != nil || !strings.Contains(err.Error(), "newer than supported") {
		if s != nil {
			s.DB.Close()
		}
		t.Fatalf("future schema accepted: %v", err)
	}
	db = rawHistory(t, root)
	var version int
	var value string
	if err := db.QueryRow("PRAGMA user_version").Scan(&version); err != nil || version != 999 {
		t.Fatalf("future schema downgraded: %d, %v", version, err)
	}
	if err := db.QueryRow("SELECT value FROM retained").Scan(&value); err != nil || value != "keep" {
		t.Fatalf("future history changed: %q, %v", value, err)
	}
}

func TestVersionTwoMigrationPreservesProjectAndEvent(t *testing.T) {
	root := storageRoot(t)
	db := rawHistory(t, root)
	if _, err := db.Exec(initial + ";" + snapshotMigration + "; PRAGMA user_version=2"); err != nil {
		t.Fatal(err)
	}
	projectID, session, event := ID(), ID(), ID()
	if _, err := db.Exec("INSERT INTO projects VALUES (?,?,?)", projectID, root, Now()); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec("INSERT INTO sessions(id,project_id,agent,started_at) VALUES (?,?,'codex',?)", session, projectID, Now()); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec("INSERT INTO events(id,session_id,sequence,kind,received_at,payload_json) VALUES (?,?,1,'turn.completed',?,'{}')", event, session, Now()); err != nil {
		t.Fatal(err)
	}
	if err := db.Close(); err != nil {
		t.Fatal(err)
	}
	s, err := Open(root)
	if err != nil {
		t.Fatal(err)
	}
	defer s.DB.Close()
	records, err := s.Events(session, 0, 10)
	if err != nil || s.ProjectID != projectID || len(records) != 1 || records[0].ID != event {
		t.Fatalf("version-two history changed: %+v, %v", records, err)
	}
	ops, err := s.Operations(session, 0, 10)
	if err != nil || len(ops) != 0 {
		t.Fatalf("migration invented operations: %+v, %v", ops, err)
	}
}
