package agents

import "agenttm/internal/events"

type EventSink func(events.Record) error
type Result struct {
	ExitCode          int
	Failed, Completed bool
}
