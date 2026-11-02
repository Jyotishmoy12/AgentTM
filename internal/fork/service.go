package fork

import (
	"context"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"

	"agenttm/internal/operation"
	"agenttm/internal/project"
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
)

type Service struct{ Engine *snapshot.Engine }
type Plan struct {
	CheckpointID string   `json:"checkpoint_id"`
	Name         string   `json:"name"`
	WorktreePath string   `json:"worktree_path"`
	BranchName   string   `json:"branch_name"`
	BaseCommit   string   `json:"base_commit"`
	Partial      bool     `json:"partial"`
	Warnings     []string `json:"warnings"`
}
type Result struct {
	Plan
	ID     string `json:"id"`
	Status string `json:"status"`
}

var namePattern = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,63}$`)

func ValidName(name string) bool {
	return namePattern.MatchString(name) && snapshot.ValidatePath(name) == nil
}

func (s Service) git(ctx context.Context, dir string, args ...string) (string, error) {
	// No checkout hooks, filters, shell aliases, recursive submodule updates or
	// fsmonitor hooks are needed for these plumbing operations.
	hooks := filepath.Join(s.Engine.Root, ".agenttm", "disabled-hooks")
	if err := project.SafePath(hooks); err != nil {
		return "", err
	}
	if entries, err := os.ReadDir(hooks); err == nil && len(entries) > 0 {
		return "", fmt.Errorf("disabled-hooks directory must remain empty")
	} else if err != nil && !os.IsNotExist(err) {
		return "", err
	}
	cmd := project.Command(ctx, dir, append([]string{"-c", "core.hooksPath=" + hooks, "-c", "core.fsmonitor=false"}, args...)...)
	b, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("git %s failed: %w", args[0], err)
	}
	return strings.TrimSpace(string(b)), nil
}
func commitID(id string) bool {
	if len(id) != 40 && len(id) != 64 {
		return false
	}
	for _, c := range id {
		if !strings.ContainsRune("0123456789abcdef", c) {
			return false
		}
	}
	return true
}
func (s Service) Preview(ctx context.Context, id, name string) (Plan, error) {
	p := Plan{CheckpointID: id, Name: name, Warnings: []string{}}
	if !ValidName(name) {
		return p, fmt.Errorf("fork name must be 1..64 lowercase letters, digits, underscores or hyphens; reserved filenames are not allowed")
	}
	m, err := s.Engine.Load(id)
	if err != nil {
		return p, err
	}
	p.Partial = m.Partial
	p.BranchName = "agenttm/" + name
	p.WorktreePath = filepath.Join(s.Engine.Root, ".agenttm", "worktrees", name)
	if err = project.SafePath(p.WorktreePath); err != nil {
		return p, err
	}
	if _, err = os.Lstat(p.WorktreePath); err == nil {
		return p, fmt.Errorf("fork destination already exists; choose a new name")
	} else if !os.IsNotExist(err) {
		return p, err
	}
	refs, err := s.git(ctx, s.Engine.Root, "for-each-ref", "--format=%(refname)", "refs/heads/")
	if err != nil {
		return p, err
	}
	for _, ref := range strings.Split(refs, "\n") {
		if strings.EqualFold(ref, "refs/heads/"+p.BranchName) {
			return p, fmt.Errorf("fork branch already exists; choose a new name")
		}
	}
	// An unborn branch does not yet appear under refs/heads. Check worktree HEADs too.
	trees, err := s.git(ctx, s.Engine.Root, "worktree", "list", "--porcelain")
	if err != nil {
		return p, err
	}
	if strings.Contains(strings.ToLower(trees), "branch refs/heads/"+strings.ToLower(p.BranchName)+"\n") || strings.HasSuffix(strings.ToLower(trees), "branch refs/heads/"+strings.ToLower(p.BranchName)) {
		return p, fmt.Errorf("branch is already used by another worktree")
	}
	if commitID(m.BaseCommit) {
		if resolved, err := s.git(ctx, s.Engine.Root, "rev-parse", "--verify", m.BaseCommit+"^{commit}"); err == nil {
			p.BaseCommit = resolved
		}
	}
	if p.BaseCommit == "" {
		p.BaseCommit, _ = s.git(ctx, s.Engine.Root, "rev-parse", "--verify", "HEAD^{commit}")
		if !commitID(p.BaseCommit) {
			p.BaseCommit = ""
			p.Warnings = append(p.Warnings, "No base or current commit exists; the fork will use a new unborn branch (Git 2.42+ required).")
		} else {
			p.Warnings = append(p.Warnings, "The baseline commit is unavailable; the fork will use current HEAD as its Git base.")
		}
	}
	if p.Partial {
		p.Warnings = append(p.Warnings, "Partial snapshot: omitted paths will not be restored. This fork may not be runnable.")
	}
	return p, nil
}
func (s Service) Create(ctx context.Context, id, name string, allowPartial bool) (result Result, err error) {
	release, err := operation.Acquire(s.Engine.Root, "maintenance")
	if err != nil {
		return result, err
	}
	defer release()
	p, err := s.Preview(ctx, id, name)
	result.Plan = p
	if err != nil {
		return result, err
	}
	if p.Partial && !allowPartial {
		return result, fmt.Errorf("partial checkpoint refused; explicitly use --allow-partial after reviewing omissions")
	}
	m, err := s.Engine.Load(id)
	if err != nil {
		return result, err
	}
	// Fail before any branch/worktree creation if historical objects are damaged.
	for _, f := range m.Files {
		if err = ctx.Err(); err != nil {
			return result, err
		}
		if _, err = s.Engine.ReadObject(f); err != nil {
			return result, err
		}
	}
	parent := filepath.Dir(p.WorktreePath)
	if err = project.SafePath(parent); err != nil {
		return result, err
	}
	if err = os.MkdirAll(parent, 0700); err != nil {
		return result, err
	}
	if err = os.Mkdir(p.WorktreePath, 0700); err != nil {
		return result, fmt.Errorf("cannot reserve fork destination: %w", err)
	}
	result.ID = storage.ID()
	result.Status = "restoring"
	_, err = s.Engine.Store.DB.Exec("INSERT INTO forks(id,checkpoint_id,worktree_path,branch_name,created_at,status,base_commit) VALUES (?,?,?,?,?,'restoring',?)", result.ID, id, p.WorktreePath, p.BranchName, storage.Now(), p.BaseCommit)
	if err != nil {
		_ = os.Remove(p.WorktreePath)
		return result, err
	}
	defer func() {
		if err != nil {
			result.Status = "failed"
			_, _ = s.Engine.Store.DB.Exec("UPDATE forks SET status='failed',error=? WHERE id=?", "Restore interrupted or failed; inspect the retained directory and run agenttm doctor.", result.ID)
			err = fmt.Errorf("fork failed; retained %s for inspection (no automatic cleanup): %w", p.WorktreePath, err)
		}
	}()
	if p.BaseCommit == "" {
		_, err = s.git(ctx, s.Engine.Root, "worktree", "add", "--orphan", "-b", p.BranchName, p.WorktreePath)
	} else {
		_, err = s.git(ctx, s.Engine.Root, "worktree", "add", "--no-checkout", "-b", p.BranchName, p.WorktreePath, p.BaseCommit)
	}
	if err != nil {
		return result, err
	}
	if p.BaseCommit != "" {
		if _, err = s.git(ctx, p.WorktreePath, "read-tree", "--no-sparse-checkout", p.BaseCommit); err != nil {
			return result, err
		}
	}
	if err = s.materialize(ctx, p.WorktreePath, m); err != nil {
		return result, err
	}
	if _, err = s.Engine.Store.DB.Exec("UPDATE forks SET status='ready' WHERE id=?", result.ID); err != nil {
		return result, err
	}
	result.Status = "ready"
	return result, nil
}
func (s Service) materialize(ctx context.Context, dest string, m snapshot.Manifest) error {
	if err := project.SafePath(dest); err != nil {
		return err
	}
	root, err := os.OpenRoot(dest)
	if err != nil {
		return err
	}
	defer root.Close()
	expected := map[string]snapshot.File{}
	for _, entry := range m.Files {
		if err = ctx.Err(); err != nil {
			return err
		}
		if err = snapshot.ValidatePath(entry.Path); err != nil {
			return err
		}
		target := filepath.Join(dest, filepath.FromSlash(entry.Path))
		if err = project.SafePath(target); err != nil {
			return err
		}
		if dir := filepath.ToSlash(filepath.Dir(entry.Path)); dir != "." {
			if err = root.MkdirAll(dir, 0700); err != nil {
				return err
			}
		}
		b, readErr := s.Engine.ReadObject(entry)
		if readErr != nil {
			return readErr
		}
		f, openErr := root.OpenFile(entry.Path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
		if openErr != nil {
			return openErr
		}
		_, err = f.Write(b)
		if err == nil {
			err = f.Sync()
		}
		closeErr := f.Close()
		if err == nil {
			err = closeErr
		}
		if err != nil {
			return err
		}
		if err = root.Chmod(entry.Path, os.FileMode(entry.Mode)); err != nil {
			return err
		}
		f, err = root.Open(entry.Path)
		if err != nil {
			return err
		}
		restored, readErr := io.ReadAll(io.LimitReader(f, entry.Size+1))
		info, statErr := f.Stat()
		f.Close()
		if readErr != nil || statErr != nil || !info.Mode().IsRegular() || int64(len(restored)) != entry.Size || "sha256:"+snapshot.Hash(restored) != entry.ObjectID {
			return fmt.Errorf("restored content verification failed: %s", entry.Path)
		}
		if runtime.GOOS != "windows" && uint32(info.Mode().Perm()) != entry.Mode {
			return fmt.Errorf("restored mode verification failed: %s", entry.Path)
		}
		expected[entry.Path] = entry
	}
	// The worktree started empty: no omitted base files, hooks or symlinks should
	// have appeared. Verify exact file inventory in addition to content hashes.
	return fs.WalkDir(root.FS(), ".", func(p string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if p == "." {
			return nil
		}
		if p == ".git" {
			if !d.Type().IsRegular() {
				return fmt.Errorf("unexpected Git worktree marker type")
			}
			return nil
		}
		if d.Type()&os.ModeSymlink != 0 {
			return fmt.Errorf("unexpected symlink in restored worktree")
		}
		if d.IsDir() {
			return nil
		}
		if _, ok := expected[p]; !ok {
			return fmt.Errorf("unexpected file in restored worktree: %s", p)
		}
		return nil
	})
}

// IsConflict separates common user-correctable errors for CLI/API callers.
func IsConflict(err error) bool {
	return err != nil && (strings.Contains(err.Error(), "already") || strings.Contains(err.Error(), "locked") || strings.Contains(err.Error(), "partial checkpoint"))
}
