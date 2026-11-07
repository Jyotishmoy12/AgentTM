package storage

func (s *Store) Start() (string, error) {
	id := ID()
	_, e := s.DB.Exec("INSERT INTO sessions(id,project_id,agent,started_at) VALUES (?,?,'codex',?)", id, s.ProjectID, Now())
	return id, e
}

func (s *Store) Finish(id, status string, code int) error {
	_, e := s.DB.Exec("UPDATE sessions SET ended_at=?,status=?,exit_code=? WHERE id=? AND project_id=?", Now(), status, code, id, s.ProjectID)
	return e
}

func (s *Store) Sessions() ([]Session, error) {
	rows, e := s.DB.Query("SELECT id,title,agent,started_at,ended_at,status,exit_code FROM sessions WHERE project_id=? ORDER BY started_at DESC", s.ProjectID)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	out := []Session{}
	for rows.Next() {
		var v Session
		if e = rows.Scan(&v.ID, &v.Title, &v.Agent, &v.StartedAt, &v.EndedAt, &v.Status, &v.ExitCode); e != nil {
			return nil, e
		}
		out = append(out, v)
	}
	return out, rows.Err()
}
