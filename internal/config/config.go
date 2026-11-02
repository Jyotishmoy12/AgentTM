package config

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"
	slashpath "path"
	"strings"
)

type Config struct {
	SchemaVersion int `json:"schema_version"`
	Storage       struct {
		MaxFileBytes     int64 `json:"max_file_bytes"`
		MaxSnapshotBytes int64 `json:"max_snapshot_bytes"`
	} `json:"storage"`
	Capture struct {
		PromptMode           string `json:"prompt_mode"`
		MaxEventPayloadBytes int    `json:"max_event_payload_bytes"`
		SnapshotAfterTool    bool   `json:"snapshot_after_tool"`
	} `json:"capture"`
	Exclude []string `json:"exclude"`
	Server  struct {
		Host string `json:"host"`
		Port int    `json:"port"`
	} `json:"server"`
}

func Default() Config {
	var c Config
	c.SchemaVersion = 1
	c.Storage.MaxFileBytes = 2 << 20
	c.Storage.MaxSnapshotBytes = 200 << 20
	c.Capture.PromptMode = "metadata_only"
	c.Capture.MaxEventPayloadBytes = 65536
	c.Exclude = []string{".env", ".env.*", "**/*.pem", "**/*.key", "node_modules/**", "vendor/**", "dist/**", "build/**", ".agenttm/**"}
	c.Server.Host = "127.0.0.1"
	c.Server.Port = 7331
	return c
}

func Load(path string) (Config, error) {
	c := Default()
	b, e := os.ReadFile(path)
	if e != nil {
		return c, e
	}
	if bytes.Equal(bytes.TrimSpace(b), []byte("null")) {
		return c, fmt.Errorf("config must be a JSON object")
	}
	d := json.NewDecoder(bytes.NewReader(b))
	d.DisallowUnknownFields()
	if e = d.Decode(&c); e != nil {
		return c, fmt.Errorf("invalid config: %w", e)
	}
	var extra any
	if d.Decode(&extra) != io.EOF {
		return c, fmt.Errorf("config must contain one JSON object")
	}
	if c.SchemaVersion != 1 {
		return c, fmt.Errorf("unsupported schema_version %d; expected 1", c.SchemaVersion)
	}
	if c.Storage.MaxFileBytes <= 0 || c.Storage.MaxSnapshotBytes < c.Storage.MaxFileBytes {
		return c, fmt.Errorf("invalid storage limits")
	}
	if c.Storage.MaxFileBytes > 64<<20 || c.Storage.MaxSnapshotBytes > 2<<30 {
		return c, fmt.Errorf("storage limits must not exceed 64 MiB per file and 2 GiB per snapshot")
	}
	if len(c.Exclude) > 256 {
		return c, fmt.Errorf("at most 256 exclusion patterns are supported")
	}
	for _, pattern := range c.Exclude {
		if pattern == "" || len(pattern) > 256 || slashpath.IsAbs(pattern) || strings.ContainsAny(pattern, "\\:") || strings.Contains(pattern, "..") {
			return c, fmt.Errorf("invalid repository-relative exclusion pattern %q", pattern)
		}
		if _, e := slashpath.Match(pattern, ""); e != nil {
			return c, fmt.Errorf("invalid exclusion pattern %q: %w", pattern, e)
		}
	}
	if c.Capture.MaxEventPayloadBytes < 1024 || c.Capture.MaxEventPayloadBytes > 1<<20 {
		return c, fmt.Errorf("max_event_payload_bytes must be 1024..1048576")
	}
	if c.Capture.PromptMode != "metadata_only" && c.Capture.PromptMode != "sanitized" {
		return c, fmt.Errorf("prompt_mode must be metadata_only or sanitized")
	}
	if c.Server.Host != "127.0.0.1" || c.Server.Port < 1 || c.Server.Port > 65535 {
		return c, fmt.Errorf("server must use 127.0.0.1 and a valid port")
	}
	return c, nil
}
