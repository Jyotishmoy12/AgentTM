package interactive

import (
	"fmt"

	"agenttm/internal/events"
)

func (m *Manager) SetExecutable(executable string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.state.Running {
		return fmt.Errorf("stop the current turn before changing Codex")
	}
	m.Executable = executable
	return nil
}

func (m *Manager) ExecutablePath() string { m.mu.Lock(); defer m.mu.Unlock(); return m.Executable }

func (m *Manager) Status() State {
	m.mu.Lock()
	defer m.mu.Unlock()
	state := m.state
	state.Draft = events.Redact(state.Draft)
	state.Approvals = append([]Approval{}, m.state.Approvals...)
	return state
}
