import { memo, useEffect } from 'react';
import { message } from '../../api';
import { capturedFile } from '../../handlers/capturedFile';
import { getCheckpoint } from '../../handlers/checkpoints';
import { listCheckpointChanges, moreCheckpointChanges } from '../../handlers/diffs';
import { listCheckpointFiles, moreCheckpointFiles } from '../../handlers/files';
import { useHistoricalInspectorState } from '../../hooks/useHistoricalInspectorState';
import type { Checkpoint } from '../../types';
import { HistoricalInspectorFileLayout } from './HistoricalInspectorFileLayout';

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
  const view = useHistoricalInspectorState({ model: { id } });
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    view.setLoading(true);
    view.setError('');
    view.setChanges([]);
    view.setTotal(0);
    view.setDiffCursor(null);
    view.setDiffError('');
    view.setContent(null);
    view.setFileError('');
    Promise.all([getCheckpoint(id, controller.signal), listCheckpointFiles(id, controller.signal)])
      .then(([cp, page]) => {
        if (controller.signal.aborted) return;
        view.setCheckpoint(cp);
        onCheckpoint(cp);
        view.setFiles(page.items);
        view.setCursor(page.next_cursor);
        view.setPath(view.remembered.current.get(id) || page.items[0]?.path || '');
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          view.setError(message(error));
          onError(id, message(error));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) view.setLoading(false);
      });
    return () => controller.abort();
  }, [id, view.retry, onCheckpoint, onError]);
  useEffect(() => {
    if (!id || mode !== 'diff') return;
    const controller = new AbortController();
    view.setDiffError('');
    listCheckpointChanges(id, controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return;
        view.setChanges(page.items);
        view.setDiffCursor(page.next_cursor);
        view.setTotal(page.total ?? page.items.length);
        view.setPath((previous) => previous || page.items[0]?.path || '');
      })
      .catch((error) => {
        if (!controller.signal.aborted) view.setDiffError(message(error));
      });
    return () => controller.abort();
  }, [id, mode, view.retry]);
  useEffect(() => {
    if (!id || !view.path || view.checkpoint?.id !== id) return;
    const controller = new AbortController();
    view.setFileLoading(true);
    view.setFileError('');
    Promise.all([
      capturedFile(id, view.path, controller.signal),
      mode === 'diff'
        ? capturedFile(view.checkpoint.parent_id, view.path, controller.signal)
        : Promise.resolve(null),
    ])
      .then(([after, before]) => {
        if (!controller.signal.aborted)
          view.setContent({ key: id + ':' + view.path + ':' + mode, before, after });
      })
      .catch((error) => {
        if (!controller.signal.aborted) view.setFileError(message(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) view.setFileLoading(false);
      });
    return () => controller.abort();
  }, [id, view.path, mode, view.checkpoint, view.retry]);
  useEffect(() => {
    if (view.tree.current) view.tree.current.scrollTop = view.scrollPositions.current[mode];
  }, [mode]);
  function selectPath(value: string) {
    view.setPath(value);
    view.remembered.current.set(id, value);
  }
  async function moreFiles() {
    const current = id;
    try {
      const page = await moreCheckpointFiles(id, view.cursor);
      if (view.activeID.current !== current) return;
      view.setFiles((previous) => [
        ...previous,
        ...page.items.filter((file) => !previous.some((old) => old.path === file.path)),
      ]);
      view.setCursor(page.next_cursor);
    } catch (error) {
      if (view.activeID.current === current) view.setError(message(error));
    }
  }
  async function moreChanges() {
    const current = id;
    try {
      const page = await moreCheckpointChanges(id, view.diffCursor);
      if (view.activeID.current !== current) return;
      view.setChanges((previous) => [
        ...previous,
        ...page.items.filter((change) => !previous.some((old) => old.path === change.path)),
      ]);
      view.setDiffCursor(page.next_cursor);
    } catch (error) {
      if (view.activeID.current === current) view.setDiffError(message(error));
    }
  }
  const change = view.changes.find((change) => change.path === view.path);
  const value = view.content?.key === id + ':' + view.path + ':' + mode ? view.content : null;
  const paths = view.changes.filter((change) =>
    change.path.toLowerCase().includes(view.search.toLowerCase()),
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
  if (view.error)
    return (
      <div className="panel-padding">
        <div role="alert" className="error-box">
          {view.error}
        </div>
        <button onClick={() => view.setRetry((value) => value + 1)}>Retry checkpoint</button>
      </div>
    );
  return (
    <div className="historical-inspector" aria-busy={view.loading}>
      {view.checkpoint?.id === id &&
        (view.checkpoint.partial || view.checkpoint.potentially_inconsistent) && (
          <div className="partial-notice">
            <strong>{view.checkpoint.partial ? 'Partial snapshot' : 'Capture limitation'}</strong>
            {view.checkpoint.omission_count} omitted paths
            {view.checkpoint.potentially_inconsistent ? ' · scan may be inconsistent' : ''}
            <details>
              <summary>View omissions</summary>
              <ul>
                {view.checkpoint.omissions?.map((omission, index) => (
                  <li key={index}>
                    <code>{omission.path}</code> — {omission.reason}
                  </li>
                ))}
              </ul>
              {view.checkpoint.omissions_truncated && (
                <p>Only the first 100 omissions are shown.</p>
              )}
            </details>
          </div>
        )}
      {view.loading ? (
        <div className="inspection-empty" role="status">
          Loading checkpoint…
        </div>
      ) : (
        <HistoricalInspectorFileLayout
          model={{
            ...view,
            mode,
            selectPath,
            paths,
            moreFiles,
            moreChanges,
            id,
            value,
            change,
            split,
          }}
        />
      )}
    </div>
  );
});
