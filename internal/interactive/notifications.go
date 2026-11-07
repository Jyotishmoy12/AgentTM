package interactive

import (
	"context"
	"encoding/json"

	"agenttm/internal/capture"
	"agenttm/internal/events"
)

func (m *Manager) notifications(ctx context.Context, session, omit string, observer *capture.Observer, completed chan string, filePreviews map[string]string) func(*client, wireMessage) error {
	return func(c *client, message wireMessage) error {
		if len(message.ID) > 0 && message.Method != "" {
			return m.request(c, message, filePreviews)
		}
		var params map[string]any
		_ = json.Unmarshal(message.Params, &params)
		if message.Method == "item/started" {
			if item, ok := params["item"].(map[string]any); ok && item["type"] == "fileChange" {
				id, _ := item["id"].(string)
				preview, _ := json.MarshalIndent(item["changes"], "", "  ")
				if len(preview) > 16384 {
					preview = append(preview[:16384], []byte("\n[preview truncated]")...)
				}
				filePreviews[id] = string(preview)
			}
		}
		if message.Method == "turn/started" {
			if turn, ok := params["turn"].(map[string]any); ok {
				id, _ := turn["id"].(string)
				m.mu.Lock()
				m.turn = id
				m.mu.Unlock()
			}
		}
		if message.Method == "serverRequest/resolved" {
			raw, _ := json.Marshal(params["requestId"])
			m.mu.Lock()
			kept := m.state.Approvals[:0]
			for _, a := range m.state.Approvals {
				if string(a.rawID) != string(raw) {
					kept = append(kept, a)
				}
			}
			m.state.Approvals = kept
			m.mu.Unlock()
			return nil
		}
		if message.Method == "item/agentMessage/delta" {
			delta, _ := params["delta"].(string)
			m.mu.Lock()
			if len(m.state.Draft)+len(delta) < 65536 {
				m.state.Draft += delta
			}
			m.mu.Unlock()
			return nil
		}
		switch message.Method {
		case "thread/started", "turn/started", "turn/completed", "item/started", "item/completed":
		default:
			return nil
		}
		r := normalize(message, m.Engine.Config.Capture.MaxEventPayloadBytes, omit)
		eventID, err := m.Engine.Store.AppendID(session, r.Kind, r.Tool, r.Call, r.Payload)
		if err != nil {
			return err
		}
		if err = observer.Observe(ctx, r, eventID); err != nil {
			return err
		}
		if message.Method == "item/completed" {
			if item, ok := params["item"].(map[string]any); ok && item["type"] == "agentMessage" {
				m.mu.Lock()
				m.state.Draft = ""
				m.mu.Unlock()
			}
		}
		if message.Method == "turn/completed" {
			status := "failed"
			if turn, ok := params["turn"].(map[string]any); ok {
				status, _ = turn["status"].(string)
				if status == "failed" {
					runError := events.Encode(turn["error"], m.Engine.Config.Capture.MaxEventPayloadBytes, omit)
					m.mu.Lock()
					m.state.Error = events.Redact(string(runError))
					m.mu.Unlock()
				}
			}
			select {
			case completed <- status:
			default:
			}
		}
		return nil
	}
}
