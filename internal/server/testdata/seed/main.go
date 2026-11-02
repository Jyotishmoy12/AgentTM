// This program creates explicit synthetic test data in a NEW disposable Git
// repository. It is never used by the product's recording path.
package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"agenttm/internal/config"
	"agenttm/internal/project"
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
)

func main() {
	if err := seed(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
func seed() error {
	target := flag.String("root", "", "new test repository directory")
	flag.Parse()
	if *target == "" {
		return fmt.Errorf("--root is required")
	}
	root, err := filepath.Abs(*target)
	if err != nil {
		return err
	}
	if _, err = os.Lstat(root); !os.IsNotExist(err) {
		return fmt.Errorf("test destination must not already exist: %s", root)
	}
	if err = os.MkdirAll(root, 0700); err != nil {
		return err
	}
	if b, err := exec.Command("git", "init", root).CombinedOutput(); err != nil {
		return fmt.Errorf("git init: %s: %w", b, err)
	}
	if err = project.Init(root); err != nil {
		return err
	}
	store, err := storage.Open(root)
	if err != nil {
		return err
	}
	defer store.DB.Close()
	session, err := store.Start()
	if err != nil {
		return err
	}
	if _, err = store.DB.Exec("UPDATE sessions SET agent='synthetic-test' WHERE id=?", session); err != nil {
		return err
	}
	engine := snapshot.Engine{Root: root, Store: store, Config: config.Default()}
	if err = os.WriteFile(filepath.Join(root, "example.txt"), []byte("Baseline workspace text\n"), 0600); err != nil {
		return err
	}
	if _, err = engine.Capture(context.Background(), session, "baseline"); err != nil {
		return err
	}
	for _, kind := range []string{"item.started", "item.completed"} {
		if err = store.Append(session, kind, "command_execution", "synthetic-item", []byte(`{"source":"synthetic-test","item":{"type":"command_execution","command":"synthetic test fixture; no command was executed","aggregated_output":"<script>untrusted output rendered as text</script>","status":"completed"}}`)); err != nil {
			return err
		}
	}
	for p, text := range map[string]string{"example.txt": "Changed workspace text\n", "added.txt": "Eligible untracked file\n", ".env": "SYNTHETIC_SECRET=excluded\n"} {
		if err = os.WriteFile(filepath.Join(root, p), []byte(text), 0600); err != nil {
			return err
		}
	}
	if _, err = engine.Capture(context.Background(), session, "final"); err != nil {
		return err
	}
	if err = store.Finish(session, "completed", 0); err != nil {
		return err
	}
	fmt.Println("Created synthetic browser test repository:", root)
	return nil
}
