package server

import (
	"context"
	"fmt"
	"testing"

	"agenttm/internal/capture"
	"agenttm/internal/events"
	"agenttm/internal/storage"
)

func TestOperationsAPI(t *testing.T) {
	f := setup(t)
	o := capture.New(f.app.Engine, f.session, true)
	for _, item := range []string{"one", "two"} {
		for _, kind := range []string{"item.started", "item.completed"} {
			r := events.Normalize([]byte(fmt.Sprintf(`{"type":%q,"item":{"id":%q,"type":"file_change","status":"completed"}}`, kind, item)), 65536, "")
			id, err := f.app.Engine.Store.AppendID(f.session, r.Kind, r.Tool, r.Call, r.Payload)
			if err != nil {
				t.Fatal(err)
			}
			if err = o.Observe(context.Background(), r, id); err != nil {
				t.Fatal(err)
			}
		}
	}
	path := "/api/sessions/" + f.session + "/operations"
	w := request(f.app, "GET", path+"?limit=1", nil)
	if w.Code != 200 {
		t.Fatal(w.Body.String())
	}
	b := body(t, w)
	items := b["items"].([]any)
	if len(items) != 1 || b["next_cursor"] == nil {
		t.Fatal(b)
	}
	op := items[0].(map[string]any)
	if op["capture_status"] != "partial" || op["after_checkpoint_id"] == "" {
		t.Fatal(op)
	} // fixture excludes .env
	w = request(f.app, "GET", fmt.Sprintf("%s?limit=1&cursor=%.0f", path, b["next_cursor"].(float64)), nil)
	if w.Code != 200 || body(t, w)["next_cursor"] != nil {
		t.Fatal(w.Body.String())
	}
	for _, suffix := range []string{"?cursor=-1", "?limit=0", "?limit=100"} {
		if w = request(f.app, "GET", path+suffix, nil); w.Code != 400 {
			t.Fatal(w.Code)
		}
	}
	if w = request(f.app, "GET", "/api/sessions/"+storage.ID()+"/operations", nil); w.Code != 404 {
		t.Fatal(w.Code)
	}
}
