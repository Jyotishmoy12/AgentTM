package events

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestNormalizeKeepsSupportedToolAndEventIdentity(t *testing.T) {
	for _, tool := range []string{"command_execution", "file_change", "mcp_tool_call", "dynamic_tool_call", "agent_message", "error", "reasoning", "future_tool"} {
		line, err := json.Marshal(map[string]any{
			"type": "item.completed", "unrecognized": "private outer field",
			"item": map[string]any{
				"id": "item-1", "type": tool, "status": "completed", "command": "echo safe",
				"aggregated_output": "result", "exit_code": 0, "changes": []any{},
				"name": "tool-name", "server": "tool-server", "text": "message text",
				"message": "tool message", "unrecognized": "private item field",
			},
		})
		if err != nil {
			t.Fatal(err)
		}
		record := Normalize(line, 4096, "")
		if record.Kind != "item.completed" || record.Failed || record.Completed || !json.Valid(record.Payload) {
			t.Fatalf("item event classification changed: %+v", record)
		}
		switch tool {
		case "command_execution", "file_change", "mcp_tool_call", "dynamic_tool_call":
			if record.Tool != tool || record.Call != "item-1" {
				t.Fatalf("supported tool identity lost: %+v", record)
			}
		default:
			if record.Tool != "" || record.Call != "" {
				t.Fatalf("non-tool item gained execution identity: %+v", record)
			}
		}
		if strings.Contains(string(record.Payload), "private outer field") || strings.Contains(string(record.Payload), "private item field") {
			t.Fatal("unknown fields escaped the allowlist")
		}
		if tool == "reasoning" && strings.Contains(string(record.Payload), "message text") {
			t.Fatal("reasoning content was persisted")
		}
	}
}

func TestNormalizePreservesTurnFlagsAndIDLimits(t *testing.T) {
	for _, kind := range []string{"turn.started", "turn.completed", "turn.failed", "error"} {
		data, err := json.Marshal(map[string]any{"type": kind, "turn_id": "turn-1"})
		if err != nil {
			t.Fatal(err)
		}
		record := Normalize(data, 1024, "")
		if record.Kind != kind || record.Completed != (kind == "turn.completed") || record.Failed != (kind == "turn.failed") {
			t.Fatalf("turn outcome flags changed: %+v", record)
		}
	}
	for _, id := range []string{"sk-abcdefghijklmnop", strings.Repeat("x", 257)} {
		data, err := json.Marshal(map[string]any{"type": "thread.started", "thread_id": id})
		if err != nil {
			t.Fatal(err)
		}
		record := Normalize(data, 4096, "")
		want := "[REDACTED]"
		if len(id) > 256 {
			want = ""
		}
		if record.Upstream != want {
			t.Fatalf("thread ID sanitization changed: %q", record.Upstream)
		}
		data, err = json.Marshal(map[string]any{"type": "item.started", "item": map[string]string{"id": id, "type": "command_execution"}})
		if err != nil {
			t.Fatal(err)
		}
		if record = Normalize(data, 4096, ""); record.Call != want {
			t.Fatalf("tool ID sanitization changed: %q", record.Call)
		}
	}
}
