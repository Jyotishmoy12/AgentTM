package server

import (
	"encoding/json"
	"net/http"
)

const maxResponse = 8 << 20

func writeJSON(w http.ResponseWriter, status int, v any) {
	b, err := json.Marshal(v)
	if err != nil {
		fail(w, 500, "encoding_failed", "Could not encode response.")
		return
	}
	if len(b) > maxResponse {
		fail(w, 413, "response_limit", "Response exceeds 8 MiB; request a smaller page.")
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_, _ = w.Write(b)
}
func fail(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{"error": map[string]string{"code": code, "message": message}})
}
