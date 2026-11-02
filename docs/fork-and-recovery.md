# Safe checkpoint forks and recovery

`agenttm fork <checkpoint-id> --name alternative` restores captured files into
`.agenttm/worktrees/alternative` on a new `agenttm/alternative` Git branch. The
same action is available from **Fork checkpoint** in the web UI. The dialog shows
the exact server-computed destination, branch, baseline warning and omission
warning before you confirm. No arbitrary destination path is accepted from a
browser. `agenttm forks` lists recorded paths and states.

Names are limited to 1–64 lowercase ASCII letters/digits, underscores and hyphens;
the first character must be a letter or digit. Reserved filenames are rejected.
Existing directories and branch names, including case-insensitive collisions,
are never overwritten. You can open a resulting worktree directly in your editor.
It may be dirty relative to its Git HEAD; the manifest is the historical state.

## Restore guarantees

- Validate project ownership, manifest format/path safety and every referenced
  object hash before creating the destination.
- Use the checkpoint's recorded base commit. If unavailable, use current HEAD
  with an explicit warning. If both are absent, use an unborn branch (Git 2.42+).
- Create a worktree with checkout suppressed. Populate only the **new worktree's**
  index from its Git base, then materialize exact captured bytes into its initially
  empty workspace. Omitted base files are never copied out of Git.
- Disable Git hooks/fsmonitor for fork plumbing, and strip ambient `GIT_DIR`,
  `GIT_WORK_TREE`, `GIT_INDEX_FILE` and other Git overrides that could redirect
  writes. Read-only discovery/capture uses the same bounded Git environment.
- Use rooted filesystem operations, exclusive file creation and path validation.
  Restore no symlinks, metadata paths or case-colliding files. Verify hashes,
  sizes, native modes and inventory after materializing the checkpoint.
- Leave the original working files, index and HEAD unchanged. Git necessarily
  adds metadata for the new branch/worktree, and AgentTM records its fork ledger.
- Execute no restored scripts, installers or agent commands.

The algorithm follows Git's documented [worktree checkout suppression](https://git-scm.com/docs/git-worktree)
and [index-only read-tree behavior](https://git-scm.com/docs/git-read-tree).

Partial checkpoints are refused by default. After reviewing `agenttm show <id>`,
use `--allow-partial` or the dialog's explicit partial-restore checkbox. Excluded
files and external state remain absent, so the result may not run without manual
setup. POSIX mode bits are preserved on supported filesystems; Windows does not
provide complete POSIX metadata. Ownership, ACLs and timestamps are not restored.

## Failures and interruption

Failure after destination reservation leaves the worktree/directory and a
`failed` or `restoring` record for inspection. Nothing is recursively deleted on
your behalf. `agenttm doctor` reports failed/interrupted forks, missing recorded
directories, and unrecorded directories. Inspect `agenttm forks` and `git worktree
list` before deciding what to keep. To remove an unwanted fork, use Git's own
worktree management after reviewing its contents. AgentTM never automatically
removes branch refs or dirty worktrees.

`.agenttm/data/maintenance.lock` serializes fork and purge. A force-kill can leave
it behind. Confirm no fork/purge is still running before removing only this stale
lock. Snapshot capture has its own `snapshot.lock`; the same rule applies.
Never infer that a process is dead from lock age alone. A failed verification is
an error, not a successful restoration.

## Purging a recording

```powershell
& $agenttm purge --session '<session-id>'
# Type the complete session UUID when prompted.
# For explicit noninteractive confirmation:
& $agenttm purge --session '<session-id>' --yes
```

Purge removes this project's selected session, events and checkpoint indexes in
one DB transaction, then removes its individual manifest/log files. Active sessions
and sessions referenced by fork records are refused. Other sessions, Git state,
worktree files and shared content blobs are preserved. Interrupted post-commit
cleanup may leave unindexed manifests/logs; doctor reports storage remnants.

Blob garbage collection is deferred: **purging does not securely erase file
contents**, SQLite free pages/WAL, forks or backups. Unreferenced objects remain
in the local object store. This deliberately avoids deleting content still used
by other sessions. No automatic retention/GC, cloud backup or remote deletion is
implemented in v0.1.
