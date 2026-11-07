package snapshot

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"agenttm/internal/operation"
	"go.uber.org/goleak"
)

func TestMain(m *testing.M) {
	if root := os.Getenv("AGENTTM_CRASH_STAGE_ROOT"); root != "" {
		release, err := operation.Acquire(root, "snapshot")
		if err != nil {
			os.Exit(2)
		}
		defer release()
		data := []byte("synthetic crash-recovery object")
		hash := Hash(data)
		if _, err = stageFile(filepath.Join(root, ".agenttm", "objects", hash[:2], hash), data); err != nil {
			os.Exit(3)
		}
		fmt.Println("staged")
		time.Sleep(time.Hour)
		os.Exit(0)
	}
	goleak.VerifyTestMain(m)
}
