package server

import (
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestServeCancellationClosesListenerAndPreservesStore(t *testing.T) {
	f := setup(t)
	ctx, cancel := context.WithCancel(context.Background())
	ready := make(chan string, 1)
	result := make(chan error, 1)
	finished := make(chan struct{})
	go func() {
		defer close(finished)
		result <- Serve(ctx, f.app.Engine, "lifecycle-test", 0, func(url string) { ready <- url })
	}()
	t.Cleanup(func() {
		cancel()
		select {
		case <-finished:
		case <-time.After(3 * time.Second):
			t.Error("server did not stop after cancellation")
		}
	})
	var url string
	select {
	case url = <-ready:
	case err := <-result:
		t.Fatalf("server stopped before readiness: %v", err)
	case <-time.After(3 * time.Second):
		t.Fatal("server never reported its bound address")
	}
	transport := &http.Transport{DisableKeepAlives: true}
	t.Cleanup(transport.CloseIdleConnections)
	client := &http.Client{Transport: transport, Timeout: 2 * time.Second}
	response, err := client.Get(url + "/api/health")
	if err != nil {
		t.Fatal(err)
	}
	data, err := io.ReadAll(response.Body)
	response.Body.Close()
	if err != nil {
		t.Fatal(err)
	}
	var health map[string]any
	if err = json.Unmarshal(data, &health); err != nil || response.StatusCode != 200 || health["version"] != "lifecycle-test" {
		t.Fatalf("unexpected live health response: %d %s (%v)", response.StatusCode, data, err)
	}
	cancel()
	select {
	case err = <-result:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Serve did not return after cancellation")
	}
	connection, err := net.DialTimeout("tcp", strings.TrimPrefix(url, "http://"), 200*time.Millisecond)
	if err == nil {
		connection.Close()
		t.Fatal("listener remains open after shutdown")
	}
	if err = f.app.Engine.Store.DB.Ping(); err != nil {
		t.Fatalf("Serve closed its caller's database: %v", err)
	}
}

func TestServeRejectsInvalidOrOccupiedPort(t *testing.T) {
	for _, port := range []int{-1, 65536} {
		if err := Serve(context.Background(), nil, "test", port, nil); err == nil {
			t.Fatalf("accepted invalid port %d", port)
		}
	}
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	called := false
	err = Serve(context.Background(), nil, "test", listener.Addr().(*net.TCPAddr).Port, func(string) { called = true })
	if err == nil || !strings.Contains(err.Error(), "try --port 7332") || called {
		t.Fatalf("occupied port result: error=%v ready=%v", err, called)
	}
}
