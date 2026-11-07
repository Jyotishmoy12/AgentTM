import { date } from '../../data/RestoredWorkspaces';
import type { FolderState, RestoreBridge } from '../../types/RestoredWorkspaces';

export function RestoredWorkspacesRestoreLiveCheck({
  model: viewModel,
}: {
  model: {
    bridge: RestoreBridge | undefined;
    checking: boolean;
    action: string;
    checkFolder: () => Promise<void>;
    folder: FolderState | null;
  };
}) {
  const { bridge, checking, action, checkFolder, folder } = viewModel;
  return (
    <div className="restore-live-check">
      <div>
        <h3>Folder availability</h3>
        {bridge?.CheckRestoredWorkspace && (
          <button disabled={checking || !!action} onClick={checkFolder}>
            {checking ? 'Checking…' : folder ? 'Check again' : 'Check folder'}
          </button>
        )}
      </div>
      {folder ? (
        <>
          <p className={'folder-state folder-' + folder.state}>
            {{
              available: 'Folder accessible',
              missing: 'Folder not found',
              inaccessible: 'Folder inaccessible',
              blocked: 'Folder access blocked',
            }[folder.state] || 'Not confirmed'}
          </p>
          <p>{folder.message}</p>
          <small>Checked {date(folder.checked_at)}</small>
        </>
      ) : (
        <p>
          {bridge?.CheckRestoredWorkspace
            ? 'Not checked. The saved restore result does not confirm its current condition.'
            : 'Live folder checks are available in the updated Windows desktop app.'}
        </p>
      )}
    </div>
  );
}
