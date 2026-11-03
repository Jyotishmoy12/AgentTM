# Install AgentTM on macOS

[Main README](../../../README.md) · [Windows](../windows/README.md) · [Linux](../linux/README.md)

This guide installs the CLI and its embedded browser dashboard. The native desktop
preview currently targets Windows; do not download the Windows desktop ZIP for macOS.

## 1. Prerequisites and architecture

You need Git 2.42+ and a Git working tree. New recordings also need an installed,
authenticated [Codex CLI](https://developers.openai.com/codex/cli). Go and Node.js
are not required to run AgentTM's prebuilt CLI or its dashboard.

In Terminal, check your architecture:

```sh
uname -m
git --version
```

| Architecture | Download |
| --- | --- |
| `arm64` (Apple silicon) | `agenttm_VERSION_darwin_arm64.tar.gz` |
| `x86_64` (Intel / x86_64 environment) | `agenttm_VERSION_darwin_amd64.tar.gz` |

`darwin` means macOS. `VERSION` is the release's version; use the actual asset
filename rather than typing VERSION literally.

## 2. Download the three files

Create a new empty folder, such as `Downloads/AgentTM-downloads`. From
[Latest release → Assets](https://github.com/Jyotishmoy12/AgentTM/releases/latest),
save these together:

1. Your matching macOS `.tar.gz` archive.
2. **SHA256SUMS**, downloaded separately from the same release.
3. **install.sh**, also from that release.

Do not mix versions. GitHub's Source code downloads contain the repository, not
the prebuilt CLI. Keep the archive unextracted; the installer extracts the executable.

## 3. Verify and install

In Terminal, enter the folder you created:

```sh
cd "$HOME/Downloads/AgentTM-downloads"
ls
```

Confirm all three files are listed. Set the variable below to the **exact archive
filename** from `ls`. This is an Apple silicon example; use `darwin_amd64` for Intel:

```sh
archive='agenttm_VERSION_darwin_arm64.tar.gz'
sh install.sh "$archive" "$HOME/.local/bin"
```

Replace VERSION before running. The installer compares SHA-256 against this
archive's exact SHA256SUMS entry **before** installation. It uses macOS's `shasum`
when `sha256sum` is unavailable and installs the executable with mode 0755.

Success prints `Installed: .../.local/bin/agenttm`. If the manifest/entry is missing
or the checksum differs, stop and re-download the files from the same release.
Do not bypass validation or continue after an installer error.

After installation succeeds:

```sh
export PATH="$HOME/.local/bin:$PATH"
agenttm version
```

The version should match your download. Add that export line once to your shell's
configuration for future terminals: normally `~/.zshrc` for interactive zsh or
`~/.bashrc` for interactive bash. Use `echo "$SHELL"` to check your configured shell.
You can also invoke `"$HOME/.local/bin/agenttm"` by its full path without editing PATH.

## 4. Record and open the dashboard

Open an existing Git working tree, replacing the example path:

```sh
cd /path/to/your/git-project
agenttm init
agenttm codex doctor
agenttm run codex -- "Explain this project"
agenttm ui
```

For a new empty project, run `git init` first. Authenticate using `codex login` if
readiness fails. Model access depends on your account; use `--model MODEL_ID`
with an available model if needed.

The browser normally opens `http://127.0.0.1:7331`. Keep Terminal running;
Ctrl+C stops the server without deleting history. If no browser opens, use
`agenttm ui --no-browser` and open the printed URL yourself.

## Troubleshooting and upgrades

| Problem | Next step |
| --- | --- |
| Archive or SHA256SUMS missing | Check `pwd` and `ls`; all three downloads must be in the same folder. |
| Checksum mismatch | Re-download the archive and manifest from the same release. |
| Existing executable | The installer refuses replacement. Close AgentTM and move the previous executable aside before upgrading. |
| Command not found | Set PATH in this terminal or invoke `"$HOME/.local/bin/agenttm"` directly. |
| Codex unavailable | Check `codex --version`, `codex login status`, and PATH in the terminal launching AgentTM. |
| Port occupied | Use `agenttm ui --port 7332` or `--port 0`. |
| macOS blocks execution | Stop and inspect macOS's message, download origin, and checksum. Releases are not claimed to be signed/notarized; these instructions do not bypass Gatekeeper. |

Use a directory you own rather than installing with administrator privileges.
Upgrades replace the executable, not project history. Native macOS runtime results
must be checked in the release's validation notes; cross-build and checksum success
alone do not prove execution or Gatekeeper behavior on your device.

[Next: user guide](../../user-guide.md) · [More troubleshooting](../../installation.md) · [Main README](../../../README.md)
