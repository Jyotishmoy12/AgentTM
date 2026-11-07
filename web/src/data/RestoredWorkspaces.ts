import { historyDate } from '../history-presentation';
import type { RestoredWorkspace } from '../types';

export const identity = (item: RestoredWorkspace) =>
  item.worktree_path.split(/[\\/]/).filter(Boolean).at(-1) ||
  item.branch_name ||
  item.id.slice(0, 8);

export const date = (value: string) =>
  value && Number.isFinite(Date.parse(value)) ? historyDate(value) : 'Not recorded';

export const resultLabel = (status: string) =>
  ({ ready: 'Completed', restoring: 'Restoring', failed: 'Failed' })[status] ||
  status.replaceAll('_', ' ') ||
  'Not recorded';
