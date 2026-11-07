package server

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"time"

	"agenttm/internal/snapshot"
)

func Serve(ctx context.Context, engine *snapshot.Engine, version string, port int, ready func(string)) error {
	if port < 0 || port > 65535 {
		return fmt.Errorf("port must be 0..65535")
	}
	listener, err := net.Listen("tcp", net.JoinHostPort("127.0.0.1", strconv.Itoa(port)))
	if err != nil {
		return fmt.Errorf("cannot start local UI: %w; try --port 7332", err)
	}
	address := listener.Addr().String()
	app := New(engine, version, address)
	srv := &http.Server{Handler: app, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second, WriteTimeout: 6 * time.Minute, IdleTimeout: 60 * time.Second, MaxHeaderBytes: 16 << 10}
	stopped := make(chan struct{})
	defer close(stopped)
	go func() {
		select {
		case <-ctx.Done():
			shutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			_ = srv.Shutdown(shutdown)
		case <-stopped:
		}
	}()
	if ready != nil {
		ready("http://" + address)
	}
	err = srv.Serve(listener)
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return err
}
