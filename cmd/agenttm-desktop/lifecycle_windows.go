//go:build windows

package main

import (
	"context"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (d *Desktop) startup(ctx context.Context) { d.ctx = ctx }

func (d *Desktop) domReady(ctx context.Context) {
	d.mu.Lock()
	pending := d.pendingProject != ""
	d.mu.Unlock()
	if !pending {
		return
	}
	opened, err := d.ChooseProject()
	if err != nil {
		_, _ = runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
			Type: runtime.ErrorDialog, Title: "Could not open project", Message: err.Error(),
		})
	} else if opened {
		runtime.WindowReload(ctx)
	}
}

func (d *Desktop) shutdown(context.Context) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.chat.Shutdown()
	if d.engine != nil {
		d.engine.Store.DB.Close()
	}
}
