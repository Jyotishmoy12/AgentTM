# Desktop chat, continuation, backups, and blob cleanup

Chat, continuation, and encrypted backups require the native Windows desktop
preview; they are not features of the CLI/browser dashboard. CLI garbage
collection is implemented separately. Check the selected
[release's Assets](https://github.com/Jyotishmoy12/AgentTM/releases/latest) for
desktop binary availability. A local build does not publish or change release assets.

Build the frontend, then launch the native app from the AgentTM repository:

```powershell
cd C:\dev\AgentTM\web
npm.cmd run build
cd ..
.\scripts\desktop.ps1
```

## Chat and Continue

Use **Chat with Codex** to start a new conversation. The model picker queries
Codex's `model/list` catalog and selects your remembered choice, the catalog's
recommended default, or its first entry. You can refresh the catalog or enter
a model ID manually. A catalog entry is not a guarantee of account access; if
a request is rejected, choose another model and retry. The selected model is
sent explicitly for both thread setup and each turn without changing global
Codex configuration. Read-only
permissions are the initial default; **Allow project edits** selects Codex's
workspace-write sandbox. The client requests user-reviewed approvals and does
not alter global Codex configuration.

If discovery fails, the picker shows the native error instead of a generic
history message. **Choose Codex executable…** lets you select the installed
`codex.exe` directly, validates it, and refreshes models. The choice is stored
in `%APPDATA%\AgentTM\desktop.json` and is shared by desktop chat, readiness
checks, and model discovery. This avoids depending on a terminal's temporary
PATH changes. If an editor update moves the executable, choose the new file.

Each message starts one turn. AgentTM records observable item/lifecycle events
and workspace checkpoints. The first turn captures a baseline; continued turns
capture a manual starting observation, followed by a final observation. Optional
operation-boundary observations follow the project's capture setting. See
[operation checkpoints](granular-checkpoints.md) for before/after coverage limits.

**Continue in chat** on a resumable session, or the Conversation selector in Chat,
resumes the exact saved Codex thread ID. Follow-ups use the same AgentTM session.
CLI-recorded sessions can also be resumed when their upstream thread was stored.
Resumption needs Codex's own local thread history and account/model access; an
AgentTM backup alone cannot reconstruct that history. This is explicit,
user-initiated continuation, not an unattended loop. It does not move the
conversation to a restored worktree.

Command/file approval requests show the proposed operation with **Allow once**
and **Decline**. Decisions are recorded as metadata. No session-wide approval
rules are installed. The supported client currently declines MCP elicitation
and additional-permission requests; unsupported interactive tool requests are
returned as unsupported rather than hanging or accepting them silently. Ask
Codex to pose any follow-up questions in ordinary chat.

**Stop turn** requests `turn/interrupt`; process-tree cancellation is the bounded
fallback if interruption is unavailable or stalls. Closing the app stops its
owned turn and finalizes history before closing SQLite. Only one managed turn
or CLI recording can own the project recording lock at once.

Prompt text follows `capture.prompt_mode`: metadata-only prompts are represented
by a placeholder on reopening history, while sanitized mode retains sanitized
text. Current input and live reply drafts are held in memory. Reasoning payloads,
credentials, raw App Server streams, and stderr are not persisted by this client.
Codex separately stores its own history. Assistant replies and supported tool
observations pass through the existing sanitization and size limits.

Protocol reference: [Codex App Server](https://learn.chatgpt.com/docs/app-server).

## Encrypted history backups

In **Storage & backups**, enter and confirm a new passphrase of at least 12
characters, then choose **Create encrypted backup** and select a new `.age` file.
The format is streaming tar/gzip encrypted by age's passphrase/scrypt support.
The output is compatible with the age file format; AgentTM cannot recover a lost
passphrase. The UI clears the passphrase after each operation.

Included: a consistent SQLite copy made with `VACUUM INTO`, configuration,
manifests, logs, and content-addressed blobs. Not included: Git commits/refs,
current workspace files, restored worktrees, or Codex credentials/thread files.
Keep a separate clone/backup of Git and any files not captured in checkpoints.

For restore, enter the existing passphrase (confirmation is not needed), select
the `.age` file, and choose a Git clone with **no existing `.agenttm` directory**.
Confirm the native restore dialog. Authentication, entry/path/size limits,
configuration, SQLite integrity, manifest checksums, and referenced blob hashes
are verified before publishing history. Project identity is preserved while its
root path is rebound to the destination. Existing project files are not changed.
Old fork ledger paths are retained as recorded paths, not recreated worktrees.

Creating backups and restoring them uses temporary plaintext staging files.
These are removed on success/failure; a force-kill can leave staging directories
for manual diagnosis. Archives have a 20 GiB total limit, an 8 GiB SQLite limit,
and bounded file counts/sizes. No overwrite, network upload, scheduler, or
password storage is provided. A single-project database is required for export.

Encryption reference: [age](https://pkg.go.dev/filippo.io/age).

## Garbage collection

Use **Preview unused blobs**, inspect the candidate count/bytes, then check the
confirmation box and **Delete previewed blobs**. Default grace period: 24 hours.
A preview token binds deletion to the exact candidate set. A changed candidate
set requires another preview. Deletion is permanent, not secure erasure, and
does not remove retained checkpoints, worktrees, or Git objects.

Equivalent CLI:

```powershell
agenttm gc
agenttm gc --apply --yes
# Explicitly include recent unreferenced blobs after reviewing their preview:
agenttm gc --min-age 0s
agenttm gc --min-age 0s --apply --yes
```

GC marks blobs referenced by every indexed checkpoint in the database, including
checkpoints that protect existing fork records and other project identities.
It validates those manifests and referenced objects before sweeping canonical
unreferenced blob files. Shared live blobs are retained. Unindexed manifests,
unexpected object paths, symlinks, corrupt history, active sessions, and operation
locks stop cleanup. Interrupted operations are diagnosed rather than assumed dead.
Purge remains a separate explicit operation for deleting session history.

## Validation

Unit/integration tests cover thread resumption, approval decisions, cancellation,
privacy filtering, shared-object preservation, preview mismatch, encrypted
round-trip restore, wrong passwords, tampering, and overwrite refusal. Browser
tests exercise the native bridge using explicit synthetic stubs, not real model
execution. A separate opt-in live test has verified two real Codex turns and
conversation recall using Codex CLI 0.164.0-alpha.11.1 and gpt-6.1-sol.

To repeat the live test (uses your Codex account/model access):

```powershell
$env:AGENTTM_REAL_CODEX='1'
$env:AGENTTM_REAL_MODEL='gpt-6.1-sol' # select a model available to you
go test ./internal/interactive -run TestRealCodexConversationResume -v -count=1
Remove-Item Env:AGENTTM_REAL_CODEX
Remove-Item Env:AGENTTM_REAL_MODEL
```
