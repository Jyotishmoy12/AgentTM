# Installation and first-run troubleshooting

The [README Quick Start](../README.md#quick-start) is the shortest path. The
[latest release assets](https://github.com/Jyotishmoy12/AgentTM/releases/latest)
list the available downloads. CLI archives contain the browser dashboard; a
native desktop preview, when provided, is a separate desktop ZIP. Archive names,
installers, and SHA256SUMS must all come from the same release. Download one
platform archive into an empty folder so older versions cannot be selected accidentally.

## Windows

The default installer destination is `%LOCALAPPDATA%\AgentTM\bin`. It does not
require administrator access. `-AddToPath` updates the current PowerShell process
and your user PATH; already-open terminals and apps keep their previous environment.
Close/reopen them. If necessary, invoke the installed binary directly:

```powershell
$agenttm = Join-Path $env:LOCALAPPDATA 'AgentTM\bin\agenttm.exe'
& $agenttm version
```

Assigning a path to a variable does not install a command. Use `agenttm`, not
`agentttm`; use `& $agenttm` to invoke an executable path variable.

Run `install.ps1` from its download directory, or use its full path. If Windows
marks a downloaded script as blocked, use `Unblock-File -LiteralPath .\install.ps1`
after verifying its origin. An AllSigned or organization policy may still require
a signed installer. Do not change machine-wide policy for this tool; use manual
extraction if permitted by your organization:

```powershell
$archives = @(Get-ChildItem -File -Filter 'agenttm_*_windows_*.zip')
if ($archives.Count -ne 1) { throw 'Keep exactly one Windows CLI archive in this folder.' }
$archive = $archives[0].FullName
Get-FileHash -LiteralPath $archive -Algorithm SHA256
Get-Content -LiteralPath .\SHA256SUMS
# Compare the hash with this archive's exact manifest entry before continuing.
Expand-Archive -LiteralPath $archive -DestinationPath .\agenttm-windows
& .\agenttm-windows\agenttm.exe version
```

For an explicit upgrade, close AgentTM and rerun the installer with `-Force`.
The current source installer stages extraction before replacing the executable;
the older published v0.3.0 installer extracts directly to its destination.
Installation and upgrades do not migrate, erase, or move project history; database
migrations happen when the executable opens that project's `.agenttm` store.

The default Windows install and native desktop preview are unsigned. SHA-256
checks detect mismatches against a trusted manifest; they are not code signing.
SmartScreen/reputation warnings may still appear. Do not promise users that
Windows will accept a preview without warnings.

## Linux and macOS

`sh install.sh ARCHIVE [DIRECTORY]` verifies the archive checksum and installs one
executable with mode 0755. The default is `~/.local/bin`. Add that directory to
the PATH configuration for your shell (for example `.zshrc` for interactive zsh
or `.bashrc` for interactive bash); `export PATH=...` alone affects only that
terminal and its child processes.

The installer refuses to overwrite an executable. Move your previous binary
aside before installing a new one. Use a directory you own rather than `sudo`
when possible. Linux/macOS native execution was not tested on the Windows audit
host; archive contents, checksums, and Unix mode metadata were verified. Native
CI installation gates are configured and must pass on those platforms.

## Codex and first-run diagnostics

Run these in the same terminal you use to launch AgentTM:

```sh
codex --version
codex login status
agenttm codex doctor
```

If the executable is missing, install Codex using the
[official guide](https://developers.openai.com/codex/cli) or add its directory to
PATH, then restart the terminal. Desktop Model settings can select its executable
directly. AgentTM does not automatically install Codex or modify its global
approval policy. Authentication readiness does not prove model access or network
connectivity; run a small real task to check those separately.

If model access is rejected, pass an explicitly available `--model MODEL_ID`, or
choose another model in desktop chat. If Codex reports sandbox/helper setup
errors, diagnose Codex directly; do not bypass its sandbox or approval rules.

`agenttm doctor` checks local storage and also checks Codex readiness. It can
report healthy SQLite/snapshots and still return nonzero because Codex is absent.
Existing recorded history can still be opened with `agenttm ui`.

If port 7331 is occupied, use `agenttm ui --port 7332`, or `--port 0` to choose an
available port. For a browser launch failure, use `--no-browser` and open the
printed loopback URL yourself. Ctrl+C stops the server.

## Desktop startup

The current desktop preview uses the terminal's working directory to select a
Git project and requires `agenttm init` before startup. It is not a double-click
project chooser. See [desktop onboarding](desktop-onboarding.md) for source and
portable ZIP instructions and the WebView2 runtime requirement.
