//go:build windows

package main

import (
	"context"
	"errors"
	"testing"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func TestNativeConfirmationRequiresWindowsYesAndDefaultsToNo(t *testing.T) {
	failed := errors.New("dialog unavailable")
	for _, tc := range []struct {
		answer string
		err    error
		want   bool
	}{
		{"Yes", nil, true}, {"No", nil, false}, {"Cancel", nil, false},
		{"", nil, false}, {"Restore", nil, false}, {"Initialize", nil, false},
		{"Error", nil, false}, {"Yes", failed, false},
	} {
		t.Run(tc.answer+":"+stringBool(tc.err != nil), func(t *testing.T) {
			ctx := context.WithValue(context.Background(), struct{}{}, "test")
			got, err := confirmNativeAction(ctx, "Confirm test action?", "Disposable destination", func(received context.Context, options runtime.MessageDialogOptions) (string, error) {
				if received != ctx || options.Title != "Confirm test action?" || options.Message != "Disposable destination" {
					t.Fatal("confirmation context changed")
				}
				if options.Type != runtime.QuestionDialog || options.DefaultButton != "No" || options.CancelButton != "No" || len(options.Buttons) != 0 {
					t.Fatal("unsafe or unsupported Windows confirmation options")
				}
				return tc.answer, tc.err
			})
			if got != tc.want || !errors.Is(err, tc.err) {
				t.Fatalf("confirmation = %v, %v; want %v, %v", got, err, tc.want, tc.err)
			}
		})
	}
}

func stringBool(value bool) string {
	if value {
		return "error"
	}
	return "ok"
}
