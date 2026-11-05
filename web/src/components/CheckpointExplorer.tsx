import { useCallback, useEffect, useRef, useState } from 'react';
import type { Checkpoint } from '../types';
import { HistoricalInspector } from './HistoricalInspector';
import { checkpointName } from './VisualHistory';
import { historyDate } from '../history-presentation';

export function CheckpointExplorer({
  id,
  checkpoints,
  onCheckpoint,
  onBack,
  onRestore,
  canRestore,
  more,
  loadMore,
  initialMode = 'file',
}: {
  id: string;
  checkpoints: Checkpoint[];
  onCheckpoint: (id: string) => void;
  onBack: () => void;
  onRestore: (id: string) => void;
  canRestore: boolean;
  more: boolean;
  loadMore: () => void;
  initialMode?: 'file' | 'diff';
}) {
  const [mode, setMode] = useState<'file' | 'diff'>(initialMode);
  const [split, setSplit] = useState(false);
  const [details, setDetails] = useState(false);
  const [loaded, setLoaded] = useState<Checkpoint>();
  const [error, setError] = useState('');
  const toggle = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);
  const cp = loaded?.id === id ? loaded : checkpoints.find((value) => value.id === id);
  const receive = useCallback((value: Checkpoint) => {
    setLoaded(value);
    setError('');
  }, []);
  const fail = useCallback((_id: string, text: string) => setError(text), []);
  return (
    <section
      className="checkpoint-explorer history-workbench"
      aria-label="Checkpoint Explorer"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && details) {
          setDetails(false);
          toggle.current?.focus();
        }
      }}
    >
      <header className="explorer-header">
        <button className="back-history" onClick={onBack}>
          ← History
        </button>
        <div className="explorer-identity">
          <span className="editorial-kicker">CHECKPOINT EXPLORER</span>
          <h1 ref={heading} tabIndex={-1}>
            {cp ? checkpointName(cp) : id.slice(0, 8)}
          </h1>
        </div>
        <button
          ref={toggle}
          aria-expanded={details}
          aria-label={details ? 'Hide checkpoint details' : 'Show checkpoint details'}
          onClick={() => setDetails((value) => !value)}
        >
          Details
        </button>
        <button
          className="primary-button"
          disabled={!canRestore || !loaded || loaded.id !== id || !!error}
          onClick={() => onRestore(id)}
        >
          Restore checkpoint
        </button>
      </header>
      <div className="explorer-navigation">
        <select
          aria-label="Select checkpoint"
          value={id}
          onChange={(e) => onCheckpoint(e.target.value)}
        >
          {!checkpoints.some((value) => value.id === id) && (
            <option value={id}>{id.slice(0, 8)}</option>
          )}
          {checkpoints.map((value) => (
            <option key={value.id} value={value.id}>
              {checkpointName(value)} · {value.id.slice(0, 8)}
              {value.partial ? ' · partial' : ''}
            </option>
          ))}
        </select>
        {more && <button onClick={loadMore}>More checkpoints</button>}
        <span>{cp && historyDate(cp.created_at)}</span>
        <span className="explorer-readonly">READ ONLY</span>
      </div>
      <div className="explorer-mode">
        <div role="tablist" aria-label="Checkpoint inspection">
          {(['file', 'diff'] as const).map((value) => (
            <button
              key={value}
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
            >
              {value === 'file' ? 'Files' : 'Changes'}
            </button>
          ))}
        </div>
        {mode === 'diff' && (
          <div role="group" aria-label="Diff layout">
            <button aria-pressed={!split} onClick={() => setSplit(false)}>
              Inline
            </button>
            <button aria-pressed={split} onClick={() => setSplit(true)}>
              Split
            </button>
          </div>
        )}
        <span>Captured observations · not an atomic snapshot</span>
      </div>
      <div className="explorer-content">
        <HistoricalInspector
          id={id}
          mode={mode}
          split={split}
          onCheckpoint={receive}
          onError={fail}
        />
        {details && (
          <aside className="explorer-details" aria-label="Checkpoint details">
            <button
              aria-label="Close checkpoint details"
              onClick={() => {
                setDetails(false);
                toggle.current?.focus();
              }}
            >
              ×
            </button>
            <h2>Capture details</h2>
            {cp ? (
              <>
                <dl>
                  <dt>Checkpoint</dt>
                  <dd>{cp.id}</dd>
                  <dt>Captured files</dt>
                  <dd>{cp.file_count}</dd>
                  <dt>Completeness</dt>
                  <dd>{cp.partial ? 'Partial capture' : 'Complete within capture policy'}</dd>
                  <dt>Fidelity</dt>
                  <dd>{cp.fidelity}</dd>
                  <dt>Parent checkpoint</dt>
                  <dd>{cp.parent_id || 'Empty tree baseline'}</dd>
                  <dt>Linked event</dt>
                  <dd>{cp.event_id || 'No event link recorded'}</dd>
                </dl>
                {cp.potentially_inconsistent && (
                  <p className="capture-partial">Files may have changed during this scan.</p>
                )}
                <p>
                  Captures do not establish which action authored a change. Restoration creates a
                  separate worktree and does not rewind the Codex conversation.
                </p>
              </>
            ) : (
              <p role="status">Loading capture details…</p>
            )}
            {error && <p role="alert">{error}</p>}
          </aside>
        )}
      </div>
    </section>
  );
}
