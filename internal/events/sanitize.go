package events

import (
	"encoding/json"
	"strings"
)

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
