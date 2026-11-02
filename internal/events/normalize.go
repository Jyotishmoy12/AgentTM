package events

import (
	"bufio"
	"bytes"
	"encoding/json"
	"io"
	"regexp"
	"strings"
	"unicode/utf8"
)

var credentials = []*regexp.Regexp{
	regexp.MustCompile(`(?i)\b(?:sk|ghp|gho|github_pat|xoxb|xoxp)[-_][A-Za-z0-9_-]{8,}`),
	regexp.MustCompile(`(?i)(bearer\s+)[A-Za-z0-9._~+/-]+=*`),
	regexp.MustCompile(`(?i)((?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret|authorization)["']?\s*[=:]\s*["']?)[^\s"',;]+`),
	regexp.MustCompile(`(?s)-----BEGIN [A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----`),
	regexp.MustCompile(`\bAKIA[A-Z0-9]{16}\b`),
	regexp.MustCompile(`(?i)([a-z][a-z0-9+.-]*://)[^\s/@:]+:[^\s/@]+@`),
}

func Redact(s string) string {
	for i, r := range credentials {
		if i == 1 || i == 2 {
			s = r.ReplaceAllString(s, "${1}[REDACTED]")
		} else if i == 5 {
			s = r.ReplaceAllString(s, "${1}[REDACTED]@")
		} else {
			s = r.ReplaceAllString(s, "[REDACTED]")
		}
	}
	return s
}
func clean(v any, task string) any {
	switch x := v.(type) {
	case string:
		if task != "" {
			x = strings.ReplaceAll(x, task, "[PROMPT OMITTED]")
		}
		if strings.HasPrefix(strings.TrimSpace(x), "{") && json.Valid([]byte(x)) {
			var nested map[string]any
			if json.Unmarshal([]byte(x), &nested) == nil {
				b, _ := json.Marshal(clean(nested, task))
				x = string(b)
			}
		}
		return Redact(x)
	case []any:
		for i := range x {
			x[i] = clean(x[i], task)
		}
	case map[string]any:
		for k, v := range x {
			lower := strings.ToLower(k)
			_, numeric := v.(float64)
			if _, ok := v.(int); ok {
				numeric = true
			}
			if _, ok := v.(int64); ok {
				numeric = true
			}
			counter := numeric && strings.HasSuffix(lower, "_tokens")
			if strings.Contains(lower, "secret") || strings.Contains(lower, "password") || strings.Contains(lower, "token") && !counter || strings.Contains(lower, "api_key") || lower == "authorization" {
				x[k] = "[REDACTED]"
			} else {
				x[k] = clean(v, task)
			}
		}
	}
	return v
}

type Record struct {
	Kind, Tool, Call  string
	Payload           []byte
	Upstream          string
	Failed, Completed bool
}

// Default storage is a small allowlist of observable metadata. Reasoning and
// arbitrary future fields are never persisted. Raw streams are not retained.
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
		for _, k := range []string{"usage", "message", "error"} {
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
	// Upstream IDs and tool fields also pass through sanitization before storage.
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

func Encode(p any, max int, omitTask string) []byte {
	b, _ := json.Marshal(clean(p, omitTask))
	if len(b) > max {
		// Truncate the already-redacted representation, wrapped as valid JSON.
		n := max / 2
		if n > len(b) {
			n = len(b)
		}
		for n > 0 && !utf8.Valid(b[:n]) {
			n--
		}
		b, _ = json.Marshal(map[string]any{"source": "codex", "truncated": true, "preview": string(b[:n])})
		for len(b) > max && n > 0 {
			n /= 2
			b, _ = json.Marshal(map[string]any{"truncated": true, "preview": string(b[:n])})
		}
	}
	return b
}

// ReadJSONL drains oversized lines without retaining them, then resumes at the
// next newline. Neither malformed nor oversized input is copied into errors.
func ReadJSONL(src io.Reader, max int, sink func([]byte, bool) error) error {
	reader := bufio.NewReaderSize(src, 64*1024)
	var line []byte
	oversized := false
	for {
		part, e := reader.ReadSlice('\n')
		if !oversized {
			if len(line)+len(part) > max {
				line = nil
				oversized = true
			} else {
				line = append(line, part...)
			}
		}
		if e == bufio.ErrBufferFull {
			continue
		}
		if len(line) > 0 || oversized {
			if oversized || len(bytes.TrimSpace(line)) > 0 {
				if err := sink(bytes.TrimSpace(line), oversized); err != nil {
					return err
				}
			}
		}
		line = nil
		oversized = false
		if e == io.EOF {
			return nil
		}
		if e != nil {
			return e
		}
	}
}
