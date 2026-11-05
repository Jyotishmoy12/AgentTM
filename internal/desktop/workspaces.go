package desktop

import (
	"database/sql"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"agenttm/internal/project"
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
)

// FolderState is an on-demand directory check, never a worktree integrity claim.
type FolderState struct {
	State     string `json:"state"`
	CheckedAt string `json:"checked_at"`
	Message   string `json:"message"`
	Path      string `json:"-"`
}

// CheckRestoredFolder accepts a ledger ID rather than an arbitrary frontend path.
// It only inspects direct children of this project's managed worktree directory.
func CheckRestoredFolder(store *storage.Store, root, id string) (FolderState, error) {
	result := FolderState{CheckedAt: time.Now().UTC().Format(time.RFC3339)}
	if store == nil || !snapshot.ValidID(id) {
		return result, fmt.Errorf("select a recorded restored workspace")
	}
	var path string
	err := store.DB.QueryRow(`SELECT f.worktree_path FROM forks f JOIN checkpoints c ON c.id=f.checkpoint_id JOIN sessions s ON s.id=c.session_id WHERE f.id=? AND s.project_id=?`, id, store.ProjectID).Scan(&path)
	if err == sql.ErrNoRows {
		return result, fmt.Errorf("restored workspace not found in this project")
	}
	if err != nil {
		return result, fmt.Errorf("could not read the restored workspace record")
	}
	base := filepath.Join(root, ".agenttm", "worktrees")
	rel, err := filepath.Rel(base, path)
	if err != nil || !filepath.IsAbs(path) || rel == "." || rel == ".." || strings.ContainsAny(rel, "/\\") {
		result.State = "blocked"
		result.Message = "The recorded folder is outside this project's managed workspaces."
		return result, nil
	}
	if err = project.SafePath(path); err != nil {
		result.State = "blocked"
		result.Message = "The recorded path contains an unsafe link or cannot be accessed."
		return result, nil
	}
	info, err := os.Stat(path)
	if os.IsNotExist(err) {
		result.State = "missing"
		result.Message = "The recorded folder was not found. It may have been moved or removed."
		return result, nil
	}
	if err != nil {
		result.State = "inaccessible"
		result.Message = "The recorded folder cannot be accessed."
		return result, nil
	}
	if !info.IsDir() {
		result.State = "inaccessible"
		result.Message = "The recorded location is no longer a directory."
		return result, nil
	}
	folder, err := os.Open(path)
	if err == nil {
		_, err = folder.ReadDir(1)
		_ = folder.Close()
	}
	if err != nil && err != io.EOF {
		result.State = "inaccessible"
		result.Message = "The recorded folder cannot be read."
		return result, nil
	}
	result.State = "available"
	result.Path = filepath.Clean(path)
	result.Message = "Folder is accessible. Git registration and file integrity were not re-verified."
	return result, nil
}
