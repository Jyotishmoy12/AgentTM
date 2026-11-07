import { Status } from '../atoms/Status';

export function SettingsSettingsRow2({
  model: viewModel,
}: {
  model: {
    repo: boolean;
    env: { git_state: string; git_version: string; repository_state: string } | undefined;
    busy: boolean;
  };
}) {
  const { repo, env, busy } = viewModel;
  return (
    <div className="settings-row" data-diagnostic="repository">
      <div className="settings-row-label">
        <h3>Git working tree</h3>
        <p>
          {repo
            ? 'The discovered Git root matches the project open in AgentTM.'
            : env?.repository_state === 'invalid' || env?.repository_state === 'changed'
              ? 'The project could not be verified as its expected Git working tree. Reopen the correct project.'
              : 'Repository validity has not been checked in this environment.'}
        </p>
      </div>
      <Status
        state={
          busy
            ? 'unknown'
            : repo
              ? 'ready'
              : ['invalid', 'changed'].includes(env?.repository_state || '')
                ? 'warning'
                : 'unknown'
        }
        label={
          busy
            ? 'Checking…'
            : repo
              ? 'Verified'
              : ['invalid', 'changed'].includes(env?.repository_state || '')
                ? 'Not verified'
                : 'Not checked'
        }
      />
    </div>
  );
}
