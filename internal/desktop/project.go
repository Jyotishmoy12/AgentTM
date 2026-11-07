package desktop

import (
	"fmt"
	"os"
	"path/filepath"

	"agenttm/internal/config"
	"agenttm/internal/project"
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
)

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
