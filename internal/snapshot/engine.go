package snapshot

import (
	"database/sql"
	"errors"
	"fmt"
)

func (e *Engine) session(id string) error {
	if !ValidID(id) {
		return fmt.Errorf("invalid session UUID")
	}
	var n int
	if err := e.Store.DB.QueryRow("SELECT count(*) FROM sessions WHERE id=? AND project_id=?", id, e.Store.ProjectID).Scan(&n); err != nil {
		return err
	}
	if n != 1 {
		return fmt.Errorf("session not found in current project")
	}
	return nil
}

func (e *Engine) List(session string) ([]Manifest, error) {
	if err := e.session(session); err != nil {
		return nil, err
	}
	rows, err := e.Store.DB.Query("SELECT id FROM checkpoints WHERE session_id=? ORDER BY rowid", session)
	if err != nil {
		return nil, err
	}
	var ids []string
	for rows.Next() {
		var id string
		if err = rows.Scan(&id); err != nil {
			rows.Close()
			return nil, err
		}
		ids = append(ids, id)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, err
	}
	out := []Manifest{}
	for _, id := range ids {
		m, err := e.Load(id)
		if err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, nil
}

func (e *Engine) latest(session string) (*Manifest, error) {
	var id string
	err := e.Store.DB.QueryRow("SELECT id FROM checkpoints WHERE session_id=? ORDER BY rowid DESC LIMIT 1", session).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	m, err := e.Load(id)
	return &m, err
}
