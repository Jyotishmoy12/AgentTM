package agents

import (
	"agenttm/internal/events"
	"context"
)

type EventSink func(events.Record) error
type Result struct {
	ExitCode          int
	Failed, Completed bool
}
type AgentAdapter interface {
	Name() string
	Available(context.Context) (string, error)
	Run(context.Context, string, string, EventSink) (Result, error)
	Normalize([]byte) events.Record
}
