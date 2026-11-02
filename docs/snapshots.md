# Phase 2: workspace snapshots

Run `agenttm help` for the inspection commands. `agenttm run codex` captures an
eligible-file baseline before launching Codex, then scans again after process exit,
including failure or Ctrl+C. A final scan failure sets `recording_failed`; a
baseline failure prevents Codex launch. A failed recording is never reported as a
successful complete recording. Existing Phase 1 sessions and events are preserved.

## Checkpoints and observations

A session's first scan creates a checkpoint, including an empty workspace. Later
scans compare sorted paths, content hashes, permissions, omissions and consistency
flags. If unchanged, no new manifest is created; an observation event links to
the existing checkpoint. Every changed scan creates an immutable manifest whose
parent is that session's previous checkpoint. Identical blobs are reused across
files, checkpoints and sessions. Checkpoint IDs are UUIDs.

`agenttm checkpoint <session-id>` captures the **current** workspace, labeled
`manual`. It can append to an ended session for explicit inspection/testing; it
does not backfill history. Its timestamps show when that observation happened.
The manifest stores the baseline Git commit if one exists, for future restore.
Unborn repositories are supported; an empty base commit is explicit in metadata.

Capture does not stage, commit, reset, stash or check out files. Index, refs, HEAD
and eligible workspace files are never mutated by scanning. AgentTM writes only
its own store. Codex itself still performs actions allowed by its existing policy.

## Eligibility and precedence

1. Git enumerates tracked files and nonignored untracked files, honoring standard
   ignore sources. Tracked paths remain candidates even when matched by `.gitignore`.
   Tracked deletions are absent from the captured tree, rather than omissions.
2. `.git` and `.agenttm` components are always outside the snapshot scope.
3. Built-in secret and dependency/build/cache rules apply even to tracked files.
4. The config `exclude` patterns apply, followed by per-file and total size limits.
5. Symlinks, nested Git repositories/submodules, nonregular/unreadable files, unsafe
   or nonportable filenames are omitted and reported. Symlinks are never restored
   or followed outside the repository; Go's rooted filesystem API bounds reads.

Built-in secret exclusions include `.env*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`,
`credentials`, `credentials.json`, `id_rsa`, `id_ed25519`, `id_dsa`, `.npmrc`, `.netrc`,
`.pypirc`, `.git-credentials`, `.aws` and `.ssh`. Built-in dependency/build/cache
components include `node_modules`, `vendor`, `dist`, `build`, `target`, `.cache`,
`__pycache__`, `.venv`, `venv`, `coverage`, `.next`, `bin`, and `obj`.
Built-ins are case insensitive and cannot be disabled in this version.

Config exclusions can be added or removed and are case sensitive. Use normalized
forward-slash paths: `private/**`, `**/*.backup`. `**` matches zero or more complete
path components; a pattern without `/` matches any component/basename. Patterns
must be relative, at most 256 characters, and cannot contain traversal or backslashes.
At most 256 patterns are supported. Capture limits can be configured under `storage`:

```json
{"max_file_bytes": 2097152, "max_snapshot_bytes": 209715200}
```

Defaults are 2 MiB per file and 200 MiB total eligible content per checkpoint.
Supported maxima are 64 MiB per file and 2 GiB total. The total counts logical file
bytes, including duplicate contents. A scan supports at most 100,000 candidates,
a 16 MiB Git candidate list and a 32 MiB manifest; exceeding these metadata limits
fails capture rather than silently dropping history. Individual omissions cause a
prominent **PARTIAL** flag. Files already ignored by Git are outside the candidate
set and are not individually listed as omissions. No snapshot captures a complete
external environment or guarantees a runnable project.

## Consistency and metadata

Scans are filesystem observations, not atomic filesystem snapshots or proof of
agent authorship. Reads compare file identity, size, mode and modification time
before and after reading, with at most three attempts. Continued mutation omits
the file and marks the checkpoint partial and potentially inconsistent. Changes
between different file reads or after the candidate list was built may still be
missed; same-size changes with indistinguishable timestamps may evade detection.
File permission/executable bits are preserved where the host OS exposes them.
Windows does not expose POSIX executable bits reliably; ownership, ACLs, xattrs,
timestamps and other platform-specific metadata are not restored by this format.

## Integrity and crash recovery

Objects live at `.agenttm/objects/<first-two-hash-characters>/<sha256>`. Manifests
live at `.agenttm/manifests/<checkpoint-id>.json`; their SHA-256 checksum is indexed
in SQLite. New files are staged in their destination directory, synced, closed
and atomically renamed. A DB transaction then publishes the checkpoint and linked
observation together. Every object read checks both hash and expected size; every
manifest read checks its checksum, version, identity, project ownership and paths.
Traversal, reserved names, case-insensitive collisions and file/directory conflicts
are rejected. Power-loss durability still depends on the filesystem and OS.

`agenttm doctor` reports missing/corrupt objects/manifests as errors. It also reports
orphan manifests, unreferenced objects and `.tmp-*` remnants left by interruptions.
These are retained; automatic blob GC is deferred. Do not delete the object store
to repair one checkpoint. Recover damaged referenced files from a trusted backup.

Capture uses `.agenttm/data/snapshot.lock` to serialize writes. If a process was
force-killed, first confirm no capture process is running, then remove **only**
that stale lock and retry. `doctor` reports its presence, but cannot determine
whether another process is still using it. An `active` session after a force kill
remains visible; no history is fabricated or rewritten automatically.

## Inspection limits and testing

`show` prints manifest JSON, `cat` prints verified UTF-8 text up to 1 MiB, and
`diff` returns additions/removals/modifications and mode changes. Binary files get
metadata rather than textual patches. Text diffs are valid whole-file replacement
unified patches, bounded to 128 KiB each and 1 MiB total patch output; larger patches
have an explicit `truncated` flag. A baseline compares against an empty tree.
Rename detection is not attempted: a rename appears as deletion plus addition.

Automated tests cover hashing/deduplication, dirty and untracked files, deletions,
ignore precedence, exclusions/limits, historical contents, diffs/modes, corrupt and
missing storage, simulated interrupted-write remnants/locks, migration from schema
1 and success/failure/cancellation through synthetic supervised child processes.
Symlink tests require OS support and may be skipped on Windows without privileges.
No successful actual Codex file write is claimed when its normal policy refuses it.
See `codex-compatibility.md` for the separate real-run evidence.
