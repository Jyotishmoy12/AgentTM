# AgentTM compared with Git

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

[Main README](../README.md) · [User guide](user-guide.md)

