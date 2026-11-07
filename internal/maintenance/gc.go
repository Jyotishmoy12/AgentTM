package maintenance

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"agenttm/internal/project"
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
)

func Collect(engine *snapshot.Engine, apply bool, expected string, minAge time.Duration) (GCReport, error) {
	var report GCReport
	if minAge < 0 {
		return report, fmt.Errorf("minimum age must not be negative")
	}
	release, err := Quiesce(engine.Root, engine.Store)
	if err != nil {
		return report, err
	}
	defer release()
	rows, err := engine.Store.DB.Query("SELECT id,session_id FROM checkpoints")
	if err != nil {
		return report, err
	}
	var checkpoints []checkpoint
	for rows.Next() {
		var c checkpoint
		if err = rows.Scan(&c.id, &c.session); err != nil {
			rows.Close()
			return report, err
		}
		checkpoints = append(checkpoints, c)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return report, err
	}
	live := map[string]bool{}
	indexed := map[string]bool{}
	for _, c := range checkpoints {
		var projectID string
		if err = engine.Store.DB.QueryRow("SELECT project_id FROM sessions WHERE id=?", c.session).Scan(&projectID); err != nil {
			return report, err
		}
		other := *engine
		other.Store = &storage.Store{DB: engine.Store.DB, ProjectID: projectID}
		manifest, err := other.Load(c.id)
		if err != nil {
			return report, fmt.Errorf("GC stopped: invalid checkpoint %s: %w", c.id, err)
		}
		indexed[c.id+".json"] = true
		for _, f := range manifest.Files {
			hash := strings.TrimPrefix(f.ObjectID, "sha256:")
			if !live[hash] {
				if _, err := other.ReadObject(f); err != nil {
					return report, fmt.Errorf("GC stopped: referenced blob is missing or corrupt: %w", err)
				}
			}
			live[hash] = true
		}
	}
	manifests := filepath.Join(engine.Root, ".agenttm", "manifests")
	if err = project.SafePath(manifests); err != nil {
		return report, err
	}
	entries, err := os.ReadDir(manifests)
	if err != nil && !os.IsNotExist(err) {
		return report, err
	}
	for _, entry := range entries {
		if !indexed[entry.Name()] {
			return report, fmt.Errorf("GC stopped: unindexed manifest or staging file; run agenttm doctor")
		}
	}
	base := filepath.Join(engine.Root, ".agenttm", "objects")
	if err = project.SafePath(base); err != nil {
		return report, err
	}
	var candidates []candidate
	cutoff := time.Now().Add(-minAge)
	err = filepath.WalkDir(base, func(p string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.Type()&os.ModeSymlink != 0 {
			return fmt.Errorf("GC stopped: symlink in objects")
		}
		if d.IsDir() {
			return nil
		}
		name := d.Name()
		rel, _ := filepath.Rel(base, p)
		if !snapshot.ValidHash(name) || rel != filepath.Join(name[:2], name) {
			return fmt.Errorf("GC stopped: unexpected object path; run agenttm doctor")
		}
		info, err := d.Info()
		if err != nil {
			return err
		}
		if !info.Mode().IsRegular() {
			return fmt.Errorf("GC stopped: non-regular object")
		}
		report.Objects++
		if live[name] {
			report.Referenced++
			return nil
		}
		if info.ModTime().After(cutoff) {
			return nil
		}
		candidates = append(candidates, candidate{p, info.Size(), info.ModTime().UnixNano()})
		report.Bytes += info.Size()
		return nil
	})
	if err != nil {
		return report, err
	}
	sort.Slice(candidates, func(i, j int) bool { return candidates[i].path < candidates[j].path })
	hash := sha256.New()
	for _, c := range candidates {
		fmt.Fprintf(hash, "%s:%d:%d\n", c.path, c.size, c.modified)
	}
	report.Token = hex.EncodeToString(hash.Sum(nil))
	report.Candidates = len(candidates)
	if !apply {
		return report, nil
	}
	if expected == "" || expected != report.Token {
		return report, fmt.Errorf("storage changed or preview missing; preview garbage collection again")
	}
	for _, c := range candidates {
		if err = project.SafePath(c.path); err != nil {
			return report, err
		}
		if err = os.Remove(c.path); err != nil {
			return report, err
		}
		report.Removed++
	}
	return report, nil
}
