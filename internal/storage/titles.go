package storage

import (
	"database/sql"
	"fmt"
	"strings"
	"unicode"
	"unicode/utf8"
)

func ValidateSessionTitle(title string) (string, error) {
	title = strings.TrimSpace(title)
	if !utf8.ValidString(title) || utf8.RuneCountInString(title) > 120 {
		return "", fmt.Errorf("session name must be at most 120 characters")
	}
	for _, r := range title {
		if unicode.IsControl(r) {
			return "", fmt.Errorf("session name must be a single line without control characters")
		}
	}
	return title, nil
}

func (s *Store) RenameSession(id, title string) error {
	title, err := ValidateSessionTitle(title)
	if err != nil {
		return err
	}
	result, err := s.DB.Exec("UPDATE sessions SET title=? WHERE id=? AND project_id=?", title, id, s.ProjectID)
	if err != nil {
		return err
	}
	count, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if count != 1 {
		return sql.ErrNoRows
	}
	return nil
}
