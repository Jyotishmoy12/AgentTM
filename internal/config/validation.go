package config

import (
	"fmt"
	slashpath "path"
	"strings"
)

func validate(c Config) error {
	if c.SchemaVersion != 1 {
		return fmt.Errorf("unsupported schema_version %d; expected 1", c.SchemaVersion)
	}
	if c.Storage.MaxFileBytes <= 0 || c.Storage.MaxSnapshotBytes < c.Storage.MaxFileBytes {
		return fmt.Errorf("invalid storage limits")
	}
	if c.Storage.MaxFileBytes > 64<<20 || c.Storage.MaxSnapshotBytes > 2<<30 {
		return fmt.Errorf("storage limits must not exceed 64 MiB per file and 2 GiB per snapshot")
	}
	if len(c.Exclude) > 256 {
		return fmt.Errorf("at most 256 exclusion patterns are supported")
	}
	for _, pattern := range c.Exclude {
		if pattern == "" || len(pattern) > 256 || slashpath.IsAbs(pattern) || strings.ContainsAny(pattern, "\\:") || strings.Contains(pattern, "..") {
			return fmt.Errorf("invalid repository-relative exclusion pattern %q", pattern)
		}
		if _, e := slashpath.Match(pattern, ""); e != nil {
			return fmt.Errorf("invalid exclusion pattern %q: %w", pattern, e)
		}
	}
	if c.Capture.MaxEventPayloadBytes < 1024 || c.Capture.MaxEventPayloadBytes > 1<<20 {
		return fmt.Errorf("max_event_payload_bytes must be 1024..1048576")
	}
	if c.Capture.PromptMode != "metadata_only" && c.Capture.PromptMode != "sanitized" {
		return fmt.Errorf("prompt_mode must be metadata_only or sanitized")
	}
	if c.Server.Host != "127.0.0.1" || c.Server.Port < 1 || c.Server.Port > 65535 {
		return fmt.Errorf("server must use 127.0.0.1 and a valid port")
	}
	return nil
}
