package snapshot

import (
	"fmt"
	"path"
	"strings"
	"unicode"
	"unicode/utf8"
)

func ValidatePath(p string) error {
	if p == "" || len(p) > 4096 || !utf8.ValidString(p) || path.IsAbs(p) || path.Clean(p) != p || strings.ContainsAny(p, "\\:") {
		return fmt.Errorf("unsafe snapshot path %q", p)
	}
	for _, c := range p {
		if unicode.IsControl(c) {
			return fmt.Errorf("control character in snapshot path")
		}
	}
	for _, part := range strings.Split(p, "/") {
		lower := strings.ToLower(part)
		if part == "." || part == ".." || strings.TrimRight(part, " .") != part || lower == ".git" || lower == ".agenttm" || strings.ContainsAny(part, "<>\"|?*") {
			return fmt.Errorf("unsafe snapshot path %q", p)
		}
		stem := strings.Split(lower, ".")[0]
		if stem == "con" || stem == "prn" || stem == "aux" || stem == "nul" || len(stem) == 4 && (strings.HasPrefix(stem, "com") || strings.HasPrefix(stem, "lpt")) && stem[3] >= '0' && stem[3] <= '9' {
			return fmt.Errorf("reserved snapshot path %q", p)
		}
	}
	return nil
}
