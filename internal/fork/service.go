package fork

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"agenttm/internal/operation"
	"agenttm/internal/project"
	"agenttm/internal/storage"
)

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
