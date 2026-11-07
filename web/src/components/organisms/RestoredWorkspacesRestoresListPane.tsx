import { plural } from '../../history-presentation';
import type { RestoredWorkspace } from '../../types';
import { FolderIcon } from '../atoms/FolderIcon';
import { NavIcon } from '../atoms/NavIcon';
import { RestoredWorkspacesContent } from './RestoredWorkspacesContent';

export function RestoredWorkspacesRestoresListPane({
  model: viewModel,
}: {
  model: {
    loading: boolean;
    items: RestoredWorkspace[];
    error: string;
    onCheckpoints: () => void;
    visible: RestoredWorkspace[];
    setSearch: import('react').Dispatch<import('react').SetStateAction<string>>;
    rows: import('react').RefObject<HTMLDivElement | null>;
    selected: string;
    setSelected: import('react').Dispatch<import('react').SetStateAction<string>>;
    setDrawer: import('react').Dispatch<import('react').SetStateAction<boolean>>;
    narrow: boolean;
    cursor: number | null;
    moreBusy: boolean;
    more: () => Promise<void>;
  };
}) {
  const {
    loading,
    items,
    error,
    onCheckpoints,
    visible,
    setSearch,
    rows,
    selected,
    setSelected,
    setDrawer,
    narrow,
    cursor,
    moreBusy,
    more,
  } = viewModel;
  return (
    <div className="restores-list-pane">
      {loading && !items.length ? (
        <div className="restores-empty" role="status">
          <FolderIcon />
          <h2>Loading your workspaces…</h2>
        </div>
      ) : !items.length && !error ? (
        <div className="restores-empty">
          <FolderIcon />
          <h2>No restored workspaces yet</h2>
          <p>Inspect a checkpoint in History, then restore it to create a separate Git worktree.</p>
          <button className="primary-button" onClick={onCheckpoints}>
            Browse checkpoints
          </button>
        </div>
      ) : !visible.length && !error ? (
        <div className="restores-empty">
          <NavIcon name="search" />
          <h2>No matching workspaces</h2>
          <p>Search a folder name, path, branch, or checkpoint.</p>
          <button onClick={() => setSearch('')}>Clear search</button>
        </div>
      ) : (
        <RestoredWorkspacesContent
          model={{ rows, loading, visible, selected, setSelected, setDrawer, narrow }}
        />
      )}
      {cursor !== null && (
        <button className="restores-more" disabled={loading || moreBusy} onClick={more}>
          {moreBusy ? 'Loading…' : 'Load more workspaces'}
        </button>
      )}
      <p className="restores-scope">
        {visible.length}
        {cursor !== null ? '+' : ''}{' '}
        {plural(visible.length === 1 && cursor === null ? 1 : 2, 'workspace')} shown
        {cursor !== null ? ' · search and sort cover loaded records' : ''}
      </p>
    </div>
  );
}
