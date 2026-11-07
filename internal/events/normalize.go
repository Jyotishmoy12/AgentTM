package events

import (
	"encoding/json"
)

func Normalize(line []byte, max int, omitTask string) Record {
	r := Record{Kind: "unknown"}
	var raw map[string]any
	if json.Unmarshal(line, &raw) != nil || raw == nil {
		r.Kind = "malformed"
		r.Payload = []byte(`{"message":"invalid JSONL record omitted"}`)
		return r
	}
	typ, _ := raw["type"].(string)
	p := map[string]any{"source": "codex", "upstream_type": typ}
	switch typ {
	case "thread.started":
		r.Kind = typ
		r.Upstream, _ = raw["thread_id"].(string)
		p["thread_id"] = r.Upstream
	case "turn.started", "turn.completed", "turn.failed", "error":
		r.Kind = typ
		r.Failed = typ == "turn.failed"
		r.Completed = typ == "turn.completed"
		for _, k := range []string{"usage", "message", "error", "turn_id"} {
			if v, ok := raw[k]; ok {
				p[k] = v
			}
		}
	case "item.started", "item.updated", "item.completed":
		r.Kind = typ
		item, _ := raw["item"].(map[string]any)
		it, _ := item["type"].(string)
		r.Call, _ = item["id"].(string)
		q := map[string]any{"type": it, "id": r.Call}
		switch it {
		case "command_execution":
			r.Tool = it
			for _, k := range []string{"command", "aggregated_output", "exit_code", "status"} {
				if v, ok := item[k]; ok {
					q[k] = v
				}
			}
		case "file_change":
			r.Tool = it
			q["changes"] = item["changes"]
			q["status"] = item["status"]
		case "mcp_tool_call", "dynamic_tool_call":
			r.Tool = it
			q["status"] = item["status"]
			q["name"] = item["name"]
			q["server"] = item["server"]
		case "agent_message":
			q["text"] = item["text"]
		case "error":
			q["message"] = item["message"]
		case "reasoning":
			q["omitted"] = true
		default:
			q["details_omitted"] = true
		}
		p["item"] = q
		if r.Tool == "" {
			r.Call = ""
		}
	default:
		p["details_omitted"] = true
	}
	r.Call = Redact(r.Call)
	r.Upstream = Redact(r.Upstream)
	if len(r.Call) > 256 {
		r.Call = ""
	}
	if len(r.Upstream) > 256 {
		r.Upstream = ""
	}
	r.Payload = Encode(p, max, omitTask)
	return r
}
