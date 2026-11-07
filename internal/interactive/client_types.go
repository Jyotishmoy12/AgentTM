package interactive

import (
	"context"
	"encoding/json"
	"io"
	"os/exec"
	"sync"
)

type wireMessage struct {
	ID     json.RawMessage `json:"id,omitempty"`
	Method string          `json:"method,omitempty"`
	Params json.RawMessage `json:"params,omitempty"`
	Result json.RawMessage `json:"result,omitempty"`
	Error  *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}
type client struct {
	ctx      context.Context
	cancel   context.CancelFunc
	cmd      *exec.Cmd
	input    io.WriteCloser
	writeMu  sync.Mutex
	mu       sync.Mutex
	sequence int
	pending  map[string]chan wireMessage
	done     chan struct{}
	err      error
}
