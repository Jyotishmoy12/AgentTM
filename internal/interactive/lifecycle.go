package interactive

import (
	"context"
	"time"
)

func (m *Manager) Stop() {
	m.mu.Lock()
	rpc, thread, turn, cancel, done := m.rpc, m.thread, m.turn, m.cancel, m.done
	running := m.state.Running
	m.mu.Unlock()
	if !running || cancel == nil {
		return
	}
	if rpc == nil || thread == "" || turn == "" {
		cancel()
		return
	}
	ctx, finish := context.WithTimeout(context.Background(), 5*time.Second)
	err := rpc.call(ctx, "turn/interrupt", map[string]any{"threadId": thread, "turnId": turn}, nil)
	finish()
	if err != nil {
		cancel()
		return
	}
	go func() {
		select {
		case <-done:
		case <-time.After(5 * time.Second):
			cancel()
		}
	}()
}

func (m *Manager) Shutdown() {
	m.Stop()
	m.mu.Lock()
	done := m.done
	m.mu.Unlock()
	if done != nil {
		<-done
	}
}
