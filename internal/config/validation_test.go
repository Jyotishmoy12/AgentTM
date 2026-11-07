package config

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestValidationLimitsAndPatterns(t *testing.T) {
	check := func(c Config, want string) {
		t.Helper()
		data, err := json.Marshal(c)
		if err != nil {
			t.Fatal(err)
		}
		_, err = loadJSON(t, string(data))
		if want == "" {
			if err != nil {
				t.Fatalf("valid boundary rejected: %v", err)
			}
		} else if err == nil || !strings.Contains(err.Error(), want) {
			t.Fatalf("expected %q, got %v", want, err)
		}
	}
	for _, size := range []int64{0, -1} {
		c := Default()
		c.Storage.MaxFileBytes = size
		check(c, "invalid storage limits")
	}
	c := Default()
	c.Storage.MaxSnapshotBytes = c.Storage.MaxFileBytes - 1
	check(c, "invalid storage limits")
	c = Default()
	c.Storage.MaxFileBytes = (64 << 20) + 1
	check(c, "storage limits must not exceed")
	c = Default()
	c.Storage.MaxSnapshotBytes = (2 << 30) + 1
	check(c, "storage limits must not exceed")
	c = Default()
	c.Storage.MaxFileBytes, c.Storage.MaxSnapshotBytes = 64<<20, 2<<30
	check(c, "")
	for _, pattern := range []string{"", "../escape", "nested/../file", "/absolute", `C:drive`, `folder\file`, strings.Repeat("x", 257)} {
		c = Default()
		c.Exclude = []string{pattern}
		check(c, "invalid repository-relative exclusion pattern")
	}
	c = Default()
	c.Exclude = []string{"["}
	check(c, "invalid exclusion pattern")
	c = Default()
	c.Exclude = make([]string, 257)
	check(c, "at most 256 exclusion patterns")
	c.Exclude = make([]string, 256)
	for i := range c.Exclude {
		c.Exclude[i] = strings.Repeat("x", 256)
	}
	check(c, "")
	for _, size := range []int{1023, (1 << 20) + 1} {
		c = Default()
		c.Capture.MaxEventPayloadBytes = size
		check(c, "max_event_payload_bytes must be")
	}
	for _, size := range []int{1024, 1 << 20} {
		c = Default()
		c.Capture.MaxEventPayloadBytes = size
		check(c, "")
	}
	for _, mode := range []string{"", "raw", "RAW"} {
		c = Default()
		c.Capture.PromptMode = mode
		check(c, "prompt_mode must be metadata_only or sanitized")
	}
	for _, host := range []string{"0.0.0.0", "localhost", "::1", ""} {
		c = Default()
		c.Server.Host = host
		check(c, "server must use 127.0.0.1 and a valid port")
	}
	for _, port := range []int{-1, 0, 65536} {
		c = Default()
		c.Server.Port = port
		check(c, "server must use 127.0.0.1 and a valid port")
	}
	for _, port := range []int{1, 65535} {
		c = Default()
		c.Server.Port = port
		check(c, "")
	}
}

func TestValidationPreservesFirstError(t *testing.T) {
	_, err := loadJSON(t, `{"schema_version":99,"storage":{"max_file_bytes":0},"capture":{"prompt_mode":"raw"},"server":{"host":"0.0.0.0"}}`)
	if err == nil || err.Error() != "unsupported schema_version 99; expected 1" {
		t.Fatalf("schema error precedence changed: %v", err)
	}
	_, err = loadJSON(t, `{"storage":{"max_file_bytes":0},"capture":{"prompt_mode":"raw"},"server":{"host":"0.0.0.0"}}`)
	if err == nil || err.Error() != "invalid storage limits" {
		t.Fatalf("storage error precedence changed: %v", err)
	}
}
