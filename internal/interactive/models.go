package interactive

import (
	"context"
	"fmt"
	"time"
)

type Model struct {
	Model           string   `json:"model"`
	DisplayName     string   `json:"displayName"`
	IsDefault       bool     `json:"isDefault"`
	Hidden          bool     `json:"hidden"`
	InputModalities []string `json:"inputModalities"`
}

// ListModels queries Codex's current catalog without starting a thread or turn.
// The catalog is discovery, not a guarantee that every request will be accepted.
func ListModels(ctx context.Context, executable, root string) ([]Model, error) {
	ctx, cancel := context.WithTimeout(ctx, 45*time.Second)
	defer cancel()
	rpc, err := launch(ctx, executable, root, func(c *client, m wireMessage) error {
		if len(m.ID) > 0 && m.Method != "" {
			return c.send(map[string]any{"id": m.ID, "error": map[string]any{"code": -32601, "message": "model discovery does not accept interactive requests"}})
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	defer rpc.close()
	if err = rpc.call(ctx, "initialize", map[string]any{"clientInfo": map[string]any{"name": "agenttm", "title": "AgentTM", "version": "0.2.0"}}, nil); err != nil {
		return nil, err
	}
	if err = rpc.send(map[string]any{"method": "initialized", "params": map[string]any{}}); err != nil {
		return nil, err
	}
	models := []Model{}
	seen := map[string]bool{}
	var cursor *string
	for page := 0; page < 10; page++ {
		var response struct {
			Data []Model `json:"data"`
			Next *string `json:"nextCursor"`
		}
		params := map[string]any{"limit": 100, "includeHidden": false}
		if cursor != nil {
			params["cursor"] = *cursor
		}
		if err = rpc.call(ctx, "model/list", params, &response); err != nil {
			return nil, err
		}
		for _, m := range response.Data {
			if m.Hidden || m.Model == "" || len(m.Model) > 200 || seen[m.Model] {
				continue
			}
			text := len(m.InputModalities) == 0
			for _, v := range m.InputModalities {
				if v == "text" {
					text = true
				}
			}
			if !text {
				continue
			}
			seen[m.Model] = true
			if m.DisplayName == "" {
				m.DisplayName = m.Model
			}
			models = append(models, m)
		}
		if response.Next == nil {
			return models, nil
		}
		if cursor != nil && *cursor == *response.Next {
			return nil, fmt.Errorf("Codex returned a repeated model cursor")
		}
		cursor = response.Next
	}
	return nil, fmt.Errorf("Codex model catalog exceeds the supported page limit")
}
