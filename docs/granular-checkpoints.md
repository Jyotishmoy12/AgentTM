# Operation checkpoints

New CLI and desktop recordings capture workspace observations at received
command execution, file change, MCP tool, and dynamic tool boundaries. In the
desktop, open **Sessions**, choose a recording, then select **Operations**.
**Inspect before** and **Inspect after** open the historical files at that boundary.
Use **Refresh operations** to update the list during a running conversation.

Capture is enabled by default. Existing projects preserve their configuration:
set `capture.snapshot_after_tool` to `true` in `.agenttm/config.json`, or pass
`--snapshot-after-tool=true` to `agenttm run codex`. Disabling it keeps operation
metadata with an explicit `disabled` capture status. Baseline and final scans
still run. Older recordings are preserved without inventing operation history.

Every received supported completion creates a distinct immutable after
checkpoint, including read-only and no-op operations. Before states can reuse
the latest identical state. SHA-256 blobs remain shared across checkpoints;
no-op operations add metadata rather than duplicate file contents. Start and
completion events link directly to their captured checkpoint IDs.

The operation ledger records tool outcome separately from capture coverage.
Failed tools can still have valid after checkpoints. Missing starts have no
inferred before state. Missing completions, cancellation, and capture failures
remain visible. Duplicate completion notifications in a run reuse the recorded
boundary; later resumed runs can safely reuse upstream item IDs.

Each boundary scans twice and marks a differing result partial and potentially
inconsistent. Existing exclusions, size limits, per-file read checks, checksum
verification, and safe-path rules apply. Both scans still require reading eligible
files, so large projects and many operations increase disk work and manifest size.

## What a boundary means

Codex notifications do not pause tools. A boundary is the workspace observed
while processing a notification, **not an atomic state immediately before or
after tool execution**. Another operation may already have run when AgentTM
receives a notification. Overlapping operations are flagged; background writers
and subagents can also affect files. Two equal scans cannot prove no concurrent
write occurred. A shell command containing several commands is one observed
operation. Unsupported item types and unreported child-agent operations do not
receive invented checkpoints. These records do not establish code provenance.

Capture errors stop the recording path rather than report complete coverage.
Force-killed recordings retain pending operation entries for diagnosis.
`agenttm doctor` reports uncertain coverage and invalid operation links; it does
not fabricate missing checkpoints. The checkpoint/event publication is atomic;
a crash before the operation ledger update can leave a published checkpoint
alongside a pending operation. Inspect the linked timeline and doctor report.

## CLI inspection

```powershell
agenttm operations <session-id> --limit 50
agenttm operations <session-id> --after <cursor> --limit 50
agenttm show <after-checkpoint-id>
agenttm cat <after-checkpoint-id> path/to/file.go
```

The output is JSON Lines. `cursor` is exclusive and project-scoped. The read-only
HTTP endpoint is `/api/sessions/<id>/operations?cursor=0&limit=50`.
`changed_paths` lists up to 200 differences between before/after observations;
`changed_path_count` reports the total. Missing before states do not report an
invented diff. **Changes** in the file inspector compares a checkpoint to its
manifest parent, which can differ from the operation's before state when tools
overlap.

Encrypted backups include the operation ledger. Purging a session removes its
ledger and checkpoint references; blob collection continues to preserve all
remaining checkpoint references. Provenance and conversation forks are separate
future work.
