import { useEffect, useState } from 'react';
import { message } from '../../api';
import { listSessionOperations, moreSessionOperations } from '../../handlers/operations';
import type { Operation } from '../../types/Operations';

export function Operations({
  session,
  inspect,
}: {
  session: string;
  inspect: (id: string) => void;
}) {
  const [items, setItems] = useState<Operation[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setItems([]);
    setCursor(null);
    listSessionOperations(session, controller.signal)
      .then((page) => {
        setItems(page.items);
        setCursor(page.next_cursor);
        setError('');
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(message(e));
      });
    return () => controller.abort();
  }, [session, revision]);
  async function more() {
    try {
      const page = await moreSessionOperations(session, cursor);
      setItems((old) => [...old, ...page.items]);
      setCursor(page.next_cursor);
    } catch (e) {
      setError(message(e));
    }
  }
  return (
    <div className="page-scroll operations-view">
      <p>
        Inspect workspace states captured at received tool boundaries. These observations do not
        prove which action authored a change.{' '}
        <button onClick={() => setRevision((n) => n + 1)}>Refresh operations</button>
      </p>
      {error && (
        <div role="alert" className="error-box">
          {error}
        </div>
      )}
      {!items.length && !error && (
        <p>
          No operation boundaries recorded. Start a new recording to capture them; older recordings
          retain their existing history.
        </p>
      )}
      {items.map((op) => (
        <article key={op.id} className="operation-card">
          <h3>
            {op.tool.replaceAll('_', ' ')} <small>· {op.status}</small>
          </h3>
          <p>
            {new Date(op.started_at).toLocaleString()} · Capture:{' '}
            {op.capture_status.replaceAll('_', ' ')}
          </p>
          {op.overlapping && (
            <p className="warning-box">
              Overlapping operations: captured changes may include other operations.
            </p>
          )}
          {op.missing_start && (
            <p className="warning-box">Start notification missing; no before state is inferred.</p>
          )}
          {op.error && <p className="warning-box">{op.error}</p>}
          <div>
            <button
              disabled={!op.before_checkpoint_id}
              onClick={() => inspect(op.before_checkpoint_id)}
            >
              Inspect before
            </button>{' '}
            <button
              disabled={!op.after_checkpoint_id}
              onClick={() => inspect(op.after_checkpoint_id)}
            >
              Inspect after
            </button>
          </div>
          {op.before_checkpoint_id && op.after_checkpoint_id && (
            <details>
              <summary>{op.changed_path_count} changed paths between observations</summary>
              <ul>
                {op.changed_paths.map((path) => (
                  <li key={path}>
                    <code>{path}</code>
                  </li>
                ))}
              </ul>
              {op.changed_path_count > op.changed_paths.length && (
                <p>
                  Showing first {op.changed_paths.length} paths. Inspect checkpoints for full
                  contents.
                </p>
              )}
            </details>
          )}
        </article>
      ))}
      {cursor !== null && <button onClick={more}>Load more operations</button>}
    </div>
  );
}
