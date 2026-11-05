import { memo } from 'react';
import { changedPaths, record } from '../state';
import type { Checkpoint, RecordedEvent } from '../types';

export const ContextPanel = memo(function ContextPanel({
  event,
  checkpoint,
  checkpointID,
  exact,
  manual,
  error,
  canRestore,
  onRestore,
  onClose,
}: {
  event?: RecordedEvent;
  checkpoint?: Checkpoint;
  checkpointID: string;
  exact: boolean;
  manual: boolean;
  error: string;
  canRestore: boolean;
  onRestore: () => void;
  onClose: () => void;
}) {
  const payload = record(event?.payload);
  const item = record(payload.item);
  const paths = event ? changedPaths(event) : [];
  return (
    <aside className="activity-panel workspace-context" aria-label="Event and checkpoint details">
      <div className="panel-heading">
        <h2>Activity</h2>
        <button onClick={onClose} aria-label="Close details panel" title="Close details panel">
          ×
        </button>
      </div>
      <div className="activity-content">
        <div className="context-section-label">
          {manual ? 'SELECTED CHECKPOINT' : 'SELECTED OBSERVATION'}
        </div>
        <h3>
          {manual
            ? checkpoint?.kind.replaceAll('_', ' ') || checkpointID.slice(0, 8)
            : event?.kind.replace('agenttm.', '').replaceAll('.', ' / ') || 'Select an event'}
        </h3>
        <dl className="details">
          {event && !manual && (
            <>
              <dt>Event</dt>
              <dd>#{event.sequence}</dd>
              <dt>Received</dt>
              <dd>{new Date(event.received_at).toLocaleString()}</dd>
              <dt>Tool</dt>
              <dd>{event.tool_name?.replaceAll('_', ' ') || '—'}</dd>
              <dt>Status</dt>
              <dd>{typeof item.status === 'string' ? item.status : 'Recorded'}</dd>
            </>
          )}
          <dt>Checkpoint</dt>
          <dd>
            <code>{checkpointID ? checkpointID.slice(0, 8) : 'Not yet observed'}</code>
          </dd>
          {checkpoint && (
            <>
              <dt>Captured</dt>
              <dd>{new Date(checkpoint.created_at).toLocaleString()}</dd>
              <dt>Files</dt>
              <dd>{checkpoint.file_count} captured</dd>
              <dt>Fidelity</dt>
              <dd>{checkpoint.fidelity || 'Not specified'}</dd>
              <dt>Parent</dt>
              <dd>{checkpoint.parent_id?.slice(0, 8) || 'Empty tree baseline'}</dd>
            </>
          )}
        </dl>
        {error && (
          <div className="error-box" role="alert">
            <strong>Unavailable checkpoint</strong>
            <p>{error}</p>
          </div>
        )}
        {checkpointID && !checkpoint && !error && (
          <p role="status" className="muted">
            Loading workspace metadata…
          </p>
        )}
        <section className="context-observation">
          <h4>Workspace observation</h4>
          <p>
            {manual
              ? 'This checkpoint was selected independently of the event.'
              : exact
                ? 'Checkpoint linked to this received observation.'
                : checkpointID
                  ? 'Last known workspace · this event has no checkpoint.'
                  : 'No checkpoint was observed at or before this event.'}
          </p>
          {checkpoint?.potentially_inconsistent && (
            <div className="warning-box">Files may have changed during the scan.</div>
          )}
          {checkpoint?.partial && (
            <div className="warning-box">
              <strong>Partial capture</strong>
              <p>{checkpoint.omission_count} omitted paths. Review them before restoring.</p>
              <details>
                <summary>Capture omissions</summary>
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
        </section>
        {!!paths.length && (
          <section>
            <h4>{paths.length} observed changed paths</h4>
            <ul className="changed-paths">
              {paths.map((path) => (
                <li key={path}>{path}</li>
              ))}
            </ul>
          </section>
        )}
        {typeof item.command === 'string' && (
          <section>
            <h4>Command</h4>
            <pre className="payload-text">{item.command}</pre>
          </section>
        )}
        {typeof item.aggregated_output === 'string' && (
          <section>
            <h4>Tool output</h4>
            <pre className="payload-text">{item.aggregated_output || '(No output)'}</pre>
          </section>
        )}
        {typeof item.text === 'string' && (
          <section>
            <h4>Agent message</h4>
            <p className="agent-message">{item.text}</p>
          </section>
        )}
        {payload.truncated === true && (
          <div className="warning-box">Stored event payload was truncated.</div>
        )}
        {event && (
          <details className="payload-details">
            <summary>Sanitized event payload</summary>
            <pre className="payload-text">{JSON.stringify(event.payload, null, 2)}</pre>
          </details>
        )}
        <div className="attribution-note">
          Workspace observations are not atomic and do not establish causal line attribution. File
          changes can also come from other tools or background processes.
        </div>
      </div>
      <div className="context-restore">
        <button
          className="primary-button"
          disabled={!canRestore || !checkpoint || !!error}
          onClick={onRestore}
        >
          Restore checkpoint
        </button>
        <small>
          Creates an isolated Git worktree. Your original working tree, index, and HEAD stay in
          place.
        </small>
      </div>
    </aside>
  );
});
