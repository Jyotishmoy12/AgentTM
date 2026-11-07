package desktop

import (
	"net/http"
	"sync"
)

type GitEnvironment struct {
	GitState        string `json:"git_state"`
	GitVersion      string `json:"git_version"`
	RepositoryState string `json:"repository_state"`
}

type Launcher struct {
	mu      sync.RWMutex
	handler http.Handler
}

type FolderState struct {
	State     string `json:"state"`
	CheckedAt string `json:"checked_at"`
	Message   string `json:"message"`
	Path      string `json:"-"`
}
