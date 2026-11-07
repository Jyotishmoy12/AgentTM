package maintenance

import (
	"database/sql"
	"fmt"

	"agenttm/internal/config"
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
)

func verifyBackupDatabase(db *sql.DB, stage, root string, meta BackupInfo, c config.Config) error {
	var integrity string
	if err := db.QueryRow("PRAGMA integrity_check").Scan(&integrity); err != nil || integrity != "ok" {
		return fmt.Errorf("backup database integrity failed")
	}
	var version int
	if err := db.QueryRow("PRAGMA user_version").Scan(&version); err != nil || version < 3 || version > storage.SchemaVersion {
		return fmt.Errorf("unsupported backup database version")
	}
	violations, err := db.Query("PRAGMA foreign_key_check")
	if err != nil {
		return err
	}
	hasViolation := violations.Next()
	checkErr := violations.Err()
	violations.Close()
	if checkErr != nil || hasViolation {
		return fmt.Errorf("backup database contains broken references")
	}
	var count int
	if err := db.QueryRow("SELECT count(*) FROM projects").Scan(&count); err != nil || count != 1 {
		return fmt.Errorf("backup must contain one project")
	}
	if err := db.QueryRow("SELECT count(*) FROM projects WHERE id=?", meta.ProjectID).Scan(&count); err != nil || count != 1 {
		return fmt.Errorf("backup project mismatch")
	}
	store := &storage.Store{DB: db, ProjectID: meta.ProjectID}
	engine := snapshot.Engine{Root: stage, Store: store, Config: c}
	rows, err := db.Query("SELECT id FROM checkpoints")
	if err != nil {
		return err
	}
	var ids []string
	for rows.Next() {
		var id string
		if err = rows.Scan(&id); err != nil {
			rows.Close()
			return err
		}
		ids = append(ids, id)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	for _, id := range ids {
		m, err := engine.Load(id)
		if err != nil {
			return err
		}
		for _, f := range m.Files {
			if _, err = engine.ReadObject(f); err != nil {
				return err
			}
		}
	}
	if _, err = db.Exec("UPDATE projects SET root_path=? WHERE id=?", root, meta.ProjectID); err != nil {
		return err
	}
	_, err = db.Exec("PRAGMA wal_checkpoint(TRUNCATE)")
	return err
}
