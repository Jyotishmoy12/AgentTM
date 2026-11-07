package process

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"os/exec"
	"testing"
	"time"
)

func runProcessFixture(mode string) {
	if mode == "leaf" {
		time.Sleep(time.Hour)
		return
	}
	if mode == "tree" {
		child := exec.Command(os.Args[0])
		child.Env = append(os.Environ(), "AGENTTM_PROCESS_HELPER=leaf")
		HideWindow(child)
		if err := child.Start(); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		fmt.Println(child.Process.Pid)
		_ = child.Wait()
		return
	}
	fmt.Println("ready")
	time.Sleep(time.Hour)
}

func startProcessFixture(t *testing.T, mode string) (*exec.Cmd, context.CancelFunc, string) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	cmd := exec.CommandContext(ctx, os.Args[0])
	cmd.Env = append(os.Environ(), "AGENTTM_PROCESS_HELPER="+mode)
	cmd.Stderr = os.Stderr
	Configure(cmd)
	output, err := cmd.StdoutPipe()
	if err != nil {
		cancel()
		t.Fatal(err)
	}
	if err := cmd.Start(); err != nil {
		cancel()
		t.Fatal(err)
	}
	t.Cleanup(func() {
		cancel()
		if cmd.ProcessState == nil {
			_ = cmd.Wait()
		}
	})
	line, err := bufio.NewReader(output).ReadString('\n')
	if err != nil {
		t.Fatalf("process fixture did not become ready: %v", err)
	}
	return cmd, cancel, line
}
