import { openSetupGuide } from '../../utils/openSetupGuide';
import { Status } from '../atoms/Status';

export function SettingsSettingsRow({
  model: viewModel,
}: {
  model: {
    env: { git_state: string; git_version: string; repository_state: string } | undefined;
    git: boolean;
    busy: boolean;
  };
}) {
  const { env, git, busy } = viewModel;
  return (
    <div className="settings-row" data-diagnostic="git">
      <div className="settings-row-label">
        <h3>
          Git {env?.git_version && <small>{env.git_version.replace(/^git version\s+/, '')}</small>}
        </h3>
        <p>
          {git
            ? 'Executable and reported version checked.'
            : env?.git_state === 'missing'
              ? 'Make Git available on PATH and relaunch AgentTM.'
              : env?.git_state === 'failed'
                ? 'Git version check failed. Confirm the Git installation and retry.'
                : 'A native Git check has not been confirmed.'}
        </p>
      </div>
      <Status
        state={busy ? 'unknown' : git ? 'ready' : env?.git_state ? 'warning' : 'unknown'}
        label={
          busy
            ? 'Checking…'
            : git
              ? 'Available'
              : env?.git_state === 'missing'
                ? 'Not found'
                : env?.git_state === 'failed'
                  ? 'Check failed'
                  : 'Not verified'
        }
      />
      {!git && !busy && <button onClick={() => openSetupGuide(1)}>Setup help</button>}
    </div>
  );
}
