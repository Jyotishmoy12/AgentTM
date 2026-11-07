package interactive

import (
	"context"
	"encoding/json"
	"sync"

	"agenttm/internal/snapshot"
)

type Approval struct {
	ID        string `json:"id"`
	Method    string `json:"method"`
	Command   string `json:"command"`
	Reason    string `json:"reason"`
	Directory string `json:"directory"`
	rawID     json.RawMessage
	rpc       *client
}
type State struct {
	SessionID string     `json:"session_id"`
	Running   bool       `json:"running"`
	Draft     string     `json:"draft"`
	Error     string     `json:"error"`
	Approvals []Approval `json:"approvals"`
}
type Manager struct {
	Engine     *snapshot.Engine
	Executable string
	mu         sync.Mutex
	state      State
	cancel     context.CancelFunc
	done       chan struct{}
	rpc        *client
	thread     string
	turn       string
}
