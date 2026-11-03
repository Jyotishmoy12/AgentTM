// Package desktop provides the project-opening flow used by the native shell.
package desktop

import (
	_ "embed"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sync"

	"agenttm/internal/config"
	"agenttm/internal/project"
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
)

// Open never initializes history unless the caller explicitly confirms it.
// An existing history directory is opened as-is, including configuration errors.
func Open(directory string, confirm func(string) (bool, error)) (*snapshot.Engine, error) {
	root, err := project.Root(directory)
	if err != nil {
		return nil, err
	}
	base := filepath.Join(root, ".agenttm")
	if err = project.SafePath(base); err != nil {
		return nil, err
	}
	if _, err = os.Lstat(base); os.IsNotExist(err) {
		if confirm == nil {
			return nil, fmt.Errorf("choose a project to initialize local history")
		}
		accepted, err := confirm(root)
		if err != nil {
			return nil, err
		}
		if !accepted {
			return nil, nil
		}
		if err = project.Init(root); err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	}
	cp := filepath.Join(base, "config.json")
	if err = project.SafePath(cp); err != nil {
		return nil, err
	}
	c, err := config.Load(cp)
	if err != nil {
		return nil, fmt.Errorf("cannot open existing AgentTM configuration: %w", err)
	}
	s, err := storage.Open(root)
	if err != nil {
		return nil, err
	}
	return &snapshot.Engine{Root: root, Store: s, Config: c}, nil
}

// Launcher swaps from the welcome page to the project dashboard once opened.
type Launcher struct {
	mu      sync.RWMutex
	handler http.Handler
}

func (l *Launcher) Set(handler http.Handler) { l.mu.Lock(); defer l.mu.Unlock(); l.handler = handler }
func (l *Launcher) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	l.mu.RLock()
	handler := l.handler
	l.mu.RUnlock()
	if handler != nil {
		handler.ServeHTTP(w, r)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	switch r.URL.Path {
	case "/", "/index.html":
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		fmt.Fprint(w, welcomeHTML)
	case "/launcher.js":
		w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
		fmt.Fprint(w, welcomeJS)
	default:
		http.NotFound(w, r)
	}
}

//go:embed welcome.html
var welcomeHTML string

//go:embed launcher.js
var welcomeJS string
