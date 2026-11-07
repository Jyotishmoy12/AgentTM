package interactive

import (
	"context"
	"encoding/json"
	"fmt"

	"agenttm/internal/events"
)

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
