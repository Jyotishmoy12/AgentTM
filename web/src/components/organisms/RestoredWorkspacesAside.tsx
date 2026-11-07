import { date, identity, resultLabel } from '../../data/RestoredWorkspaces';
import type { RestoredWorkspace } from '../../types';
import type { FolderState, RestoreBridge } from '../../types/RestoredWorkspaces';
import { FolderIcon } from '../atoms/FolderIcon';
import { RestoredWorkspacesRestoreLiveCheck } from './RestoredWorkspacesRestoreLiveCheck';

export function RestoredWorkspacesAside({
  model: viewModel,
}: {
  model: {
    narrow: boolean;
    item: RestoredWorkspace;
    close: () => void;
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
  } = viewModel;
  return (
    <aside
      className={'restores-details ' + (narrow ? 'restores-drawer' : '')}
      aria-label="Selected workspace details"
    >
      <div className="restores-details-heading">
        <FolderIcon />
        <div>
          <span className="editorial-kicker">SELECTED WORKSPACE</span>
          <h2>{identity(item)}</h2>
        </div>
        {narrow && (
          <button aria-label="Close workspace details" onClick={close}>
            ×
          </button>
        )}
      </div>
      <div className={'restore-result result-' + item.status}>
        <i aria-hidden="true" />
        {resultLabel(item.status)} <span>· recorded result</span>
      </div>
      <div className="restores-detail-actions">
        <button disabled={!!action || !item.worktree_path} onClick={() => perform('copy')}>
          {action === 'copy' ? 'Copying…' : 'Copy path'}
        </button>
        <button disabled={!!action || !item.checkpoint_id} onClick={() => perform('inspect')}>
          {action === 'inspect' ? 'Opening source…' : 'Inspect source checkpoint'}
        </button>
        <button
          className="primary-button"
          disabled={
            !bridge?.OpenRestoredWorkspace || !!action || (!!folder && folder.state !== 'available')
          }
          onClick={() => perform('open')}
        >
          {action === 'open' ? 'Opening…' : 'Open folder'}
        </button>
      </div>
      {!bridge?.OpenRestoredWorkspace && (
        <p className="restore-browser-note">
          Copy this path to open it in your file manager or editor. Opening folders here requires
          the updated Windows desktop app.
        </p>
      )}
      {feedback && (
        <p className="restore-feedback" role="status">
          {feedback}
        </p>
      )}
      {actionError && (
        <div className="restores-error" role="alert">
          {actionError}
        </div>
      )}
      <dl>
        <dt>Folder location</dt>
        <dd className="restore-full-path">{item.worktree_path || 'Not recorded'}</dd>
        <dt>Git branch</dt>
        <dd>
          <code>{item.branch_name || 'Not recorded'}</code>
        </dd>
        <dt>Source checkpoint</dt>
        <dd>
          <button
            className="restore-source-link"
            disabled={!item.checkpoint_id || !!action}
            onClick={() => perform('inspect')}
          >
            {item.checkpoint_id || 'Not recorded'} <span aria-hidden="true">↗</span>
          </button>
        </dd>
        <dt>Restoration recorded</dt>
        <dd>{date(item.created_at)}</dd>
      </dl>
      <RestoredWorkspacesRestoreLiveCheck
        model={{ bridge, checking, action, checkFolder, folder }}
      />
      <p className="restore-safety-note">
        Restore results describe the original operation, not live Git health. Your original working
        tree, index, and HEAD stay in place. Restoring does not rewind the Codex conversation.
      </p>
    </aside>
  );
}
