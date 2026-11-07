package server

import (
	"strings"
	"testing"
)

func TestEventPayloadBudgetPreservesCursor(t *testing.T) {
	f := setup(t)
	session, err := f.app.Engine.Store.Start()
	if err != nil {
		t.Fatal(err)
	}
	payload := []byte(`{"text":"` + strings.Repeat("x", 700000) + `"}`)
	for i := 0; i < 6; i++ {
		if err = f.app.Engine.Store.Append(session, "test", "", "", payload); err != nil {
			t.Fatal(err)
		}
	}
	page := body(t, request(f.app, "GET", "/api/sessions/"+session+"/events?limit=200", nil))
	if len(page["items"].([]any)) != 4 || page["next_cursor"] != float64(4) {
		t.Fatal("byte budget did not create a stable continuation cursor")
	}
	page = body(t, request(f.app, "GET", "/api/sessions/"+session+"/events?limit=200&cursor=4", nil))
	if len(page["items"].([]any)) != 2 || page["next_cursor"] != nil {
		t.Fatal("byte-based pagination lost events")
	}

	if err = f.app.Engine.Store.Append(session, "test", "", "", []byte(`broken`)); err != nil {
		t.Fatal(err)
	}
	response := request(f.app, "GET", "/api/sessions/"+session+"/events?cursor=6", nil)
	if response.Code != 500 || body(t, response)["error"].(map[string]any)["code"] != "invalid_payload" {
		t.Fatal("malformed payload not rejected")
	}
}
