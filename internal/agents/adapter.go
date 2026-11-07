package agents

import (
	"context"

	"agenttm/internal/events"
)

type AgentAdapter interface {
	Name() string
	Available(context.Context) (string, error)
	Run(context.Context, string, string, EventSink) (Result, error)
	Normalize([]byte) events.Record
}
