package events

import (
	"regexp"
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
		switch i {
		case 1, 2:
			s = r.ReplaceAllString(s, "${1}[REDACTED]")
		case 5:
			s = r.ReplaceAllString(s, "${1}[REDACTED]@")
		default:
			s = r.ReplaceAllString(s, "[REDACTED]")
		}
	}
	return s
}
