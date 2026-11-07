package server

import (
	"context"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestQueuedRequestCancellationReleasesHandler(t *testing.T) {
	app := New(nil, "test", "127.0.0.1:7331")
	for range cap(app.slots) {
		app.slots <- struct{}{}
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	r := httptest.NewRequest("GET", "http://127.0.0.1:7331/api/health", nil).WithContext(ctx)
	w := httptest.NewRecorder()
	done := make(chan struct{})
	go func() {
		defer close(done)
		app.ServeHTTP(w, r)
	}()
	cancel()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("canceled request remained blocked waiting for an API slot")
	}
	if len(app.slots) != cap(app.slots) || w.Body.Len() != 0 {
		t.Fatal("canceled waiter consumed a slot or entered the API")
	}
}

func TestDesktopRequestsStillRequireMutationToken(t *testing.T) {
	f := setup(t)
	app := NewDesktop(f.app.Engine, "test")
	health := request(app, "GET", "/api/health", map[string]string{
		"Host": "wails.localhost", "Origin": "wails://wails.localhost",
	})
	if health.Code != 200 {
		t.Fatal(health.Body.String())
	}
	for _, token := range []string{"", "wrong", app.csrfToken} {
		r := httptest.NewRequest("POST", "/api/sessions/"+f.session+"/title", strings.NewReader(`{"title":"Desktop review"}`))
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("X-AgentTM-CSRF", token)
		w := httptest.NewRecorder()
		app.ServeHTTP(w, r)
		want := 403
		if token == app.csrfToken {
			want = 200
		}
		if w.Code != want {
			t.Fatalf("desktop mutation got %d, want %d: %s", w.Code, want, w.Body.String())
		}
	}
}
