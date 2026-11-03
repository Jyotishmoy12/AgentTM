# Agent Time Machine (AgentTM)

A local debugging tool that records managed Codex sessions and workspace checkpoints so you can inspect changes and restore earlier files into an isolated Git worktree.

**Public source, proprietary license.** This repository remains public, but
AgentTM is not offered under an open-source license. See [LICENSE](LICENSE) for
official binary-use permissions and restrictions on original implementation reuse.
Third-party licenses and GitHub's public-repository terms remain in force. See
[licensing details](docs/licensing.md).

![AgentTM overview with recorded sessions and sidebar navigation](docs/images/overview.png)

## What AgentTM does

Run Codex through AgentTM, inspect the recorded timeline and historical files, then
restore a checkpoint into a separate working copy when needed. AgentTM complements
Git; it does not replace commits, branches, or code review.

**Start here:** [install the CLI](#installation), then follow the [Quick Start](#quick-start).
For a complete walkthrough, read the **[User guide: record, inspect, and restore](docs/user-guide.md)**.
Get the [latest release](https://github.com/Jyotishmoy12/AgentTM/releases/latest).

## Current features

| Feature | CLI / browser dashboard | Native Windows desktop preview |
| --- | --- | --- |
| Managed Codex execution, sanitized supported events, session timeline | ✅ | ✅ |
| Baseline/final and supported operation-boundary workspace observations | ✅ | ✅ |
| Historical file browser, parent diffs, isolated worktree restoration | ✅ | ✅ |
| SHA-256 content deduplication and integrity diagnostics | ✅ | ✅ |
| Session purge and explicit unreferenced-blob cleanup | ✅ CLI | ✅ |
| Interactive Codex chat, model discovery, supported approval prompts | — | ✅ |
| Explicit continuation of a saved Codex conversation | — | ✅ |
| Passphrase-encrypted history backup and restore | — | ✅ |

This table describes the current implementation. Check the selected release's
notes and Assets for the features and binaries it includes. The native desktop
preview uses a separate ZIP when provided; CLI archives contain the browser
dashboard. See the dated [launch audit](docs/launch-audit.md) for verified results
and platform gaps; historical audit results do not describe every later release.

<details>
<summary>More screenshots: timeline, desktop chat, and storage</summary>

These screenshots use demo/test data; they illustrate the interface rather than
evidence of a real model execution.

![Recorded session timeline and tool activity](docs/images/session-timeline.png)

![Windows desktop Codex chat](docs/images/codex-chat.png)

![Desktop encrypted backups and blob cleanup](docs/images/storage-backups.png)

</details>

## Installation

### Prerequisites

- **Git 2.42+** and a **Git working tree**. Run `git init` in a new project if needed; an initial commit is not required for recording.
- An **installed, authenticated Codex CLI** for recording. Follow the [official Codex setup guide](https://developers.openai.com/codex/cli), then run `codex login` and `codex login status`.
- Prebuilt CLI archives exist for Windows, Linux, and macOS, on amd64 and arm64. Native runtime validation on this audit host covers **Windows amd64**; other platforms require native validation.
- **Go and Node.js are not required to run the prebuilt CLI or its embedded React dashboard.** Installing Codex has its own prerequisites.

### Download the correct archive

Open [Latest release → Assets](https://github.com/Jyotishmoy12/AgentTM/releases/latest).
Download your archive and [SHA256SUMS](https://github.com/Jyotishmoy12/AgentTM/releases/latest/download/SHA256SUMS)
into a new empty folder. For a CLI installation, also download the installer for
your OS. The native desktop ZIP is portable and does **not** use `install.ps1`.
Keep the files from the **same release**. `VERSION` below means the version shown on that release;
match the filename listed in Assets rather than using `VERSION` literally.

| Device | CLI archive filename |
| --- | --- |
| Windows Intel/AMD 64-bit | `agenttm_VERSION_windows_amd64.zip` |
| Windows ARM64 | `agenttm_VERSION_windows_arm64.zip` |
| macOS Apple silicon | `agenttm_VERSION_darwin_arm64.tar.gz` |
| macOS Intel | `agenttm_VERSION_darwin_amd64.tar.gz` |
| Linux Intel/AMD 64-bit | `agenttm_VERSION_linux_amd64.tar.gz` |
| Linux ARM64 | `agenttm_VERSION_linux_arm64.tar.gz` |

**Source code** ZIP/tar downloads contain the repository, not a prebuilt application.
CLI archives do not contain the native desktop app. If the selected release
provides it, download `agenttm-desktop_VERSION_windows_amd64.zip` separately.

### Windows desktop app

Use this section if you downloaded `agenttm-desktop_VERSION_windows_amd64.zip`.
Verify its hash against the matching entry in SHA256SUMS, then extract it.
The extracted folder contains **AgentTM.exe** and **agenttm-cli.exe**. It does
not contain `install.ps1`; do not run the CLI installer instructions below inside it.

Open PowerShell **inside the extracted desktop folder**. Save its location, then
switch to the Git project you want to use:

~~~powershell
$appDir = (Get-Location).Path
Set-Location 'C:\path\to\your\git-project'
& (Join-Path $appDir 'agenttm-cli.exe') init
& (Join-Path $appDir 'AgentTM.exe')
~~~

Replace the example project path with your actual Git working tree. For a first
test in a new disposable project instead, use the complete example in the
[desktop setup guide](docs/desktop-onboarding.md#try-the-downloaded-desktop-app).
WebView2 is required. The app uses the working directory to select a project;
it does not yet provide a project picker before startup. The helper's command
name is `agenttm-cli.exe`; extracting this ZIP does not add `agenttm` to PATH.

### Windows CLI and browser dashboard

Use this section for `agenttm_VERSION_windows_amd64.zip` or its ARM64 equivalent,
**not** the `agenttm-desktop_...zip`. Keep the CLI ZIP unextracted beside the
separately downloaded installer and SHA256SUMS.

Also download [install.ps1](https://github.com/Jyotishmoy12/AgentTM/releases/latest/download/install.ps1).
Open PowerShell **in the download folder**. The command below selects the single
downloaded Windows CLI archive, regardless of its version:

~~~powershell
Unblock-File -LiteralPath ./install.ps1
$archives = @(Get-ChildItem -File -Filter 'agenttm_*_windows_*.zip')
if ($archives.Count -ne 1) { throw 'Keep exactly one Windows CLI archive in this folder.' }
./install.ps1 -Archive $archives[0].FullName -ChecksumFile ./SHA256SUMS -AddToPath
agenttm version
~~~

Choose the correct architecture from the table above. The installer verifies the archive checksum
and installs to `%LOCALAPPDATA%\AgentTM\bin`. Open a new terminal in other apps
to pick up PATH changes. An existing installation is refused; add `-Force` for
an explicit upgrade. Close any running AgentTM process before upgrading.

If script execution remains blocked, compare `Get-FileHash ARCHIVE -Algorithm SHA256`
with its entry in `SHA256SUMS`, extract the ZIP, and invoke `agenttm.exe` by its
full path. See [installation troubleshooting](docs/installation.md).

### macOS and Linux

Also download [install.sh](https://github.com/Jyotishmoy12/AgentTM/releases/latest/download/install.sh).
In the download folder, select your platform's archive; this Linux amd64 example
finds its version automatically. Change the filename pattern for macOS or ARM64:

~~~sh
set -- ./agenttm_*_linux_amd64.tar.gz
if [ "$#" -eq 1 ] && [ -f "$1" ]; then
  sh install.sh "$1" "$HOME/.local/bin" &&
    export PATH="$HOME/.local/bin:$PATH" &&
    agenttm version
else
  printf '%s\n' 'Keep exactly one matching CLI archive in this folder.' >&2
fi
~~~

The installer verifies SHA-256 and sets executable permissions. Add
`~/.local/bin` to your shell's PATH configuration for future terminals.
Existing executables are not overwritten; move the old executable aside before
upgrading. Neither installer downloads Git or Codex.

## Quick Start

For the native Windows app, follow [desktop launch](#windows-desktop-app) above,
then use **Chat with Codex**. The commands below use the separately installed CLI.

From the Git project you want to inspect, after installation and Codex login:

~~~sh
agenttm init
agenttm codex doctor
agenttm run codex -- "Explain this project"
agenttm ui
~~~

Open the printed `http://127.0.0.1:7331` URL if the browser does not open.
Keep the terminal running; Ctrl+C stops the server. Choose **Sessions**, open a
recording, then inspect **Timeline**, **Operations**, **Files**, or **Changes**.

For a coding task, explicitly choose project-write permissions if needed:

~~~sh
agenttm run codex --sandbox workspace-write --snapshot-after-tool=true -- "Implement a small function and test it."
~~~

Codex's existing rules and approval policy still apply. Model access varies by
account; pass `--model MODEL_ID` when you need an explicit available model.
The greeting/explanation workflow may produce no file changes.

**Troubleshooting**

| Problem | Next step |
| --- | --- |
| Codex executable not found | Check `codex --version` in this terminal and its PATH. In desktop Model settings, choose the executable directly. |
| Authentication not ready | Run `codex login`, then `codex login status` and `agenttm codex doctor`. |
| Model access error | Select a model available to your account; a catalog entry does not guarantee access. |
| Port 7331 occupied | Run `agenttm ui --port 7332` or `agenttm ui --port 0`. |
| Installation permission error | Use a directory you own; the default Windows install is per-user. Close the app before replacing it. |
| Windows command not found after install | Open a fresh terminal, or invoke `$env:LOCALAPPDATA\AgentTM\bin\agenttm.exe` with PowerShell's `&` operator. |
| Checksum mismatch | Stop installation. Re-download the archive and `SHA256SUMS` from the same release; do not bypass the check. |

Next: **[follow the user guide](docs/user-guide.md)** for a hands-on example,
dashboard navigation, checkpoint inspection, restoration, and desktop chat.
All commands and flags: [CLI reference](docs/cli.md).
Recovery and installation details: [installation guide](docs/installation.md).

## How checkpoint recording works

AgentTM captures a baseline before a managed run and a final observation after
exit, including cancellation when cleanup succeeds. With
`capture.snapshot_after_tool` enabled, supported command execution, file change,
MCP, and dynamic tool notifications trigger boundary observations.

Each supported completion gets a distinct after checkpoint, including no-op
operations; identical file contents share SHA-256 blobs. Before observations may
reuse an identical state. Two scans at a boundary help detect concurrent changes,
but do not guarantee atomicity. Missing starts, overlaps, omissions, and capture
failures remain visible rather than being filled in with invented history.

Notifications do not pause Codex. An edit can already have occurred when its start
notification is processed. Checkpoints associate observed states with activity;
they do **not** establish causal line attribution.

**Fork checkpoint** restores eligible captured files into `.agenttm/worktrees/`
without replacing the source workspace. It does not rewind Codex's conversation,
restore external services, or execute captured code. See [checkpoint guarantees](docs/granular-checkpoints.md)
and [restore safety](docs/fork-and-recovery.md).

## CLI and desktop availability

- **CLI releases:** platform archives with the React dashboard embedded in the Go
  executable. `agenttm ui` serves it locally; `agenttm desktop` also opens a browser.
- **Native Windows desktop preview:** Wails/WebView2 app built from source. Requires
  the [Microsoft Edge WebView2 Evergreen Runtime](https://developer.microsoft.com/microsoft-edge/webview2/).
  Look for `agenttm-desktop_VERSION_windows_amd64.zip` in the selected release's
  Assets. If it is absent, that release does not provide a native desktop binary.
- **Desktop first-run limitation:** launch from an already initialized Git working
  directory. A project picker before startup is not implemented. Double-clicking
  the executable in Downloads is not a complete onboarding flow.
- **Desktop signing:** the preview is unsigned. Windows reputation warnings may
  occur; checksums do not provide publisher signing or guarantee SmartScreen acceptance.

Build instructions and portable preview usage: [desktop onboarding](docs/desktop-onboarding.md).

## Limitations and privacy

- Captures only AgentTM-managed Codex runs/chat, not external sessions or every
  child-agent action. Additional coding agents are not integrated.
- Scans cover eligible tracked and nonignored untracked files. Exclusions and size
  limits can produce partial snapshots. No deterministic execution replay or
  identical AI reasoning is promised.
- Stored events use an allowlist, payload limits, and best-effort credential
  redaction. Reasoning text and raw stderr are not retained. Prompt storage
  defaults to metadata only; fragments can still appear in tool output.
- **Snapshot file bytes are not content-redacted.** Filename exclusions are not
  a guarantee that all embedded secrets are excluded. Review data before sharing.
- SQLite, manifests, and blobs stay in your project's `.agenttm` directory.
  The browser server binds to loopback and validates requests. AgentTM implements
  no telemetry or cloud sync. Codex sends prompts and context to its configured
  service: the whole product is **not offline**.
- Desktop encrypted backups exclude Git history, live project files, restored
  worktrees, and Codex credentials/thread history. Continue requires Codex's own
  saved thread and account access.
- Blob cleanup is explicit, preserves referenced objects, and stops on unsafe
  storage or active recordings. Force-killed runs can leave pending records or
  locks; run `agenttm doctor` before attempting recovery.

Details: [snapshot exclusions and limits](docs/snapshots.md),
[chat and storage](docs/chat-and-storage.md), [UI/API](docs/ui.md).

## Architecture

~~~text
Codex CLI JSONL / desktop App Server
             |
     sanitized session events ---> SQLite index and operation ledger
             |
     workspace scans ------------> immutable manifests + SHA-256 file blobs
             |
     Go API + embedded React UI --> inspect history / restore isolated Git worktree
~~~

The Windows desktop wraps the same UI and Go services with Wails/WebView2.
Git remains the source of repository identity and isolated worktree support.

## Development and testing

Go 1.25+ and Git are required to build the CLI. Node.js 24+ is needed to rebuild
frontend assets; checked-in embedded assets permit a Go-only CLI build.
Public visibility does not grant general source reuse or modification permission;
the commands below document the maintainer build process. Obtain permission for
source uses not already allowed by applicable law or GitHub's terms.

~~~powershell
git clone https://github.com/Jyotishmoy12/AgentTM.git
Set-Location AgentTM
go test ./...
go vet ./...
node scripts/check-docs.mjs
Set-Location web
npm.cmd ci
npm.cmd test
npm.cmd run build
~~~

See [development and release validation](docs/development.md) for build commands,
native desktop packaging, browser tests, and manual release gates. No release
is published just by running tests or building locally.

## Roadmap

Planned, not implemented: causal code provenance, checkpoint-based agent
conversation forks, additional agent integrations, retry/performance analysis,
and cloud sync. Existing conversation continuation is explicit, not an unattended loop.

## AgentTM compared with Git

AgentTM works alongside Git. Keep using Git for reviewed commits, branches,
collaboration, and durable project history.

This table describes the current source, including the Windows desktop preview.
Older published release binaries may contain fewer features.

| Feature | Git | AgentTM |
| --- | --- | --- |
| 1. Track source code changes | ✅ | ✅ |
| 2. View historical file versions | ✅ | ✅ |
| 3. Compare code differences | ✅ | ✅ |
| 4. Restore previous code states | ✅ | ✅ |
| 5. Record execution history for AgentTM-managed Codex sessions | ❌ | ✅ |
| 6. Capture supported tool-call events reported by Codex | ❌ | ✅ Sanitized, bounded records |
| 7. Track commands reported in supported Codex execution events | ❌ | ✅ Managed recordings only |
| 8. Record supported Codex session events | ❌ | ✅ Managed CLI runs and desktop chat |
| 9. Associate checkpoints with received agent activity | ❌ | ✅ Observational links, not causal attribution |
| 10. Capture eligible workspace files without commits | Not automatically | ✅ When capture is enabled; scan-time observations, not atomic snapshots |
| 11. Visualize recorded agent event timelines | ❌ | ✅ |
| 12. Restore checkpoints into isolated worktrees | ✅ Manually | ✅ Integrated |
| 13. Record reported agent failures and recording interruptions | ❌ | ✅ Events and status; no automatic root-cause diagnosis |
| 14. Identify which agent action introduced a specific line | ❌ | 🔜 Planned |
| 15. Fork and continue an agent session from a checkpoint | ❌ | 🔜 Planned |
| 16. Support multiple AI coding agents | N/A | 🔜 Planned |
| 17. Analyze agent retries and performance | ❌ | 🔜 Planned |
| 18. Reproduce identical AI reasoning | ❌ | ❌ |

Agent-related comparisons refer to built-in agent execution recording. Git's
`blame` provides commit/line history, not causal attribution to an agent tool call.
AgentTM coverage applies to supported operations in managed recordings; checkpoints
remain workspace observations, and planned features are not currently implemented.

## License and feedback

AgentTM's original implementation is proprietary, not open source. The
[proprietary license](LICENSE) permits personal and internal business use of
official binaries and installation/backup copies. Original source reuse,
redistribution, resale, and third-party hosted services require separate written
permission, subject to applicable law and existing rights. [NOTICE](NOTICE) and
the release archives preserve third-party licensing; these terms do not claim
ownership of dependencies or user project data.

Licensing does not make publicly exposed code or bundled frontend JavaScript
impossible to copy. The repository remains public, including its implementation
history and GitHub-generated source archives. GitHub users can view and fork it
under GitHub's terms. A proprietary notice restricts reuse permissions subject to
those terms and applicable law; it does not provide technical copy protection or
revoke existing rights.

Report bugs and feature requests through
[Issues](https://github.com/Jyotishmoy12/AgentTM/issues) with sanitized reproduction
steps. Original implementation contributions require a separate agreement with
the owner; public source-code pull requests are not the contribution model.
Do not include credentials, private recordings, or raw model streams.
