// Package interactive connects a user-driven desktop conversation to Codex's
// stdio App Server. It never scrapes a terminal or enables unattended turns.
package interactive

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os/exec"
	"sync"

	"agenttm/internal/events"
	"agenttm/internal/process"
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

func launch(ctx context.Context, executable, root string, receive func(*client, wireMessage) error) (*client, error) {
	ctx, cancel := context.WithCancel(ctx)
	if executable == "" {
		executable = "codex"
	}
	cmd := exec.CommandContext(ctx, executable, "app-server", "--listen", "stdio://")
	cmd.Dir = root
	cmd.Stderr = io.Discard
	process.Configure(cmd)
	input, err := cmd.StdinPipe()
	if err != nil {
		cancel()
		return nil, err
	}
	output, err := cmd.StdoutPipe()
	if err != nil {
		input.Close()
		cancel()
		return nil, err
	}
	if err = cmd.Start(); err != nil {
		input.Close()
		cancel()
		return nil, fmt.Errorf("could not start Codex App Server; install Codex CLI and check PATH")
	}
	c := &client{ctx: ctx, cancel: cancel, cmd: cmd, input: input, pending: map[string]chan wireMessage{}, done: make(chan struct{})}
	go func() {
		scanner := bufio.NewScanner(output)
		scanner.Buffer(make([]byte, 64<<10), 4<<20)
		var failure error
		for scanner.Scan() {
			var message wireMessage
			if json.Unmarshal(scanner.Bytes(), &message) != nil {
				failure = fmt.Errorf("invalid Codex App Server message")
				break
			}
			if message.Method == "" && len(message.ID) > 0 {
				c.mu.Lock()
				ch := c.pending[string(message.ID)]
				c.mu.Unlock()
				if ch != nil {
					ch <- message
				}
				continue
			}
			if err := receive(c, message); err != nil {
				failure = err
				break
			}
		}
		if failure == nil {
			failure = scanner.Err()
		}
		if failure == nil {
			failure = fmt.Errorf("Codex App Server disconnected; check Codex CLI version and login, then retry")
		}
		c.mu.Lock()
		c.err = failure
		c.mu.Unlock()
		cancel()
		input.Close()
		_ = cmd.Wait()
		close(c.done)
	}()
	return c, nil
}
func (c *client) send(value any) error {
	c.writeMu.Lock()
	defer c.writeMu.Unlock()
	return json.NewEncoder(c.input).Encode(value)
}
func (c *client) call(ctx context.Context, method string, params any, target any) error {
	c.mu.Lock()
	c.sequence++
	id := c.sequence
	key := fmt.Sprint(id)
	ch := make(chan wireMessage, 1)
	c.pending[key] = ch
	c.mu.Unlock()
	defer func() { c.mu.Lock(); delete(c.pending, key); c.mu.Unlock() }()
	if err := c.send(map[string]any{"id": id, "method": method, "params": params}); err != nil {
		return err
	}
	select {
	case response := <-ch:
		if response.Error != nil {
			return fmt.Errorf("Codex %s: %s", method, events.Redact(response.Error.Message))
		}
		if target != nil {
			return json.Unmarshal(response.Result, target)
		}
		return nil
	case <-ctx.Done():
		return ctx.Err()
	case <-c.done:
		c.mu.Lock()
		defer c.mu.Unlock()
		return c.err
	}
}
func (c *client) close() { c.cancel(); c.input.Close(); <-c.done }
