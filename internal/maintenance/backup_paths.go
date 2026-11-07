package maintenance

import (
	"path"
	"path/filepath"
	"strings"

	"agenttm/internal/project"
	"agenttm/internal/snapshot"
)

func canonicalBackupFile(name string) (string, error) {
	p, err := filepath.Abs(name)
	if err != nil {
		return "", err
	}
	for current := p; ; current = filepath.Dir(current) {
		base := filepath.Base(current)
		if strings.EqualFold(base, ".agenttm") || strings.EqualFold(base, ".git") {
			if err = project.SafePath(p); err != nil {
				return "", err
			}
			break
		}
		if filepath.Dir(current) == current {
			break
		}
	}
	parent, err := filepath.EvalSymlinks(filepath.Dir(p))
	if err != nil {
		return "", err
	}
	p = filepath.Join(parent, filepath.Base(p))
	if err = project.SafePath(p); err != nil {
		return "", err
	}
	return p, nil
}

func allowedBackupPath(name string) bool {
	if name == "backup.json" || name == "config.json" || name == "data/events.db" {
		return true
	}
	if path.Clean(name) != name || strings.ContainsAny(name, "\\:") || strings.HasPrefix(name, "/") {
		return false
	}
	parts := strings.Split(name, "/")
	if len(parts) == 2 && (parts[0] == "manifests" || parts[0] == "logs") {
		return strings.HasSuffix(parts[1], ".json") && snapshot.ValidID(strings.TrimSuffix(parts[1], ".json"))
	}
	return len(parts) == 3 && parts[0] == "objects" && snapshot.ValidHash(parts[2]) && parts[1] == parts[2][:2]
}

func backupEntryLimit(name string) int64 {
	switch {
	case name == "backup.json":
		return 4096
	case name == "data/events.db":
		return 8 << 30
	case strings.HasPrefix(name, "objects/"):
		return snapshot.MaxBlobBytes
	case strings.HasPrefix(name, "manifests/"):
		return snapshot.MaxManifestBytes
	default:
		return 1 << 20
	}
}
