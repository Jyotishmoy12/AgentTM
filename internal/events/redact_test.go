package events

import (
	"strings"
	"testing"
)

func TestRedaction(t *testing.T) {
	for _, secret := range []string{"sk-abcdefghijklmnop", "ghp_abcdefghijklmnop", "AKIA1234567890123456", "password=hunter2", "Bearer abcdef12345", "postgres://user:password@localhost/db", "-----BEGIN PRIVATE KEY-----\nsecret\n-----END PRIVATE KEY-----"} {
		got := Redact(secret)
		if got == secret || !strings.Contains(got, "[REDACTED]") {
			t.Errorf("redaction failed: %q", got)
		}
	}
}

func TestRedactionPreservesReplacementGroups(t *testing.T) {
	for input, want := range map[string]string{
		"sk-abcdefghijklmnop":         "[REDACTED]",
		"ghp_abcdefghijklmnop":        "[REDACTED]",
		"gho_abcdefghijklmnop":        "[REDACTED]",
		"github_pat_abcdefghijklmnop": "[REDACTED]",
		"xoxb-abcdefghijklmnop":       "[REDACTED]",
		"xoxp-abcdefghijklmnop":       "[REDACTED]",
		"Bearer abcdef12345":          "Bearer [REDACTED]",
		"password=hunter2":            "password=[REDACTED]",
		`"api_key":"private-value"`:   `"api_key":"[REDACTED]"`,
		"-----BEGIN PRIVATE KEY-----\nsecret\n-----END PRIVATE KEY-----": "[REDACTED]",
		"AKIA1234567890123456":                  "[REDACTED]",
		"postgres://user:password@localhost/db": "postgres://[REDACTED]@localhost/db",
		"ordinary text without credentials":     "ordinary text without credentials",
	} {
		if got := Redact(input); got != want {
			t.Errorf("replacement changed: got %q, want %q", got, want)
		}
	}
}
