package maintenance

import (
	"fmt"
	"os"
	"path/filepath"

	"agenttm/internal/operation"
	"agenttm/internal/project"
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
)

func Purge(root string, s *storage.Store, id string) (PurgeResult, error) {
	r := PurgeResult{SessionID: id, Warnings: []string{}}
	if !snapshot.ValidID(id) {
		return r, fmt.Errorf("invalid session UUID")
	}
	unlock, err := operation.Acquire(root, "maintenance")
	if err != nil {
		return r, err
	}
	defer unlock()
	unlockSnapshot, err := operation.Acquire(root, "snapshot")
	if err != nil {
		return r, err
	}
	defer unlockSnapshot()
	var status string
	if err = s.DB.QueryRow("SELECT status FROM sessions WHERE id=? AND project_id=?", id, s.ProjectID).Scan(&status); err != nil {
		return r, fmt.Errorf("session not found in this project")
	}
	if status == "active" {
		return r, fmt.Errorf("active sessions cannot be purged; finish or cancel the recording first")
	}
	var forks int
	if err = s.DB.QueryRow("SELECT count(*) FROM forks f JOIN checkpoints c ON c.id=f.checkpoint_id WHERE c.session_id=?", id).Scan(&forks); err != nil {
		return r, err
	}
	if forks > 0 {
		return r, fmt.Errorf("session has fork records; preserve its checkpoint metadata while those forks exist")
	}
	rows, err := s.DB.Query("SELECT id,manifest_path FROM checkpoints WHERE session_id=?", id)
	if err != nil {
		return r, err
	}
	paths := []string{}
	for rows.Next() {
		var cp, rel string
		if err = rows.Scan(&cp, &rel); err != nil {
			rows.Close()
			return r, err
		}
		if !snapshot.ValidID(cp) || rel != "manifests/"+cp+".json" {
			rows.Close()
			return r, fmt.Errorf("invalid checkpoint storage path; run agenttm doctor")
		}
		p := filepath.Join(root, ".agenttm", filepath.FromSlash(rel))
		if err = project.SafePath(p); err != nil {
			rows.Close()
			return r, err
		}
		paths = append(paths, p)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return r, err
	}
	r.Checkpoints = len(paths)
	log := filepath.Join(root, ".agenttm", "logs", id+".json")
	if err = project.SafePath(log); err != nil {
		return r, err
	}
	paths = append(paths, log)
	tx, err := s.DB.Begin()
	if err != nil {
		return r, err
	}
	defer tx.Rollback()
	if _, err = tx.Exec("DELETE FROM operations WHERE session_id=?", id); err != nil {
		return r, err
	}
	result, err := tx.Exec("DELETE FROM events WHERE session_id=?", id)
	if err != nil {
		return r, err
	}
	n, err := result.RowsAffected()
	if err != nil {
		return r, err
	}
	r.Events = int(n)
	if _, err = tx.Exec("DELETE FROM checkpoints WHERE session_id=?", id); err != nil {
		return r, err
	}
	if _, err = tx.Exec("DELETE FROM sessions WHERE id=? AND project_id=?", id, s.ProjectID); err != nil {
		return r, err
	}
	if err = tx.Commit(); err != nil {
		return r, err
	}
	for _, p := range paths {
		if err = os.Remove(p); err != nil && !os.IsNotExist(err) {
			r.Warnings = append(r.Warnings, "Could not remove an unindexed manifest/log; inspect .agenttm and run doctor.")
		}
	}
	r.Warnings = append(r.Warnings, "Shared file objects are retained. Run agenttm gc to preview unreferenced blobs. Purge is logical deletion, not secure erasure of SQLite pages, backups or fork contents.")
	return r, nil
}
