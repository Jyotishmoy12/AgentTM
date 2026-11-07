package server

import "agenttm/internal/snapshot"

type Server struct {
	Engine    *snapshot.Engine
	Version   string
	Address   string
	slots     chan struct{}
	csrfToken string
	desktop   bool
}

type forkRequest struct {
	Name         string `json:"name"`
	AllowPartial bool   `json:"allow_partial"`
	Confirmed    bool   `json:"confirmed"`
}
type sessionTitleRequest struct {
	Title *string `json:"title"`
}
type checkpointRef struct {
	rowid int64
	id    string
}
