//go:build windows

package main

import (
	"fmt"

	"agenttm/internal/interactive"
)

func (d *Desktop) ChatStatus() interactive.State { return d.chat.Status() }

func (d *Desktop) CodexModels() ([]interactive.Model, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.engine == nil {
		return nil, fmt.Errorf("open a Git project first")
	}
	return interactive.ListModels(d.ctx, d.chat.ExecutablePath(), d.root)
}

func (d *Desktop) StartChat(session, prompt, model, sandbox string) (string, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.engine == nil {
		return "", fmt.Errorf("open a Git project first")
	}
	return d.chat.Start(d.ctx, session, prompt, model, sandbox)
}
func (d *Desktop) StopChat()                              { d.chat.Stop() }
func (d *Desktop) DecideChat(id string, allow bool) error { return d.chat.Decide(id, allow) }
