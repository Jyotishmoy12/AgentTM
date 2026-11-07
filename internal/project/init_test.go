package project

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"agenttm/internal/config"
)

func TestInitPreservesExistingConfigurationAndExcludeRules(t *testing.T) {
	root := t.TempDir()
	gitTest(t, root, "init")
	if err := os.MkdirAll(filepath.Join(root, ".agenttm"), 0700); err != nil {
		t.Fatal(err)
	}
	c := config.Default()
	c.Capture.PromptMode = "sanitized"
	c.Capture.SnapshotAfterTool = false
	data, err := json.Marshal(c)
	if err != nil {
		t.Fatal(err)
	}
	configPath := filepath.Join(root, ".agenttm", "config.json")
	if err := os.WriteFile(configPath, data, 0600); err != nil {
		t.Fatal(err)
	}
	exclude := filepath.Join(root, ".git", "info", "exclude")
	const original = "# existing user rules\nuser-cache/"
	if err := os.WriteFile(exclude, []byte(original), 0600); err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 2; i++ {
		if err := Init(root); err != nil {
			t.Fatal(err)
		}
	}
	after, err := os.ReadFile(configPath)
	if err != nil || !bytes.Equal(data, after) {
		t.Fatalf("existing configuration overwritten: %v", err)
	}
	after, err = os.ReadFile(exclude)
	if err != nil || !bytes.HasPrefix(after, []byte(original)) || bytes.Count(after, []byte("/.agenttm/")) != 1 {
		t.Fatalf("exclude rules replaced or duplicated: %q, %v", after, err)
	}
}

func TestInitRefusesInvalidConfigurationWithoutOverwriting(t *testing.T) {
	root := t.TempDir()
	gitTest(t, root, "init")
	if err := os.MkdirAll(filepath.Join(root, ".agenttm"), 0700); err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(root, ".agenttm", "config.json")
	const original = `{"schema_version":999}`
	if err := os.WriteFile(path, []byte(original), 0600); err != nil {
		t.Fatal(err)
	}
	if err := Init(root); err == nil {
		t.Fatal("invalid existing configuration accepted")
	}
	data, err := os.ReadFile(path)
	if err != nil || string(data) != original {
		t.Fatalf("invalid configuration overwritten: %q, %v", data, err)
	}
}
