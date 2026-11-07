package server

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
)

func TestPaginationAndIntegrity(t *testing.T) {
	f := setup(t)
	cursor := 0
	count := 0
	for {
		w := request(f.app, "GET", "/api/sessions/"+f.session+"/events?limit=1&cursor="+strconv.Itoa(cursor), nil)
		if w.Code != 200 {
			t.Fatal(w.Body.String())
		}
		v := body(t, w)
		items := v["items"].([]any)
		count += len(items)
		if v["next_cursor"] == nil {
			break
		}
		next := int(v["next_cursor"].(float64))
		if next <= cursor {
			t.Fatal("cursor did not advance")
		}
		cursor = next
	}
	if count != 3 {
		t.Fatalf("events duplicated/lost: %d", count)
	}
	first := body(t, request(f.app, "GET", "/api/sessions/"+f.session+"/checkpoints?limit=1", nil))
	next := int(first["next_cursor"].(float64))
	second := body(t, request(f.app, "GET", "/api/sessions/"+f.session+"/checkpoints?limit=1&cursor="+strconv.Itoa(next), nil))
	if second["next_cursor"] != nil || second["items"].([]any)[0].(map[string]any)["id"] != f.final {
		t.Fatal("checkpoint paging failed")
	}
	diff := body(t, request(f.app, "GET", "/api/checkpoints/"+f.final+"/diff?limit=1", nil))
	if diff["total"] != float64(3) || len(diff["items"].([]any)) != 1 || diff["next_cursor"] == nil {
		t.Fatal("diff page unbounded")
	}

	m, e := f.app.Engine.Load(f.base)
	if e != nil {
		t.Fatal(e)
	}
	hash := strings.TrimPrefix(m.Files[0].ObjectID, "sha256:")
	if e = os.Remove(filepath.Join(f.app.Engine.Root, ".agenttm", "objects", hash[:2], hash)); e != nil {
		t.Fatal(e)
	}
	w := request(f.app, "GET", "/api/checkpoints/"+f.base+"/file?path=hello.txt", nil)
	if w.Code != 500 || body(t, w)["error"].(map[string]any)["code"] != "object_unavailable" {
		t.Fatal("missing object not reported")
	}
}
