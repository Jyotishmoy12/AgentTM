package interactive

import (
	"encoding/json"
	"fmt"

	"agenttm/internal/events"
	"agenttm/internal/storage"
)

func (m *Manager) request(c *client, message wireMessage, filePreviews map[string]string) error {
	switch message.Method {
	case "item/commandExecution/requestApproval", "item/fileChange/requestApproval":
		var p struct {
			Command   string `json:"command"`
			Reason    string `json:"reason"`
			Directory string `json:"cwd"`
			Root      string `json:"grantRoot"`
			ItemID    string `json:"itemId"`
		}
		_ = json.Unmarshal(message.Params, &p)
		if p.Directory == "" {
			p.Directory = p.Root
		}
		if message.Method == "item/fileChange/requestApproval" {
			p.Command = filePreviews[p.ItemID]
			if p.Command == "" {
				p.Command = "File-change preview is unavailable. Decline and ask Codex to describe the proposed changes."
			}
		}
		m.mu.Lock()
		defer m.mu.Unlock()
		if len(m.state.Approvals) >= 32 {
			return fmt.Errorf("too many pending approval requests")
		}
		m.state.Approvals = append(m.state.Approvals, Approval{storage.ID(), message.Method, p.Command, p.Reason, p.Directory, message.ID, c})
		return nil
	case "item/permissions/requestApproval":
		return c.send(map[string]any{"id": message.ID, "result": map[string]any{"permissions": map[string]any{}, "scope": "turn"}})
	case "mcpServer/elicitation/request":
		return c.send(map[string]any{"id": message.ID, "result": map[string]any{"action": "decline", "content": nil}})
	default:
		return c.send(map[string]any{"id": message.ID, "error": map[string]any{"code": -32601, "message": "AgentTM does not support this interactive request; ask in an ordinary chat message instead"}})
	}
}

func (m *Manager) Decide(id string, allow bool) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i, a := range m.state.Approvals {
		if a.ID == id {
			decision := "decline"
			if allow {
				decision = "accept"
			}
			payload := events.Encode(map[string]any{"method": a.Method, "decision": decision}, m.Engine.Config.Capture.MaxEventPayloadBytes, "")
			if err := m.Engine.Store.Append(m.state.SessionID, "agenttm.approval.decided", "", "", payload); err != nil {
				return err
			}
			if err := a.rpc.send(map[string]any{"id": a.rawID, "result": map[string]any{"decision": decision}}); err != nil {
				return err
			}
			m.state.Approvals = append(m.state.Approvals[:i], m.state.Approvals[i+1:]...)
			return nil
		}
	}
	return fmt.Errorf("approval expired or was already answered")
}
