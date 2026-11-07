//go:build windows

package main

import (
	"bufio"
	"encoding/json"
	"os"
)

func runDesktopCodexFixture() {
	scanner := bufio.NewScanner(os.Stdin)
	encoder := json.NewEncoder(os.Stdout)
	for scanner.Scan() {
		var message struct {
			ID     json.RawMessage `json:"id"`
			Method string          `json:"method"`
		}
		if json.Unmarshal(scanner.Bytes(), &message) != nil {
			return
		}
		if len(message.ID) == 0 {
			continue
		}
		result := map[string]any{}
		switch message.Method {
		case "thread/start":
			result["thread"] = map[string]string{"id": "desktop-test-thread"}
		case "turn/start":
			result["turn"] = map[string]string{"id": "desktop-test-turn"}
		case "model/list":
			result["data"] = []map[string]any{{"model": "desktop-test-model", "isDefault": true}}
		}
		if encoder.Encode(map[string]any{"id": message.ID, "result": result}) != nil {
			return
		}
		if message.Method == "turn/start" {
			_ = encoder.Encode(map[string]any{"method": "item/agentMessage/delta", "params": map[string]string{"delta": "fixture active"}})
		}
		if message.Method == "turn/interrupt" {
			_ = encoder.Encode(map[string]any{"method": "turn/completed", "params": map[string]any{"turn": map[string]string{"status": "interrupted"}}})
		}
	}
}
