package maintenance

import (
	"agenttm/internal/project"
	"fmt"
	"io/fs"
	"path/filepath"
	"strings"
	"time"
)

// Usage reports logical regular-file bytes in disjoint history categories.
// Worktrees are deliberately excluded. This is an observation, not a quota,
// allocated disk measurement, or atomic view during concurrent filesystem writes.
type Usage struct {
	Total      int64  `json:"total"`
	Blobs      int64  `json:"blobs"`
	Database   int64  `json:"database"`
	Manifests  int64  `json:"manifests"`
	Logs       int64  `json:"logs"`
	Other      int64  `json:"other"`
	MeasuredAt string `json:"measured_at"`
}

func StorageUsage(root string) (Usage, error) {
	var result Usage
	base := filepath.Join(root, ".agenttm")
	if err := project.SafePath(base); err != nil {
		return Usage{}, err
	}
	err := filepath.WalkDir(base, func(path string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		rel, err := filepath.Rel(base, path)
		if err != nil {
			return err
		}
		first := strings.Split(filepath.ToSlash(rel), "/")[0]
		if first == "worktrees" {
			if entry.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if entry.Type()&fs.ModeSymlink != 0 {
			return fmt.Errorf("storage measurement stopped at an unsafe link")
		}
		if entry.IsDir() {
			return nil
		}
		info, err := entry.Info()
		if err != nil {
			return err
		}
		if !info.Mode().IsRegular() {
			return fmt.Errorf("storage measurement stopped at an unsupported file")
		}
		size := info.Size()
		result.Total += size
		switch {
		case first == "objects":
			result.Blobs += size
		case first == "manifests":
			result.Manifests += size
		case first == "logs":
			result.Logs += size
		case rel == filepath.Join("data", "events.db") || rel == filepath.Join("data", "events.db-wal") || rel == filepath.Join("data", "events.db-shm") || rel == filepath.Join("data", "events.db-journal"):
			result.Database += size
		default:
			result.Other += size
		}
		return nil
	})
	if err != nil {
		return Usage{}, err
	}
	result.MeasuredAt = time.Now().UTC().Format(time.RFC3339)
	return result, nil
}
