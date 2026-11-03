package main

import "fmt"

// Archive instructions are standalone: repository-relative documentation links
// in the main README would be broken when only the release ZIP is extracted.
func releaseReadme(version string, desktop bool) []byte {
	text := fmt.Sprintf(`# AgentTM %s

Documentation: https://github.com/Jyotishmoy12/AgentTM#readme
Releases: https://github.com/Jyotishmoy12/AgentTM/releases

Requires Git 2.42+ and a Git working tree. Recording requires an installed,
authenticated Codex CLI. Go and Node.js are not required to run these binaries.
Verify this archive against SHA256SUMS from the same release before extraction.
History stays in your project's .agenttm directory. Codex sends requests to its
configured service. Snapshots are observations, not atomic or causal records.
`, version)
	if desktop {
		text += `
## Native Windows desktop preview (amd64)

AgentTM.exe is the native desktop app; agenttm-cli.exe is its bundled CLI helper.
Microsoft Edge WebView2 Evergreen Runtime is required:
https://developer.microsoft.com/microsoft-edge/webview2/
This is an unsigned portable preview, not an MSI installer or a signed release.
Windows may show a reputation warning; verify the download's origin and checksum.

Open PowerShell in the extracted folder and run:

    $appDir = (Get-Location).Path
    Set-Location 'C:\path\to\your\git-project'
    & (Join-Path $appDir 'agenttm-cli.exe') init
    & (Join-Path $appDir 'AgentTM.exe')

The current working directory selects the project. A project picker before
startup is not implemented. Double-clicking outside an initialized project
does not provide a complete first-run setup. Use the in-app Setup guide for
Codex discovery and authentication. Close the app before replacing its files.
`
	} else {
		text += `
## CLI and browser dashboard

Run agenttm.exe on Windows or ./agenttm on macOS/Linux (use its full path if
it is not on PATH). From a Git working tree:

    agenttm init
    agenttm codex doctor
    agenttm run codex -- "Explain this project"
    agenttm ui

The React dashboard is embedded in the executable. The UI binds to loopback
and opens a browser. Ctrl+C stops it. Use ui --port 7332 if 7331 is occupied.
The desktop CLI command also opens a browser; this archive is not the native
Windows desktop app. The native preview is a separate desktop archive.
`
	}
	return []byte(text)
}
