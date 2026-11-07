package main

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"agenttm/internal/project"
)

func (b *releaseBuilder) loadDocuments() error {
	b.commit, _ = project.Git(b.root, "rev-parse", "--short", "HEAD")
	if b.commit == "" {
		b.commit = "development"
	}
	if status, err := project.Git(b.root, "-c", "core.fsmonitor=false", "status", "--porcelain", "--untracked-files=normal"); err == nil && status != "" {
		b.commit += "-dirty"
	}
	b.date = time.Now().UTC().Format(time.RFC3339)
	var err error
	b.documents.notices, err = os.ReadFile(filepath.Join(b.root, "internal", "server", "ui", "third-party-notices.txt"))
	if err != nil {
		return fmt.Errorf("build the frontend first: %w", err)
	}
	b.documents.readme = releaseReadme(b.options.version, false)
	b.documents.license, err = os.ReadFile(filepath.Join(b.root, "LICENSE"))
	if err != nil {
		return fmt.Errorf("release license is required: %w", err)
	}
	b.documents.ownership, err = os.ReadFile(filepath.Join(b.root, "NOTICE"))
	if err != nil {
		return fmt.Errorf("release ownership notice is required: %w", err)
	}
	b.documents.guide, err = os.ReadFile(filepath.Join(b.root, "docs", "fork-and-recovery.md"))
	return err
}

func (b *releaseBuilder) archiveFiles(binary string, executable, readme []byte) map[string][]byte {
	return map[string][]byte{
		binary: executable, "README.md": readme, "RESTORE.md": b.documents.guide,
		"THIRD_PARTY_NOTICES.txt": b.documents.notices,
		"LICENSE":                 b.documents.license, "NOTICE": b.documents.ownership,
	}
}
