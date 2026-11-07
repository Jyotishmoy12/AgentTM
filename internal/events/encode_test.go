package events

import (
	"encoding/json"
	"strings"
	"testing"
	"unicode/utf8"
)

func TestEncodingSanitizesNestedValuesAndKeepsNumericUsage(t *testing.T) {
	payload := map[string]any{
		"message":      `{"api_key":"nested-private-value","text":"private task"}`,
		"items":        []any{map[string]any{"access_token": "private-token", "text": "private task"}},
		"input_tokens": 12, "output_tokens": int64(34), "reasoning_output_tokens": float64(56),
		"string_tokens": "private counter text", "Authorization": "private-header",
	}
	encoded := Encode(payload, 4096, "private task")
	if !json.Valid(encoded) {
		t.Fatalf("encoded payload is invalid: %s", encoded)
	}
	for _, private := range []string{"nested-private-value", "private-token", "private task", "private counter text", "private-header"} {
		if strings.Contains(string(encoded), private) {
			t.Errorf("nested value escaped sanitization: %s", private)
		}
	}
	for _, counter := range []string{`"input_tokens":12`, `"output_tokens":34`, `"reasoning_output_tokens":56`} {
		if !strings.Contains(string(encoded), counter) {
			t.Errorf("numeric usage counter lost: %s", counter)
		}
	}
}

func TestEncodingBoundsSanitizedMultibytePayload(t *testing.T) {
	for _, max := range []int{128, 1024, 4096} {
		encoded := Encode(map[string]any{"message": "password=private-value " + strings.Repeat("秘密🙂", 2000)}, max, "")
		if len(encoded) > max || !json.Valid(encoded) || !utf8.Valid(encoded) || !strings.Contains(string(encoded), `"truncated":true`) || strings.Contains(string(encoded), "private-value") {
			t.Fatalf("invalid or unsafe truncated payload at %d bytes: %s", max, encoded)
		}
	}
}
