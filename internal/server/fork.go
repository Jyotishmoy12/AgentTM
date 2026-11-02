package server

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"mime"
	"net/http"
	"time"

	"agenttm/internal/fork"
)

func (s *Server) fork(w http.ResponseWriter, r *http.Request, id string) {
	service := fork.Service{Engine: s.Engine}
	if r.Method == http.MethodGet {
		plan, err := service.Preview(r.Context(), id, r.URL.Query().Get("name"))
		if err != nil {
			status := 400
			if fork.IsConflict(err) {
				status = 409
			}
			fail(w, status, "fork_plan_failed", err.Error())
			return
		}
		writeJSON(w, 200, plan)
		return
	}
	contentType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || contentType != "application/json" {
		fail(w, 415, "json_required", "Fork confirmation requires application/json.")
		return
	}
	var input struct {
		Name         string `json:"name"`
		AllowPartial bool   `json:"allow_partial"`
		Confirmed    bool   `json:"confirmed"`
	}
	body := http.MaxBytesReader(w, r.Body, 4096)
	defer body.Close()
	decoder := json.NewDecoder(body)
	decoder.DisallowUnknownFields()
	if err = decoder.Decode(&input); err == nil {
		var extra any
		if e := decoder.Decode(&extra); e != io.EOF {
			err = errors.New("expected a single JSON object")
		}
	}
	if err != nil {
		var limit *http.MaxBytesError
		if errors.As(err, &limit) {
			fail(w, 413, "request_limit", "Fork request exceeds 4 KiB.")
		} else {
			fail(w, 400, "invalid_json", "Invalid fork request; provide name, allow_partial and confirmed only.")
		}
		return
	}
	if !input.Confirmed {
		fail(w, 400, "confirmation_required", "Confirm the destination in the fork dialog before creating a worktree.")
		return
	}
	if !fork.ValidName(input.Name) {
		fail(w, 400, "invalid_name", "Invalid fork name; use 1..64 lowercase letters, digits, underscores or hyphens.")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Minute)
	defer cancel()
	result, err := service.Create(ctx, id, input.Name, input.AllowPartial)
	if err != nil {
		status := 500
		if fork.IsConflict(err) {
			status = 409
		}
		fail(w, status, "fork_failed", err.Error())
		return
	}
	writeJSON(w, 201, result)
}
