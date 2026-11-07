package capture

import (
	"agenttm/internal/snapshot"
)

type Observer struct {
	Engine                 *snapshot.Engine
	Session, RunID, TurnID string
	Enabled                bool
}

type operation struct {
	id, tool, before, after, start, completion string
	missing                                    bool
}

type turnPayload struct {
	TurnID string `json:"turn_id"`
}

type completionPayload struct {
	Item operationItem `json:"item"`
}

type operationItem struct {
	Status string `json:"status"`
}
