import { memo, useEffect, useRef, useState } from 'react';
import { APIError, get, message } from '../api';
import type { Change, Checkpoint, FileContent, Page, SnapshotFile } from '../types';
import { FileTree } from './FileTree';
import { CodeViewer } from './CodeViewer';
import { ComparisonViewer } from './ComparisonViewer';
import { FilePanelDivider } from './FilePanelDivider';

async function capturedFile(
  id: string,
  path: string,
  signal: AbortSignal,
): Promise<FileContent | null> {
  if (!id) return null;
  try {
    return await get<FileContent>(
      '/checkpoints/' + id + '/file?path=' + encodeURIComponent(path),
      signal,
    );
  } catch (error) {
    if (error instanceof APIError && error.code === 'file_not_found') return null;
    throw error;
  }
}

export const HistoricalInspector = memo(function HistoricalInspector({
  id,
  mode,
  split,
  onCheckpoint,
  onError,
}: {
  id: string;
  mode: 'file' | 'diff';
  split: boolean;
  onCheckpoint: (checkpoint: Checkpoint) => void;
  onError: (id: string, error: string) => void;
}) {
  const [checkpoint, setCheckpoint] = useState<Checkpoint | null>(null);
  const [files, setFiles] = useState<SnapshotFile[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [changes, setChanges] = useState<Change[]>([]);
  const [diffCursor, setDiffCursor] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [path, setPath] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState('');
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [diffError, setDiffError] = useState('');
  const [content, setContent] = useState<{
    key: string;
    before: FileContent | null;
    after: FileContent | null;
  } | null>(null);
  const remembered = useRef(new Map<string, string>());
  const scrollPositions = useRef({ file: 0, diff: 0 });
  const tree = useRef<HTMLDivElement>(null);
  const activeID = useRef(id);
  activeID.current = id;
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setChanges([]);
    setTotal(0);
    setDiffCursor(null);
    setDiffError('');
    setContent(null);
    setFileError('');
    Promise.all([
      get<Checkpoint>('/checkpoints/' + id, controller.signal),
      get<Page<SnapshotFile>>('/checkpoints/' + id + '/tree', controller.signal),
    ])
      .then(([cp, page]) => {
        if (controller.signal.aborted) return;
        setCheckpoint(cp);
        onCheckpoint(cp);
        setFiles(page.items);
        setCursor(page.next_cursor);
        setPath(remembered.current.get(id) || page.items[0]?.path || '');
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setError(message(error));
          onError(id, message(error));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, retry, onCheckpoint, onError]);
  useEffect(() => {
    if (!id || mode !== 'diff') return;
    const controller = new AbortController();
    setDiffError('');
    get<Page<Change>>('/checkpoints/' + id + '/diff', controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return;
        setChanges(page.items);
        setDiffCursor(page.next_cursor);
        setTotal(page.total ?? page.items.length);
        setPath((previous) => previous || page.items[0]?.path || '');
      })
      .catch((error) => {
        if (!controller.signal.aborted) setDiffError(message(error));
      });
    return () => controller.abort();
  }, [id, mode, retry]);
  useEffect(() => {
    if (!id || !path || checkpoint?.id !== id) return;
    const controller = new AbortController();
    setFileLoading(true);
    setFileError('');
    Promise.all([
      capturedFile(id, path, controller.signal),
      mode === 'diff'
        ? capturedFile(checkpoint.parent_id, path, controller.signal)
        : Promise.resolve(null),
    ])
      .then(([after, before]) => {
        if (!controller.signal.aborted)
          setContent({ key: id + ':' + path + ':' + mode, before, after });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setFileError(message(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setFileLoading(false);
      });
    return () => controller.abort();
  }, [id, path, mode, checkpoint, retry]);
  useEffect(() => {
    if (tree.current) tree.current.scrollTop = scrollPositions.current[mode];
  }, [mode]);
  function selectPath(value: string) {
    setPath(value);
    remembered.current.set(id, value);
  }
  async function moreFiles() {
    const current = id;
    try {
      const page = await get<Page<SnapshotFile>>('/checkpoints/' + id + '/tree?cursor=' + cursor);
      if (activeID.current !== current) return;
      setFiles((previous) => [
        ...previous,
        ...page.items.filter((file) => !previous.some((old) => old.path === file.path)),
      ]);
      setCursor(page.next_cursor);
    } catch (error) {
      if (activeID.current === current) setError(message(error));
    }
  }
  async function moreChanges() {
    const current = id;
    try {
      const page = await get<Page<Change>>('/checkpoints/' + id + '/diff?cursor=' + diffCursor);
      if (activeID.current !== current) return;
      setChanges((previous) => [
        ...previous,
        ...page.items.filter((change) => !previous.some((old) => old.path === change.path)),
      ]);
      setDiffCursor(page.next_cursor);
    } catch (error) {
      if (activeID.current === current) setDiffError(message(error));
    }
  }
  const change = changes.find((change) => change.path === path);
  const value = content?.key === id + ':' + path + ':' + mode ? content : null;
  const paths = changes.filter((change) =>
    change.path.toLowerCase().includes(search.toLowerCase()),
  );
  if (!id)
    return (
      <div className="inspection-empty">
        <h2>No historical workspace yet</h2>
        <p>
          This event has no checkpoint at or before it. Select a captured observation to inspect
          files.
        </p>
      </div>
    );
  if (error)
    return (
      <div className="panel-padding">
        <div role="alert" className="error-box">
          {error}
        </div>
        <button onClick={() => setRetry((value) => value + 1)}>Retry checkpoint</button>
      </div>
    );
  return (
    <div className="historical-inspector" aria-busy={loading}>
      {checkpoint?.id === id && (checkpoint.partial || checkpoint.potentially_inconsistent) && (
        <div className="partial-notice">
          <strong>{checkpoint.partial ? 'Partial snapshot' : 'Capture limitation'}</strong>
          {checkpoint.omission_count} omitted paths
          {checkpoint.potentially_inconsistent ? ' · scan may be inconsistent' : ''}
          <details>
            <summary>View omissions</summary>
            <ul>
              {checkpoint.omissions?.map((omission, index) => (
                <li key={index}>
                  <code>{omission.path}</code> — {omission.reason}
                </li>
              ))}
            </ul>
            {checkpoint.omissions_truncated && <p>Only the first 100 omissions are shown.</p>}
          </details>
        </div>
      )}
      {loading ? (
        <div className="inspection-empty" role="status">
          Loading checkpoint…
        </div>
      ) : (
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
                  files={files.filter((file) =>
                    file.path.toLowerCase().includes(search.toLowerCase()),
                  )}
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
          <section className="editor-panel" aria-label="Historical file contents">
            <div className="file-heading">
              <span>{path || 'Select a file'}</span>
              <span className="readonly-label">READ ONLY</span>
            </div>
            {mode === 'diff' && (
              <div className="diff-heading">
                <strong>{total} changed paths</strong>
                <span>
                  {checkpoint?.parent_id
                    ? 'Parent ' + checkpoint.parent_id.slice(0, 8) + ' → ' + id.slice(0, 8)
                    : 'Baseline compared with empty tree'}
                </span>
              </div>
            )}
            {diffError && mode === 'diff' && (
              <div role="alert" className="error-box">
                {diffError}
                <button onClick={() => setRetry((value) => value + 1)}>Retry diff</button>
              </div>
            )}
            {fileLoading ? (
              <div className="inspection-empty" role="status">
                Loading historical file…
              </div>
            ) : fileError ? (
              <div className="panel-padding">
                <div role="alert" className="error-box">
                  {fileError}
                </div>
                <button onClick={() => setRetry((value) => value + 1)}>Retry file</button>
              </div>
            ) : !path ? (
              <div className="inspection-empty">
                <h2>Select a file</h2>
                <p>
                  {mode === 'diff' && !changes.length
                    ? 'No file changes in this captured comparison.'
                    : 'Choose a captured file from the list.'}
                </p>
              </div>
            ) : mode === 'file' ? (
              value?.after ? (
                <CodeViewer content={value.after.content} path={path} stateKey={id + ':' + path} />
              ) : (
                <div className="inspection-empty">
                  This file was not captured in the selected checkpoint. Review its omissions.
                </div>
              )
            ) : change?.binary ? (
              <div className="inspection-empty">
                Binary file changed; contents are not displayed.
              </div>
            ) : change?.truncated ? (
              <div className="inspection-empty">
                Patch omitted because it exceeds the display limit. Select Files to inspect eligible
                individual captures.
              </div>
            ) : value ? (
              <>
                <div className="comparison-labels">
                  <span>{value.before ? 'Parent checkpoint' : 'Not captured in parent'}</span>
                  <span>
                    {value.after ? 'Selected checkpoint' : 'Not captured in selected checkpoint'}
                  </span>
                </div>
                <ComparisonViewer
                  before={value.before?.content || ''}
                  after={value.after?.content || ''}
                  path={path}
                  split={split}
                  stateKey={id + ':' + path + ':comparison'}
                />
              </>
            ) : (
              <div className="inspection-empty" role="status">
                Preparing captured comparison…
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
});
