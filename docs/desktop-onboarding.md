# Desktop onboarding preview (Windows)

Launch from an initialized AgentTM repository. The native desktop preview opens
that repository; project selection before startup and installer integration are
not implemented yet. Microsoft Edge WebView2 Evergreen Runtime is required:
https://developer.microsoft.com/microsoft-edge/webview2/

Check [Latest release → Assets](https://github.com/Jyotishmoy12/AgentTM/releases/latest)
for `agenttm-desktop_VERSION_windows_amd64.zip`. If that asset is absent, the
selected release does not provide a native desktop binary. CLI archives contain
the browser dashboard. A desktop ZIP includes AgentTM.exe and a distinctly named
agenttm-cli.exe to avoid Windows filename collisions. It is unsigned and is not
an MSI installer.

After extracting a desktop ZIP and verifying its checksum, initialize and
launch from a project using the bundled helper:

```powershell
$appDir = (Get-Location).Path # the extracted desktop ZIP folder
Set-Location 'C:\path\to\your\git-project'
& (Join-Path $appDir 'agenttm-cli.exe') init
& (Join-Path $appDir 'AgentTM.exe')
```

The maintainer build process is below. Public visibility does not grant general
source reuse or modification permission; see [licensing details](licensing.md).

```powershell
cd C:\dev\AgentTM
.\scripts\desktop.ps1
```

The first launch shows five steps: Welcome, Your workspace, Install Codex,
Sign in & verify, and First recording. The header's **Setup guide** button
reopens the guide. **Explore history for now** dismisses it without requiring
Codex. Finishing setup records a local preference; a later failed startup check
reopens the guide.

The native bridge checks executable discovery, version/JSON capability, and
`codex login status`. It discards raw diagnostic output. These checks do not
confirm model access or network connectivity. Installation and login commands
are copied for users to run themselves, never executed by the guide.

Installing Codex or changing PATH may require fully closing AgentTM and opening
it from a fresh terminal. **Check again** can observe login changes, but cannot
refresh the environment inherited by an already running process.

Installation/sign-in guidance follows the [official Codex CLI guide](https://developers.openai.com/codex/cli)
and [authentication documentation](https://developers.openai.com/codex/auth).
