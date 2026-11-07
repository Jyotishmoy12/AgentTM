import type { Change, Checkpoint, FileContent, SnapshotFile } from '../../types';
import { FileTree } from '../molecules/FileTree';
import { FilePanelDivider } from './FilePanelDivider';
import { HistoricalInspectorEditorPanel } from './HistoricalInspectorEditorPanel';

export function HistoricalInspectorFileLayout({
  model: viewModel,
}: {
  model: {
    mode: 'file' | 'diff';
    files: SnapshotFile[];
    cursor: number | null;
    total: number;
    search: string;
    setSearch: import('react').Dispatch<import('react').SetStateAction<string>>;
    tree: import('react').RefObject<HTMLDivElement | null>;
    scrollPositions: import('react').RefObject<{
      file: number;
      diff: number;
    }>;
    path: string;
    selectPath: (value: string) => void;
    paths: Change[];
    changes: Change[];
    diffCursor: number | null;
    moreFiles: () => Promise<void>;
    moreChanges: () => Promise<void>;
    checkpoint: Checkpoint | null;
    id: string;
    diffError: string;
    setRetry: import('react').Dispatch<import('react').SetStateAction<number>>;
    fileLoading: boolean;
    fileError: string;
    value: { key: string; before: FileContent | null; after: FileContent | null } | null;
    change: Change | undefined;
    split: boolean;
  };
}) {
  const {
    mode,
    files,
    cursor,
    total,
    search,
    setSearch,
    tree,
    scrollPositions,
    path,
    selectPath,
    paths,
    changes,
    diffCursor,
    moreFiles,
    moreChanges,
    checkpoint,
    id,
    diffError,
    setRetry,
    fileLoading,
    fileError,
    value,
    change,
    split,
  } = viewModel;
  return (
    <div className="file-layout">
      <nav className="file-tree" aria-label="Historical file tree">
        <div className="file-list-title">
          {mode === 'file' ? 'CAPTURED FILES' : 'CHANGED FILES'}{' '}
          <span>{mode === 'file' ? files.length + (cursor !== null ? '+' : '') : total}</span>
        </div>
        <input
          aria-label="Filter loaded file paths"
          placeholder="Find a file…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div
          className="tree-list"
          ref={tree}
          onScroll={(event) => {
            scrollPositions.current[mode] = event.currentTarget.scrollTop;
          }}
        >
          {mode === 'file' ? (
            <FileTree
              files={files.filter((file) => file.path.toLowerCase().includes(search.toLowerCase()))}
              selected={path}
              onSelect={selectPath}
            />
          ) : (
            <>
              {paths.map((change) => (
                <button
                  key={change.path}
                  className={path === change.path ? 'active-file' : ''}
                  onClick={() => selectPath(change.path)}
                  title={change.path}
                  aria-label={change.path}
                >
                  <span className={'change-kind ' + change.kind}>
                    {change.kind === 'added' ? '+' : change.kind === 'removed' ? '−' : 'M'}
                  </span>
                  <span>{change.path}</span>
                </button>
              ))}
              {path && !changes.some((change) => change.path === path) && (
                <button className="active-file" onClick={() => selectPath(path)}>
                  {path}
                </button>
              )}
            </>
          )}
          {(mode === 'file' ? cursor !== null : diffCursor !== null) && (
            <button className="load-more" onClick={mode === 'file' ? moreFiles : moreChanges}>
              Load more {mode === 'file' ? 'files' : 'changes'}
            </button>
          )}
          {!files.length && mode === 'file' && (
            <p className="panel-padding muted">No eligible files captured.</p>
          )}
        </div>
      </nav>
      <FilePanelDivider />
      <HistoricalInspectorEditorPanel
        model={{
          path,
          mode,
          total,
          checkpoint,
          id,
          diffError,
          setRetry,
          fileLoading,
          fileError,
          changes,
          value,
          change,
          split,
        }}
      />
    </div>
  );
}
