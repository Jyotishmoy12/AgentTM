package fork

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"agenttm/internal/project"
)

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
