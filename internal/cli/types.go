package cli

import (
	"io"
	"time"

	"agenttm/internal/agents"
	"agenttm/internal/snapshot"
)

type runOptions struct {
	model     string
	sandbox   string
	task      string
	scanTools bool
}

type recordingResult struct {
	engine        *snapshot.Engine
	id            string
	result        agents.Result
	runErr        error
	captureFailed bool
	started       time.Time
	output        io.Writer
}
