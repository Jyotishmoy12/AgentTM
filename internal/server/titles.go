package server

import (
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"mime"
	"net/http"

	"agenttm/internal/storage"
)

func (s *Server) renameSession(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", "POST")
		fail(w, 405, "method_not_allowed", "Use POST to name a session.")
		return
	}
	contentType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || contentType != "application/json" {
		fail(w, 415, "json_required", "Session naming requires application/json.")
		return
	}
	body := http.MaxBytesReader(w, r.Body, 2048)
	defer body.Close()
	var input sessionTitleRequest
	decoder := json.NewDecoder(body)
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&input)
	if err == nil {
		var extra any
		if decoder.Decode(&extra) != io.EOF {
			err = errors.New("expected one JSON object")
		}
	}
	if err != nil {
		var limit *http.MaxBytesError
		if errors.As(err, &limit) {
			fail(w, 413, "request_limit", "Session name request exceeds 2 KiB.")
		} else {
			fail(w, 400, "invalid_json", "Provide a single JSON object containing title only.")
		}
		return
	}
	if input.Title == nil {
		fail(w, 400, "title_required", "Provide a session name; use an empty string to reset it.")
		return
	}
	title, err := storage.ValidateSessionTitle(*input.Title)
	if err != nil {
		fail(w, 400, "invalid_title", err.Error())
		return
	}
	if err = s.Engine.Store.RenameSession(id, title); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			fail(w, 404, "not_found", "Session not found in this project.")
		} else {
			fail(w, 500, "rename_failed", "Could not save the session name.")
		}
		return
	}
	writeJSON(w, 200, map[string]string{"id": id, "title": title})
}
