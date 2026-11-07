package cli

import (
	"agenttm/internal/config"
	"agenttm/internal/events"
)

func recordingMetadata(c config.Config, options runOptions, version string) []byte {
	meta := map[string]any{
		"source": "agenttm", "prompt_bytes": len(options.task), "prompt_mode": c.Capture.PromptMode,
		"codex_version": version, "model_override": events.Redact(options.model),
		"sandbox_override": options.sandbox, "snapshot_after_tool": options.scanTools,
	}
	if c.Capture.PromptMode == "sanitized" {
		meta["prompt"] = events.Redact(options.task)
		if len(options.task) > c.Capture.MaxEventPayloadBytes/2 {
			delete(meta, "prompt")
			meta["prompt_omitted_for_size"] = true
		}
	}
	return events.Encode(meta, c.Capture.MaxEventPayloadBytes, "")
}
