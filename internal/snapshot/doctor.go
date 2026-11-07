package snapshot

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	"agenttm/internal/project"
)

func (e *Engine) Doctor() Report {
	r := Report{Problems: []string{}, Warnings: []string{}}
	var uncertain, invalid int
	if err := e.Store.DB.QueryRow(`SELECT count(*) FROM operations o JOIN sessions s ON s.id=o.session_id WHERE s.project_id=? AND (o.capture_status NOT IN ('complete','disabled') OR o.overlapping=1)`, e.Store.ProjectID).Scan(&uncertain); err != nil {
		r.Problems = append(r.Problems, err.Error())
	} else if uncertain > 0 {
		r.Warnings = append(r.Warnings, fmt.Sprintf("%d operations have incomplete or uncertain checkpoint coverage; inspect session Operations", uncertain))
	}
	if err := e.Store.DB.QueryRow(`SELECT count(*) FROM operations o JOIN sessions s ON s.id=o.session_id WHERE s.project_id=? AND (
	(o.before_checkpoint_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM checkpoints c WHERE c.id=o.before_checkpoint_id AND c.session_id=o.session_id)) OR
	(o.after_checkpoint_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM checkpoints c WHERE c.id=o.after_checkpoint_id AND c.session_id=o.session_id)) OR
	(o.start_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM events v WHERE v.id=o.start_event_id AND v.session_id=o.session_id)) OR
	(o.completion_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM events v WHERE v.id=o.completion_event_id AND v.session_id=o.session_id)))`, e.Store.ProjectID).Scan(&invalid); err != nil {
		r.Problems = append(r.Problems, err.Error())
	} else if invalid > 0 {
		r.Problems = append(r.Problems, fmt.Sprintf("%d operations have invalid session links", invalid))
	}
	rows, err := e.Store.DB.Query("SELECT c.id FROM checkpoints c JOIN sessions s ON s.id=c.session_id WHERE s.project_id=?", e.Store.ProjectID)
	if err != nil {
		r.Problems = append(r.Problems, err.Error())
		return r
	}
	var ids []string
	for rows.Next() {
		var id string
		if err = rows.Scan(&id); err != nil {
			r.Problems = append(r.Problems, err.Error())
			break
		}
		ids = append(ids, id)
	}
	if err = rows.Err(); err != nil {
		r.Problems = append(r.Problems, err.Error())
	}
	rows.Close()
	referenced := map[string]bool{}
	manifests := map[string]bool{}
	checked := map[string]int64{}
	for _, id := range ids {
		manifests[id+".json"] = true
		r.Checkpoints++
		m, err := e.Load(id)
		if err != nil {
			r.Problems = append(r.Problems, fmt.Sprintf("checkpoint %s: %v", id, err))
			continue
		}
		var n int
		if err = e.Store.DB.QueryRow("SELECT count(*) FROM events WHERE id=? AND checkpoint_id=? AND session_id=?", m.EventID, m.ID, m.SessionID).Scan(&n); err != nil || n != 1 {
			r.Problems = append(r.Problems, "checkpoint observation link missing: "+id)
		}
		if m.ParentID != "" {
			p, err := e.Load(m.ParentID)
			if err != nil || p.SessionID != m.SessionID || p.ID == m.ID {
				r.Problems = append(r.Problems, "invalid parent checkpoint: "+id)
			}
		}
		for _, f := range m.Files {
			referenced[f.ObjectID] = true
			if size, ok := checked[f.ObjectID]; ok {
				if size != f.Size {
					r.Problems = append(r.Problems, "object size mismatch: "+f.ObjectID)
				}
				continue
			}
			checked[f.ObjectID] = f.Size
			if _, err = e.ReadObject(f); err != nil {
				r.Problems = append(r.Problems, fmt.Sprintf("checkpoint %s file %q: %v", id, f.Path, err))
			}
		}
	}
	for _, area := range []string{"objects", "manifests"} {
		base := filepath.Join(e.Root, ".agenttm", area)
		if err = project.SafePath(base); err != nil {
			r.Problems = append(r.Problems, err.Error())
			continue
		}
		err = filepath.WalkDir(base, func(p string, d fs.DirEntry, walkErr error) error {
			if walkErr != nil {
				if p == base && os.IsNotExist(walkErr) {
					return nil
				}
				r.Problems = append(r.Problems, walkErr.Error())
				return nil
			}
			if d.Type()&os.ModeSymlink != 0 {
				r.Problems = append(r.Problems, "symlink in snapshot store: "+p)
				return nil
			}
			if d.IsDir() {
				return nil
			}
			if strings.HasPrefix(d.Name(), ".tmp-") {
				r.Warnings = append(r.Warnings, "interrupted write left temporary file: "+p)
				return nil
			}
			if area == "manifests" {
				if !manifests[d.Name()] {
					r.Warnings = append(r.Warnings, "unindexed manifest (interrupted capture): "+p)
				}
				return nil
			}
			r.Objects++
			id := "sha256:" + d.Name()
			if !ValidHash(d.Name()) || filepath.Base(filepath.Dir(p)) != d.Name()[:2] {
				r.Problems = append(r.Problems, "invalid object path: "+p)
				return nil
			}
			if !referenced[id] {
				r.Warnings = append(r.Warnings, "unreferenced object retained: "+id)
			}
			if _, ok := checked[id]; !ok {
				b, err := boundedRead(p, MaxBlobBytes)
				if err != nil || Hash(b) != d.Name() {
					r.Problems = append(r.Problems, "corrupt unreferenced object: "+p)
				}
			}
			return nil
		})
		if err != nil {
			r.Problems = append(r.Problems, err.Error())
		}
	}
	lock := filepath.Join(e.Root, ".agenttm", "data", "snapshot.lock")
	if _, err = os.Lstat(lock); err == nil {
		r.Warnings = append(r.Warnings, "snapshot.lock exists: capture may be active; after confirming no capture is running, remove only this lock to recover from an interrupted process")
	}
	maintenance := filepath.Join(e.Root, ".agenttm", "data", "maintenance.lock")
	if _, err = os.Lstat(maintenance); err == nil {
		r.Warnings = append(r.Warnings, "maintenance.lock exists: fork/purge may be active; verify no operation is running before removing a stale lock")
	}
	forks, queryErr := e.Store.DB.Query("SELECT f.worktree_path,f.status FROM forks f JOIN checkpoints c ON c.id=f.checkpoint_id JOIN sessions s ON s.id=c.session_id WHERE s.project_id=?", e.Store.ProjectID)
	known := map[string]bool{}
	if queryErr != nil {
		r.Problems = append(r.Problems, queryErr.Error())
	} else {
		for forks.Next() {
			var p, status string
			if err = forks.Scan(&p, &status); err != nil {
				r.Problems = append(r.Problems, err.Error())
				break
			}
			known[filepath.Clean(p)] = true
			if status != "ready" {
				r.Warnings = append(r.Warnings, "fork "+status+" retained for inspection: "+p)
			}
			if err = project.SafePath(p); err != nil {
				r.Problems = append(r.Problems, err.Error())
			} else if _, err = os.Stat(p); err != nil {
				r.Warnings = append(r.Warnings, "recorded fork directory unavailable: "+p)
			}
		}
		if err = forks.Err(); err != nil {
			r.Problems = append(r.Problems, err.Error())
		}
		forks.Close()
	}
	worktrees := filepath.Join(e.Root, ".agenttm", "worktrees")
	if err = project.SafePath(worktrees); err != nil {
		r.Problems = append(r.Problems, err.Error())
	} else if entries, err := os.ReadDir(worktrees); err == nil {
		for _, d := range entries {
			p := filepath.Join(worktrees, d.Name())
			if !known[p] {
				r.Warnings = append(r.Warnings, "unrecorded fork directory retained: "+p)
			}
		}
	} else if !os.IsNotExist(err) {
		r.Problems = append(r.Problems, err.Error())
	}
	return r
}
