package maintenance

import (
	"fmt"

	"agenttm/internal/operation"
	"agenttm/internal/storage"
)

func Quiesce(root string, s *storage.Store) (func(), error) {
	var releases []func()
	release := func() {
		for i := len(releases) - 1; i >= 0; i-- {
			releases[i]()
		}
	}
	for _, name := range []string{"maintenance", "recording", "snapshot"} {
		unlock, err := operation.Acquire(root, name)
		if err != nil {
			release()
			return nil, err
		}
		releases = append(releases, unlock)
	}
	var active int
	if err := s.DB.QueryRow("SELECT count(*) FROM sessions WHERE status='active'").Scan(&active); err != nil {
		release()
		return nil, err
	}
	if active > 0 {
		release()
		return nil, fmt.Errorf("finish or diagnose active recordings before maintenance")
	}
	return release, nil
}
