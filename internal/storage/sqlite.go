package storage

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	"agenttm/internal/project"
	_ "modernc.org/sqlite"
)

func Open(root string) (*Store, error) {
	canonical, err := filepath.EvalSymlinks(root)
	if err != nil {
		return nil, err
	}
	root, err = filepath.Abs(canonical)
	if err != nil {
		return nil, err
	}
	path := filepath.Join(root, ".agenttm", "data", "events.db")
	if e := project.SafePath(path); e != nil {
		return nil, e
	}
	for _, suffix := range []string{"-wal", "-shm", "-journal"} {
		if e := project.SafePath(path + suffix); e != nil {
			return nil, e
		}
	}
	f, e := os.OpenFile(path, os.O_CREATE|os.O_RDWR, 0600)
	if e != nil {
		return nil, e
	}
	if e = f.Close(); e != nil {
		return nil, e
	}
	db, e := sql.Open("sqlite", path)
	if e != nil {
		return nil, e
	}
	db.SetMaxOpenConns(1)
	fail := func(e error) (*Store, error) { db.Close(); return nil, e }
	for _, q := range []string{"PRAGMA foreign_keys=ON", "PRAGMA busy_timeout=5000", "PRAGMA journal_mode=WAL"} {
		if _, e = db.Exec(q); e != nil {
			return fail(e)
		}
	}
	tx, e := db.Begin()
	if e != nil {
		return fail(e)
	}
	defer tx.Rollback()
	var v int
	if e = tx.QueryRow("PRAGMA user_version").Scan(&v); e != nil {
		return fail(e)
	}
	if v > SchemaVersion {
		return fail(fmt.Errorf("database schema %d is newer than supported version %d", v, SchemaVersion))
	}
	if v == 0 {
		if _, e = tx.Exec(initial); e != nil {
			return fail(e)
		}
		if _, e = tx.Exec("PRAGMA user_version=1"); e != nil {
			return fail(e)
		}
	}
	if v < 2 {
		if _, e = tx.Exec(snapshotMigration); e != nil {
			return fail(e)
		}
		if _, e = tx.Exec("PRAGMA user_version=2"); e != nil {
			return fail(e)
		}
	}
	if v < 3 {
		if _, e = tx.Exec(forkMigration); e != nil {
			return fail(e)
		}
		if _, e = tx.Exec("PRAGMA user_version=3"); e != nil {
			return fail(e)
		}
	}
	if v < 4 {
		if _, e = tx.Exec(operationMigration); e != nil {
			return fail(e)
		}
		if _, e = tx.Exec("PRAGMA user_version=4"); e != nil {
			return fail(e)
		}
	}
	if v < 5 {
		if _, e = tx.Exec(titleMigration); e != nil {
			return fail(e)
		}
		if _, e = tx.Exec("PRAGMA user_version=5"); e != nil {
			return fail(e)
		}
	}
	id := ""
	rows, e := tx.Query("SELECT id, root_path FROM projects")
	if e != nil {
		return fail(e)
	}
	for rows.Next() {
		var candidate, stored string
		if e = rows.Scan(&candidate, &stored); e != nil {
			rows.Close()
			return fail(e)
		}
		match := stored == root
		if !match {
			if resolved, resolveErr := filepath.EvalSymlinks(stored); resolveErr == nil {
				if resolvedAbs, absErr := filepath.Abs(resolved); absErr == nil {
					match = resolvedAbs == root
				}
			}
		}
		if match {
			id = candidate
			break
		}
	}
	rows.Close()
	if id == "" {
		id = ID()
		if _, e = tx.Exec("INSERT INTO projects VALUES (?, ?, ?)", id, root, Now()); e != nil {
			return fail(e)
		}
	}
	if e = tx.Commit(); e != nil {
		return fail(e)
	}
	return &Store{db, id}, nil
}
