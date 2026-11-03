export interface Page<T> { items: T[]; next_cursor: number | null; total?: number; last_cursor?: number }
export interface Health { project: string; version: string; prompt_mode: string; read_only: boolean; capture: string; csrf_token: string }
export interface ForkPlan {checkpoint_id: string; name: string; worktree_path: string; branch_name: string; base_commit: string; partial: boolean; warnings: string[]}
export interface ForkResult extends ForkPlan {id: string; status: string}
export interface RestoredWorkspace { id: string; checkpoint_id: string; branch_name: string; worktree_path: string; status: string; created_at: string }
export interface Session { id: string; agent: string; started_at: string; ended_at: string | null; status: string; exit_code: number | null }
export interface RecordedEvent { id: string; session_id: string; sequence: number; kind: string; tool_name?: string; tool_call_id?: string; received_at: string; payload: unknown; checkpoint_id?: string }
export interface Checkpoint { id: string; session_id: string; parent_id: string; event_id: string; created_at: string; kind: string; partial: boolean; potentially_inconsistent: boolean; fidelity: string; file_count: number; omission_count: number; omissions?: { path: string; reason: string }[]; omissions_truncated?: boolean }
export interface SnapshotFile { path: string; object_id: string; mode: number; size: number }
export interface FileContent { path: string; content: string; size: number; object_id: string }
export interface Change { path: string; kind: string; binary: boolean; old_mode?: number; new_mode?: number; patch?: string; truncated?: boolean }
