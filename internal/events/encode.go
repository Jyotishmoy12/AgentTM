package events

import (
	"encoding/json"
	"unicode/utf8"
)

func Encode(p any, max int, omitTask string) []byte {
	b, _ := json.Marshal(clean(p, omitTask))
	if len(b) > max {
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
