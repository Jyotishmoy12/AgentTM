package interactive

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os/exec"

	"agenttm/internal/process"
)

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

func (c *client) close() { c.cancel(); c.input.Close(); <-c.done }
