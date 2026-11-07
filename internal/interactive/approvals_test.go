package interactive

import (
	"bytes"
	"context"
	"encoding/json"
	"strings"
	"testing"
)

type approvalOutput struct{ bytes.Buffer }

func (*approvalOutput) Close() error { return nil }

func TestApprovalRequestsRetainPreviewAndBoundPendingQueue(t *testing.T) {
	m := &Manager{}
	message := wireMessage{ID: json.RawMessage(`90`), Method: "item/fileChange/requestApproval", Params: json.RawMessage(`{"itemId":"edit","grantRoot":"project"}`)}
	if err := m.request(nil, message, map[string]string{"edit": "proposed change"}); err != nil {
		t.Fatal(err)
	}
	a := m.Status().Approvals[0]
	if a.Command != "proposed change" || a.Directory != "project" || string(a.rawID) != "90" {
		t.Fatalf("incorrect approval: %+v", a)
	}
	if err := m.request(nil, message, nil); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(m.Status().Approvals[1].Command, "unavailable") {
		t.Fatal("missing preview did not explain limitation")
	}
	for len(m.Status().Approvals) < 32 {
		if err := m.request(nil, message, nil); err != nil {
			t.Fatal(err)
		}
	}
	if err := m.request(nil, message, nil); err == nil || len(m.Status().Approvals) != 32 {
		t.Fatal("approval queue limit was not preserved")
	}
}

func TestUnsupportedRequestsNeverGrantPermissions(t *testing.T) {
	for _, method := range []string{"item/permissions/requestApproval", "mcpServer/elicitation/request", "unsupported/request"} {
		t.Run(method, func(t *testing.T) {
			var output approvalOutput
			m := &Manager{}
			err := m.request(&client{input: &output}, wireMessage{ID: json.RawMessage(`"request"`), Method: method}, nil)
			if err != nil {
				t.Fatal(err)
			}
			var response struct {
				ID     string `json:"id"`
				Result struct {
					Permissions map[string]any `json:"permissions"`
					Action      string         `json:"action"`
				} `json:"result"`
				Error struct {
					Code int `json:"code"`
				} `json:"error"`
			}
			if err := json.Unmarshal(output.Bytes(), &response); err != nil || response.ID != "request" {
				t.Fatalf("invalid reply: %s, %v", output.Bytes(), err)
			}
			if method == "item/permissions/requestApproval" && len(response.Result.Permissions) != 0 {
				t.Fatal("unsupported permissions granted")
			}
			if method == "mcpServer/elicitation/request" && response.Result.Action != "decline" {
				t.Fatal("unsupported elicitation accepted")
			}
			if method == "unsupported/request" && response.Error.Code != -32601 {
				t.Fatal("missing unsupported-request error")
			}
		})
	}
}

func TestNotificationsUpdateDraftAndResolveMatchingApproval(t *testing.T) {
	m := &Manager{state: State{Approvals: []Approval{{ID: "first", rawID: json.RawMessage(`90`)}, {ID: "second", rawID: json.RawMessage(`91`)}}}}
	receive := m.notifications(context.Background(), "", "", nil, nil, nil)
	for _, msg := range []wireMessage{
		{Method: "item/agentMessage/delta", Params: json.RawMessage(`{"delta":"hello "}`)},
		{Method: "item/agentMessage/delta", Params: json.RawMessage(`{"delta":"password=private-value"}`)},
		{Method: "serverRequest/resolved", Params: json.RawMessage(`{"requestId":90}`)},
	} {
		if err := receive(nil, msg); err != nil {
			t.Fatal(err)
		}
	}
	state := m.Status()
	if !strings.HasPrefix(state.Draft, "hello ") || strings.Contains(state.Draft, "private-value") {
		t.Fatalf("incorrect streamed draft: %s", state.Draft)
	}
	if len(state.Approvals) != 1 || state.Approvals[0].ID != "second" {
		t.Fatalf("wrong approval resolved: %+v", state.Approvals)
	}
}
