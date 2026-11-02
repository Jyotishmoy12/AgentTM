package cli

import (
	"context"
	"flag"
	"fmt"
	"io"
	"os/exec"
	"runtime"

	"agenttm/internal/server"
	"agenttm/internal/snapshot"
)

func uiCommand(ctx context.Context, args []string, engine *snapshot.Engine, out, errOut io.Writer) (error, int) {
	flags := flag.NewFlagSet("ui", flag.ContinueOnError)
	flags.SetOutput(errOut)
	port := flags.Int("port", engine.Config.Server.Port, "loopback HTTP port (0 selects an available port)")
	noBrowser := flags.Bool("no-browser", false, "print URL without opening the browser")
	if err := flags.Parse(args); err != nil {
		return err, 2
	}
	if flags.NArg() != 0 || *port < 0 || *port > 65535 {
		return fmt.Errorf("usage: agenttm ui [--port 7331] [--no-browser]"), 2
	}
	err := server.Serve(ctx, engine, Version, *port, func(url string) {
		fmt.Fprintf(out, "AgentTM UI: %s\nLocal history and explicit isolated forks. Press Ctrl+C to stop.\n", url)
		if !*noBrowser {
			if err := openBrowser(url); err != nil {
				fmt.Fprintln(errOut, "Could not open browser automatically; open the URL above.")
			}
		}
	})
	return err, 0
}
func openBrowser(url string) error {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	if err := cmd.Start(); err != nil {
		return err
	}
	go func() { _ = cmd.Wait() }()
	return nil
}
