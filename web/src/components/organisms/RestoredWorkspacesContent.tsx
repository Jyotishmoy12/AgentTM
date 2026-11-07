import { date, identity, resultLabel } from '../../data/RestoredWorkspaces';
import type { RestoredWorkspace } from '../../types';
import { FolderIcon } from '../atoms/FolderIcon';

export function RestoredWorkspacesContent({
  model: viewModel,
}: {
  model: {
    rows: import('react').RefObject<HTMLDivElement | null>;
    loading: boolean;
    visible: RestoredWorkspace[];
    selected: string;
    setSelected: import('react').Dispatch<import('react').SetStateAction<string>>;
    setDrawer: import('react').Dispatch<import('react').SetStateAction<boolean>>;
    narrow: boolean;
  };
}) {
  const { rows, loading, visible, selected, setSelected, setDrawer, narrow } = viewModel;
  return (
    <>
      <div className="restores-columns" aria-hidden="true">
        <span>Workspace</span>
        <span>Restored</span>
        <span>Checkpoint</span>
        <span>Restore result</span>
      </div>
      <div
        className="restores-list"
        role="listbox"
        aria-label="Restored workspaces"
        ref={rows}
        aria-busy={loading}
      >
        {visible.map((workspace, index) => (
          <button
            key={workspace.id}
            role="option"
            aria-label={'Workspace ' + identity(workspace)}
            aria-selected={selected === workspace.id}
            tabIndex={selected === workspace.id ? 0 : -1}
            className="restores-row"
            onClick={() => {
              setSelected(workspace.id);
              setDrawer(narrow);
            }}
            onKeyDown={(e) => {
              if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
              e.preventDefault();
              const next =
                e.key === 'Home'
                  ? 0
                  : e.key === 'End'
                    ? visible.length - 1
                    : Math.max(
                        0,
                        Math.min(visible.length - 1, index + (e.key === 'ArrowDown' ? 1 : -1)),
                      );
              setSelected(visible[next].id);
              rows.current?.querySelectorAll<HTMLElement>('[role=option]')[next]?.focus();
            }}
          >
            <span className="restore-row-identity">
              <FolderIcon />
              <span>
                <strong>{identity(workspace)}</strong>
                <small>Isolated Git worktree</small>
              </span>
            </span>
            <time dateTime={workspace.created_at || undefined}>{date(workspace.created_at)}</time>
            <code className="restore-source">
              {workspace.checkpoint_id.slice(0, 8) || 'Not recorded'}
            </code>
            <span className={'restore-result result-' + workspace.status}>
              <i aria-hidden="true" />
              {resultLabel(workspace.status)}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
