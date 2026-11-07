package interactive

import (
	"context"
	"errors"
	"os"
	"strings"
	"testing"
	"time"
)

func TestClientProtocolFailureUnblocksCalls(t *testing.T) {
	for _, mode := range []string{"invalid-json", "disconnect"} {
		t.Run(mode, func(t *testing.T) {
			t.Setenv("AGENTTM_APP_SERVER_TEST", "1")
			t.Setenv("AGENTTM_APP_SERVER_MODE", mode)
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			rpc, err := launch(ctx, os.Args[0], t.TempDir(), func(*client, wireMessage) error { return nil })
			if err != nil {
				t.Fatal(err)
			}
			defer rpc.close()
			if err := rpc.call(ctx, "initialize", nil, nil); err == nil || errors.Is(err, context.DeadlineExceeded) {
				t.Fatalf("protocol failure did not unblock call: %v", err)
			}
			rpc.mu.Lock()
			defer rpc.mu.Unlock()
			if len(rpc.pending) != 0 {
				t.Fatalf("pending call retained: %d", len(rpc.pending))
			}
			if rpc.err == nil || (mode == "invalid-json" && !strings.Contains(rpc.err.Error(), "invalid")) {
				t.Fatalf("missing protocol diagnosis: %v", rpc.err)
			}
		})
	}
}

func TestClientCancelledCallRemovesPendingRequest(t *testing.T) {
	t.Setenv("AGENTTM_APP_SERVER_TEST", "1")
	t.Setenv("AGENTTM_APP_SERVER_MODE", "no-response")
	rpc, err := launch(context.Background(), os.Args[0], t.TempDir(), func(*client, wireMessage) error { return nil })
	if err != nil {
		t.Fatal(err)
	}
	defer rpc.close()
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := rpc.call(ctx, "initialize", nil, nil); !errors.Is(err, context.Canceled) {
		t.Fatalf("expected cancellation, got %v", err)
	}
	rpc.mu.Lock()
	defer rpc.mu.Unlock()
	if len(rpc.pending) != 0 {
		t.Fatalf("cancelled request retained: %d", len(rpc.pending))
	}
}
