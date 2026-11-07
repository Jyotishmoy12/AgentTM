package cli

import (
	"encoding/json"
	"strings"
	"testing"

	"agenttm/internal/config"
)

func TestRecordingMetadataPreservesPrivacyModes(t *testing.T) {
	c := config.Default()
	options := runOptions{task: "private task", model: "sk-private-model-value", sandbox: "read-only", scanTools: true}
	decode := func() map[string]any {
		t.Helper()
		data := recordingMetadata(c, options, "fixture-version")
		if strings.Contains(string(data), options.model) {
			t.Fatal("model credential escaped redaction")
		}
		var meta map[string]any
		if err := json.Unmarshal(data, &meta); err != nil {
			t.Fatal(err)
		}
		return meta
	}
	meta := decode()
	if _, ok := meta["prompt"]; ok || meta["prompt_bytes"] != float64(len(options.task)) || meta["snapshot_after_tool"] != true {
		t.Fatalf("metadata-only policy changed: %v", meta)
	}
	c.Capture.PromptMode = "sanitized"
	options.task = "inspect access_token=private-test-value"
	meta = decode()
	if strings.Contains(meta["prompt"].(string), "private-test-value") || !strings.Contains(meta["prompt"].(string), "[REDACTED]") {
		t.Fatalf("prompt redaction changed: %v", meta)
	}
	options.task = strings.Repeat("x", c.Capture.MaxEventPayloadBytes/2+1)
	meta = decode()
	if _, ok := meta["prompt"]; ok || meta["prompt_omitted_for_size"] != true {
		t.Fatal("oversized stored prompt was not omitted")
	}
}
