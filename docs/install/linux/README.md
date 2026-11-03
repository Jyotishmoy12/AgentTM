# Install AgentTM on Linux

[Main README](../../../README.md) · [Windows](../windows/README.md) · [macOS](../macos/README.md)

This guide installs the CLI and its embedded browser dashboard. The native desktop
preview currently targets Windows; do not download the Windows desktop ZIP for Linux.

## 1. Prerequisites and architecture

You need Git 2.42+ and a Git working tree. New recordings need an installed,
authenticated [Codex CLI](https://developers.openai.com/codex/cli). Go and Node.js
are not required for AgentTM's prebuilt CLI or embedded dashboard.

```sh
uname -m
git --version
```

| Architecture | Download |
| --- | --- |
| `x86_64` | `agenttm_VERSION_linux_amd64.tar.gz` |
| `aarch64` / `arm64` | `agenttm_VERSION_linux_arm64.tar.gz` |

Use the release's actual version in place of VERSION. Other architectures are
not provided by the current packager.

## 2. Download the three files

Create a new empty folder, such as `Downloads/AgentTM-downloads`. From
[Latest release → Assets](https://github.com/Jyotishmoy12/AgentTM/releases/latest),
save these together:

1. Your matching Linux `.tar.gz` archive.
2. **SHA256SUMS**, downloaded separately from the same release.
3. **install.sh**, also from that release.

Keep the archive unextracted. Do not mix versions or select GitHub's Source code
downloads; those contain the repository rather than a prebuilt executable.

## 3. Verify and install

Open a terminal in the download folder:

```sh
cd "$HOME/Downloads/AgentTM-downloads"
ls
```

Confirm all three files are listed. Copy the exact downloaded archive name into
the variable below, replacing VERSION and changing to `linux_arm64` if needed:

```sh
archive='agenttm_VERSION_linux_amd64.tar.gz'
sh install.sh "$archive" "$HOME/.local/bin"
```

The installer compares this archive's SHA-256 with its exact SHA256SUMS entry
**before** installation, then installs the executable with mode 0755. Success
prints `Installed: .../.local/bin/agenttm`. Stop on missing-file/checksum errors;
re-download the matching files instead of bypassing the check.

After a successful installation:

```sh
export PATH="$HOME/.local/bin:$PATH"
agenttm version
```

The version should match your download. The export affects this terminal and its
children. Add it once to your shell's configuration for future terminals, such as
`~/.bashrc` for interactive bash or `~/.zshrc` for interactive zsh. Check your
configured shell with `echo "$SHELL"`. A full-path invocation also works:
`"$HOME/.local/bin/agenttm" version`.

## 4. Record and open the dashboard

Change to your Git project, replacing the example path:

```sh
cd /path/to/your/git-project
agenttm init
agenttm codex doctor
agenttm run codex -- "Explain this project"
agenttm ui
```

Run `git init` first for a new empty project. Authenticate with `codex login` if
needed. If your default model is unavailable, select one accessible to your
account with `--model MODEL_ID` before the `--` prompt separator.

The browser normally opens `http://127.0.0.1:7331`. Keep the terminal running;
Ctrl+C stops the server, not your saved history. On a machine without automatic
browser opening, use `agenttm ui --no-browser` and open the printed loopback URL
locally. The server binds to loopback, not a public interface.

## Troubleshooting and upgrades

| Problem | Next step |
| --- | --- |
| Files not found | Check `pwd` and `ls`; the archive, installer, and SHA256SUMS must be together. |
| Checksum mismatch | Re-download the archive and manifest from the same release. |
| Existing executable | Close AgentTM and move the old executable aside before installing. The installer refuses replacement. |
| Command not found | Update PATH in this terminal or invoke the installed executable by full path. |
| Permission denied | Choose a directory you own. If it is mounted noexec, use an allowed executable location according to your system policy. |
| Wrong binary format | Recheck `uname -m` and the selected Linux architecture; do not use macOS/Windows archives. |
| Codex missing | Check `codex --version`, `codex login status`, and PATH in this terminal. |
| Port 7331 occupied | Use `agenttm ui --port 7332` or `--port 0`. |

There is normally no need for `sudo` when installing to your own `~/.local/bin`.
Project history remains in each project's `.agenttm` directory during upgrades.
Consult release-specific native validation results; a cross-build alone does not
prove runtime behavior on every Linux distribution or ARM device.

[Next: user guide](../../user-guide.md) · [More troubleshooting](../../installation.md) · [Main README](../../../README.md)
