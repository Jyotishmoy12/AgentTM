package fork

import (
	"agenttm/internal/snapshot"
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
