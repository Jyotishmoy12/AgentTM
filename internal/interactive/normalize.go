package interactive

import (
	"encoding/json"
	"strings"

	"agenttm/internal/events"
)

func normalize(message wireMessage, max int, omit string) events.Record {
	var params map[string]any
	_ = json.Unmarshal(message.Params, &params)
	raw := map[string]any{}
	switch message.Method {
	case "thread/started":
		raw["type"] = "thread.started"
		if thread, ok := params["thread"].(map[string]any); ok {
			raw["thread_id"] = thread["id"]
		}
	case "turn/started":
		raw["type"] = "turn.started"
	case "turn/completed":
		raw["type"] = "turn.completed"
		if turn, ok := params["turn"].(map[string]any); ok && turn["status"] != "completed" {
			raw["type"] = "turn.failed"
			raw["error"] = turn["error"]
		}
	case "item/started", "item/completed":
		raw["type"] = strings.ReplaceAll(message.Method, "/", ".")
		item, _ := params["item"].(map[string]any)
		q := map[string]any{"id": item["id"], "status": item["status"]}
		switch item["type"] {
		case "agentMessage":
			q["type"] = "agent_message"
			q["text"] = item["text"]
		case "commandExecution":
			q["type"] = "command_execution"
			q["command"] = item["command"]
			q["aggregated_output"] = item["aggregatedOutput"]
			q["exit_code"] = item["exitCode"]
		case "fileChange":
			q["type"] = "file_change"
			changes := []map[string]any{}
			if entries, ok := item["changes"].([]any); ok {
				for _, entry := range entries {
					if change, ok := entry.(map[string]any); ok {
						changes = append(changes, map[string]any{"path": change["path"], "kind": change["kind"]})
					}
				}
			}
			q["changes"] = changes
		default:
			q["type"] = "omitted"
		}
		raw["item"] = q
	default:
		raw["type"] = "unknown"
	}
	b, _ := json.Marshal(raw)
	return events.Normalize(b, max, omit)
}
