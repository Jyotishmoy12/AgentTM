package server

import (
	"fmt"
	"net/http"
	"strconv"
)

func queryInt(r *http.Request, name string, def, max int) (int, error) {
	v := r.URL.Query().Get(name)
	if v == "" {
		return def, nil
	}
	n, err := strconv.Atoi(v)
	if err != nil || n < 0 || n > max {
		return 0, fmt.Errorf("invalid %s (0..%d)", name, max)
	}
	return n, nil
}
func cursor(r *http.Request) (int64, error) {
	v := r.URL.Query().Get("cursor")
	if v == "" {
		return 0, nil
	}
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil || n < 0 {
		return 0, fmt.Errorf("cursor must be a nonnegative integer")
	}
	return n, nil
}
