package server

import (
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
)

func New(engine *snapshot.Engine, version, address string) *Server {
	return &Server{Engine: engine, Version: version, Address: address, slots: make(chan struct{}, 2), csrfToken: storage.ID()}
}

func NewDesktop(engine *snapshot.Engine, version string) *Server {
	s := New(engine, version, "wails.localhost")
	s.desktop = true
	return s
}
