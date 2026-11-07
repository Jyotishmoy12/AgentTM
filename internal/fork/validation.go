package fork

import (
	"regexp"
	"strings"

	"agenttm/internal/snapshot"
)

var namePattern = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,63}$`)

func ValidName(name string) bool {
	return namePattern.MatchString(name) && snapshot.ValidatePath(name) == nil
}

func commitID(id string) bool {
	if len(id) != 40 && len(id) != 64 {
		return false
	}
	for _, c := range id {
		if !strings.ContainsRune("0123456789abcdef", c) {
			return false
		}
	}
	return true
}

func IsConflict(err error) bool {
	return err != nil && (strings.Contains(err.Error(), "already") || strings.Contains(err.Error(), "locked") || strings.Contains(err.Error(), "partial checkpoint"))
}
