# Install AgentTM on Windows

[Main README](../../../README.md) · [macOS](../macos/README.md) · [Linux](../linux/README.md)

## 1. Choose desktop or CLI

| You want | Download | Continue with |
| --- | --- | --- |
| A native Windows window with Codex chat | `agenttm-desktop_VERSION_windows_amd64.zip` | [Desktop portable app](#3a-desktop-portable-app) |
| A terminal command and browser dashboard | `agenttm_VERSION_windows_amd64.zip` or `agenttm_VERSION_windows_arm64.zip` | [CLI and browser dashboard](#3b-cli-and-browser-dashboard) |

`VERSION` means the version in the release's actual filename. Do not type VERSION
literally. The native desktop ZIP is a separate download and is available only
when listed in that release's Assets. Native ARM64 desktop packaging is not provided.

Git 2.42+ is required for project operations. New recordings need an installed,
authenticated [Codex CLI](https://developers.openai.com/codex/cli). Go and Node.js
are not needed to run AgentTM's prebuilt binaries. The native desktop app also
requires [WebView2 Evergreen Runtime](https://developer.microsoft.com/microsoft-edge/webview2/).

## 2. Download and verify

1. Create a new empty download folder, such as `Downloads\AgentTM-downloads`.
2. Open [Latest release → Assets](https://github.com/Jyotishmoy12/AgentTM/releases/latest).
3. Save **one** ZIP matching your choice above into that folder.
4. Save **SHA256SUMS** from that same release into the same folder. It is a
   separate download, not a file you should expect inside the ZIP.
5. For the **CLI option only**, also save **install.ps1** from that release there.
   The desktop option does not use this installer.

The filename must be `SHA256SUMS`, not `SHA256SUMS.txt`. Do not mix downloads from
different releases. GitHub's **Source code** downloads are not prebuilt apps.

Open the download folder in File Explorer. Click its address bar, type
`powershell`, and press Enter. Use this same PowerShell window for the following
steps so saved variables remain available. Confirm the files are present:

```powershell
Get-ChildItem -File | Select-Object Name
```

You should see the ZIP and SHA256SUMS; CLI users should also see install.ps1.
If you opened an already extracted folder, go back to the folder containing the
ZIP before verifying it.

Run each command separately. Check its result before continuing; if a command
reports an error, stop and resolve it first.

**2.1 — Find the downloaded ZIP.**

```powershell
$archives = @(Get-ChildItem -File -Filter 'agenttm*.zip')
```

**2.2 — Confirm there is exactly one matching ZIP.** No output means you can continue.

```powershell
if ($archives.Count -ne 1) { throw 'Keep exactly one AgentTM ZIP in this download folder.' }
```

**2.3 — Save that ZIP for the following commands.**

```powershell
$archive = $archives[0]
```

**2.4 — Display its complete SHA-256 hash.**

```powershell
(Get-FileHash -LiteralPath $archive.FullName -Algorithm SHA256).Hash
```

**2.5 — Display the expected hash from the release manifest.**

```powershell
Get-Content -LiteralPath .\SHA256SUMS | Select-String -SimpleMatch $archive.Name
```

Compare the two 64-character hashes. They must match, ignoring letter case, and
the manifest line must name this exact ZIP. If the file or entry is missing, or
the hashes differ, stop and re-download both files from the same release.

## 3A. Desktop portable app

**Use only for `agenttm-desktop_...zip`. Skip the CLI installer section.**
The ZIP contains AgentTM.exe, agenttm-cli.exe, documentation, and notices. It
does not contain install.ps1 or another CLI ZIP. Extraction does not add a global
`agenttm` command to PATH.

### A1. Extract the verified desktop ZIP

Stay in the same PowerShell window used for verification. Use a fresh destination
if `desktop` already exists; close the app before replacing an older extraction.

```powershell
Expand-Archive -LiteralPath $archive.FullName -DestinationPath .\desktop
```

### A2. Save the extracted app folder

```powershell
$appDir = (Resolve-Path -LiteralPath .\desktop).Path
```

Already extracted the verified ZIP? Instead of A1 and A2, open PowerShell inside
that extracted folder and save its location:

```powershell
$appDir = (Get-Location).Path
```

### A3. Confirm the app files are present

```powershell
Get-ChildItem -LiteralPath $appDir -File | Select-Object Name
```

You should see **AgentTM.exe** and **agenttm-cli.exe**. If either is missing,
check that you downloaded the desktop ZIP.

### A4. Choose the launch instructions for your build

- **Build with the project picker:** follow A5 below. Source builds after v0.3.3
  include it; check your release notes for packaged availability.
- **v0.3.3:** follow [the older-build launch steps](#older-build-launch-v033)
  instead. That release does not include the picker.

### A5. Launch a build with the project picker

Double-click **AgentTM.exe** in File Explorer, or run this command:

```powershell
& (Join-Path $appDir 'AgentTM.exe')
```

In the app:

1. Click **Open a Git project** on the welcome screen.
2. Choose an existing Git project folder.
3. If asked, click **Initialize** to create local AgentTM history.
4. Continue with [your first recording](#a6-make-your-first-recording).

Cancelling keeps the welcome screen open. Invalid selections show an error and
allow another attempt. Git and WebView2 must be installed. Launching from an
already initialized Git working directory opens that project directly. Close
and reopen the app to choose a different project.

### Older-build launch (v0.3.3)

Keep the same PowerShell window open so `$appDir` remains available. Choose
**one** option below: an existing project or a new disposable demo.

**Option 1 — Open an existing Git project.**

First, change to your project. Replace the example path with its real location:

```powershell
Set-Location 'C:\path\to\your\git-project'
```

Initialize AgentTM history there. An existing valid configuration is preserved:

```powershell
& (Join-Path $appDir 'agenttm-cli.exe') init
```

Then launch the native app:

```powershell
& (Join-Path $appDir 'AgentTM.exe')
```

Continue with [your first recording](#a6-make-your-first-recording).

**Option 2 — Create a disposable demo instead.**

Save a unique demo folder path:

```powershell
$demo = Join-Path $env:TEMP ('agenttm-demo-' + [guid]::NewGuid())
```

Create that folder:

```powershell
New-Item -ItemType Directory -Path $demo | Out-Null
```

Switch into it:

```powershell
Set-Location $demo
```

Create the demo Git repository:

```powershell
git init
```

Initialize AgentTM history:

```powershell
& (Join-Path $appDir 'agenttm-cli.exe') init
```

Launch the native app:

```powershell
& (Join-Path $appDir 'AgentTM.exe')
```

In v0.3.3 the working directory selects the project. On later launches, open
PowerShell in the extracted app folder, save `$appDir` again as in A2, and repeat
the existing-project steps.

### A6. Make your first recording

1. Follow **Setup guide** to check Codex installation and authentication.
2. Open **Chat with Codex** and select an available model.
3. Begin with **Read only** and ask Codex to explain the project.
4. After the turn finishes, open **Sessions** to inspect the recording.

Choose **Allow project edits** when you intend file changes. The preview is
unsigned; Windows reputation warnings may appear. A checksum is not publisher signing.

Continue with the [user guide](../../user-guide.md#8-use-native-desktop-chat).

## 3B. CLI and browser dashboard

**Use only for `agenttm_VERSION_windows_...zip`. Skip this section for a desktop ZIP.**
Stay in the original download folder. Keep the verified CLI ZIP **unextracted**
beside install.ps1 and SHA256SUMS. The `$archive` variable is from step 2.

**B1 — Unblock the downloaded installer.**

```powershell
Unblock-File -LiteralPath .\install.ps1
```

**B2 — Install the verified CLI archive.**

```powershell
.\install.ps1 -Archive $archive.FullName -ChecksumFile .\SHA256SUMS -AddToPath
```

**B3 — Confirm the installed version.**

```powershell
agenttm version
```

The installer rechecks the checksum and installs to `%LOCALAPPDATA%\AgentTM\bin`.
`agenttm version` should report the version you downloaded. New terminals in
other apps pick up the updated user PATH; already-open terminals may not.

**B4 — Open your Git project in this terminal.** Replace the example path:

```powershell
Set-Location 'C:\path\to\your\git-project'
```

**B5 — Initialize AgentTM history.**

```powershell
agenttm init
```

**B6 — Check Codex readiness.** Resolve reported issues before recording.

```powershell
agenttm codex doctor
```

**B7 — Record your first task.** Wait for it to finish:

```powershell
agenttm run codex -- "Explain this project"
```

**B8 — Open the browser dashboard.**

```powershell
agenttm ui
```

For a new empty project, run `git init` first. The browser dashboard normally
opens at `http://127.0.0.1:7331`. Keep the terminal running; Ctrl+C stops it.
This CLI path opens a browser, not the native desktop app.

## Troubleshooting and upgrades

| Problem | Next step |
| --- | --- |
| install.ps1 missing | Desktop users do not need it. CLI users must download it separately, then open PowerShell in the download folder. |
| SHA256SUMS missing | Download it from the same release and put it beside the ZIP, not inside the extraction. |
| No ZIP matches | You may be in an extracted folder. Return to the folder containing the ZIP. |
| Script blocked | Unblock-File may resolve a downloaded-file block; organization/AllSigned policies can still require signed scripts. Use [verified manual extraction](../../installation.md#windows-cli-installation) if permitted. |
| agenttm command missing | Reopen the terminal or invoke the installed executable with `&` and its full path. Desktop's helper is named agenttm-cli.exe. |
| Codex not found | Check `codex --version` and PATH; native Model settings can choose the executable directly. |
| Port 7331 busy | Use `agenttm ui --port 7332` or `--port 0`. |

For an explicit CLI upgrade, close AgentTM and rerun the installer with `-Force`.
It otherwise refuses to overwrite an existing installation. Project history
stays under each project's `.agenttm` directory; do not delete it to upgrade.

[User guide](../../user-guide.md) · [More troubleshooting](../../installation.md) · [Main README](../../../README.md)
