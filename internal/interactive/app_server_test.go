package interactive

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

func runAppServerFixture() {
	mode := os.Getenv("AGENTTM_APP_SERVER_MODE")
	if mode == "invalid-json" {
		fmt.Println("not valid json")
		return
	}
	if mode == "disconnect" {
		return
	}
	scanner := bufio.NewScanner(os.Stdin)
	waiting := false
	emit := func(v any) { b, _ := json.Marshal(v); fmt.Println(string(b)) }
	finish := func() {
		for _, method := range []string{"item/started", "item/completed"} {
			emit(map[string]any{"method": method, "params": map[string]any{"item": map[string]any{"id": "same-tool-id-each-turn", "type": "commandExecution", "status": "completed", "command": "synthetic no-op"}}})
		}
		emit(map[string]any{"method": "item/completed", "params": map[string]any{"item": map[string]any{"id": "reply", "type": "agentMessage", "text": "Hello from synthetic Codex"}}})
		emit(map[string]any{"method": "turn/completed", "params": map[string]any{"turn": map[string]any{"status": "completed"}}})
	}
	for scanner.Scan() {
		if mode == "no-response" {
			continue
		}
		var msg map[string]any
		json.Unmarshal(scanner.Bytes(), &msg)
		method, _ := msg["method"].(string)
		if method == "initialized" {
			continue
		}
		if method == "" && waiting {
			finish()
			waiting = false
			continue
		}
		result := map[string]any{}
		if method == "thread/start" || method == "thread/resume" {
			result["thread"] = map[string]any{"id": "synthetic-thread"}
		}
		if method == "model/list" {
			result["data"] = []map[string]any{
				{"model": "synthetic-model", "displayName": "Test model", "isDefault": true},
				{"model": "hidden-model", "hidden": true},
				{"model": "image-only", "inputModalities": []string{"image"}},
			}
			result["nextCursor"] = nil
		}
		if method == "turn/start" {
			result["turn"] = map[string]any{"id": "synthetic-turn"}
		}
		emit(map[string]any{"id": msg["id"], "result": result})
		if method == "turn/interrupt" {
			emit(map[string]any{"method": "turn/completed", "params": map[string]any{"turn": map[string]any{"status": "interrupted"}}})
		}
		if method == "turn/start" {
			payload, _ := json.Marshal(msg["params"])
			if strings.Contains(string(payload), "approval") {
				emit(map[string]any{"id": 90, "method": "item/commandExecution/requestApproval", "params": map[string]any{"command": "echo synthetic-test", "reason": "Test approval"}})
				waiting = true
			} else if !strings.Contains(string(payload), "cancel") {
				finish()
			}
		}
	}
	os.Exit(0)
}
