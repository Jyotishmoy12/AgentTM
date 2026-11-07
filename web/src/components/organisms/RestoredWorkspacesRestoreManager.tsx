import type { RestoredWorkspace } from '../../types';
import type { FolderState, RestoreBridge } from '../../types/RestoredWorkspaces';
import { NavIcon } from '../atoms/NavIcon';
import { RestoredWorkspacesAside } from './RestoredWorkspacesAside';
import { RestoredWorkspacesRestoresListPane } from './RestoredWorkspacesRestoresListPane';

export function RestoredWorkspacesRestoreManager({
  model: viewModel,
}: {
  model: {
    narrow: boolean;
    drawer: boolean;
    close: () => void;
    onCheckpoints: () => void;
    search: string;
    setSearch: import('react').Dispatch<import('react').SetStateAction<string>>;
    sort: string;
    setSort: import('react').Dispatch<import('react').SetStateAction<string>>;
    error: string;
    loading: boolean;
    setRetry: import('react').Dispatch<import('react').SetStateAction<number>>;
    items: RestoredWorkspace[];
    visible: RestoredWorkspace[];
    rows: import('react').RefObject<HTMLDivElement | null>;
    selected: string;
    setSelected: import('react').Dispatch<import('react').SetStateAction<string>>;
    setDrawer: import('react').Dispatch<import('react').SetStateAction<boolean>>;
    cursor: number | null;
    moreBusy: boolean;
    more: () => Promise<void>;
    item: RestoredWorkspace | undefined;
    action: string;
    perform: (kind: 'copy' | 'open' | 'inspect') => Promise<void>;
    bridge: RestoreBridge | undefined;
    folder: FolderState | null;
    feedback: string;
    actionError: string;
    checking: boolean;
    checkFolder: () => Promise<void>;
  };
}) {
  const {
    narrow,
    drawer,
    close,
    onCheckpoints,
    search,
    setSearch,
    sort,
    setSort,
    error,
    loading,
    setRetry,
    items,
    visible,
    rows,
    selected,
    setSelected,
    setDrawer,
    cursor,
    moreBusy,
    more,
    item,
    action,
    perform,
    bridge,
    folder,
    feedback,
    actionError,
    checking,
    checkFolder,
  } = viewModel;
  return (
    <section
      className="restore-manager"
      aria-label="Restored workspace manager"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && narrow && drawer) {
          e.preventDefault();
          close();
        }
      }}
    >
      <header className="restores-heading">
        <div>
          <span className="editorial-kicker">SEPARATE WORKING COPIES</span>
          <h1>Restored workspaces</h1>
          <p>Find a restored workspace, inspect its source, and pick up where you need to.</p>
        </div>
        <button onClick={onCheckpoints}>
          <NavIcon name="sessions" />
          Browse history
        </button>
      </header>
      <div className="restores-controls">
        <label className="restores-search">
          <NavIcon name="search" />
          <input
            aria-label="Search restored workspaces"
            placeholder="Find a workspace…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="restores-sort">
          Sort
          <select
            aria-label="Sort restored workspaces"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name</option>
            <option value="result">Restore result</option>
          </select>
        </label>
      </div>
      {error && (
        <div className="restores-error" role="alert">
          {error}
          <button disabled={loading} onClick={() => setRetry((value) => value + 1)}>
            Retry
          </button>
        </div>
      )}
      <div className="restores-body">
        <RestoredWorkspacesRestoresListPane
          model={{
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
          }}
        />
        {item && (!narrow || drawer) && (
          <RestoredWorkspacesAside
            model={{
              narrow,
              item,
              close,
              action,
              perform,
              bridge,
              folder,
              feedback,
              actionError,
              checking,
              checkFolder,
            }}
          />
        )}
      </div>
    </section>
  );
}
