package codex

import (
	"agenttm/internal/agents"
	"agenttm/internal/events"
)

var _ agents.AgentAdapter = Adapter{}

func (a Adapter) Name() string { return "codex" }

func (a Adapter) binary() string {
	if a.Executable != "" {
		return a.Executable
	}
	return "codex"
}

func (a Adapter) Normalize(b []byte) events.Record {
	return events.Normalize(b, a.MaxPayload, a.OmitTask)
}
