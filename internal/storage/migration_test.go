package storage

import (
	"database/sql"
	"os/exec"
	"path/filepath"
	"testing"

	"agenttm/internal/project"
)

func TestPhaseOneMigrationPreservesHistory(t *testing.T) {
	root := t.TempDir()
	// Existing phase-one database, including a session and event.
	// Use the same disposable repo helper pattern as the storage integration test.
	if b, err := exec.Command("git", "init", root).CombinedOutput(); err != nil {
		t.Fatalf("%s %v", b, err)
	}
	if err := project.Init(root); err != nil {
		t.Fatal(err)
	}
	db, err := sql.Open("sqlite", filepath.Join(root, ".agenttm", "data", "events.db"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec(initial); err != nil {
		t.Fatal(err)
	}
	p, s, e := ID(), ID(), ID()
	if _, err = db.Exec("INSERT INTO projects VALUES (?,?,?)", p, root, Now()); err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec("INSERT INTO sessions(id,project_id,agent,started_at,status) VALUES (?,?,'codex',?,'completed')", s, p, Now()); err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec("INSERT INTO events(id,session_id,sequence,kind,received_at,payload_json) VALUES (?,?,1,'turn.completed',?,'{}')", e, s, Now()); err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec("PRAGMA user_version=1"); err != nil {
		t.Fatal(err)
	}
	db.Close()
	store, err := Open(root)
	if err != nil {
		t.Fatal(err)
	}
	defer store.DB.Close()
	records, err := store.Events(s, 0, 10)
	if err != nil || len(records) != 1 || records[0].ID != e {
		t.Fatalf("migration lost events: %+v %v", records, err)
	}
	var v int
	if err = store.DB.QueryRow("PRAGMA user_version").Scan(&v); err != nil || v != 3 {
		t.Fatalf("schema version %d %v", v, err)
	}
}
