package snapshot

import (
	"agenttm/internal/config"
	"agenttm/internal/storage"
)

type Engine struct {
	Root   string
	Store  *storage.Store
	Config config.Config
}
type CaptureResult struct {
	Manifest Manifest
	Created  bool
}
