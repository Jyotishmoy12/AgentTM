//go:build windows

package main

import (
	"context"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func confirmNativeAction(ctx context.Context, title, message string, show func(context.Context, runtime.MessageDialogOptions) (string, error)) (bool, error) {
	answer, err := show(ctx, runtime.MessageDialogOptions{
		Type: runtime.QuestionDialog, Title: title, Message: message,
		DefaultButton: "No", CancelButton: "No",
	})
	return err == nil && answer == "Yes", err
}
