package interactive

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestUnknownAndReasoningFieldsAreNotRecorded(t *testing.T) {
	msg := wireMessage{Method: "item/completed", Params: json.RawMessage(`{"item":{"type":"reasoning","content":"never persist this","secret":"password"}}`)}
	r := normalize(msg, 4096, "")
	if strings.Contains(string(r.Payload), "never persist") {
		t.Fatal("reasoning leaked")
	}
}
