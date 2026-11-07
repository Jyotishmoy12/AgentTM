import { historyDate } from '../../history-presentation';
import type { Setup } from '../../types/Onboarding';
import { openSetupGuide } from '../../utils/openSetupGuide';
import { Status } from '../atoms/Status';
import { SettingsSettingsRow } from './SettingsSettingsRow';
import { SettingsSettingsRow2 } from './SettingsSettingsRow2';

export function SettingsSettingsGroup({
  model: viewModel,
}: {
  model: {
    busy: boolean;
    check: () => Promise<void>;
    setup: Setup | null;
    cli: { state: string; label: string; hint: string; guide: number };
    env: { git_state: string; git_version: string; repository_state: string } | undefined;
    git: boolean;
    repo: boolean;
    history: string;
    historyError: string;
    failure: string;
    checked: string;
  };
}) {
  const { busy, check, setup, cli, env, git, repo, history, historyError, failure, checked } =
    viewModel;
  return (
    <section className="settings-group" aria-labelledby="settings-environment">
      <div className="settings-section-title">
        <h2 id="settings-environment">Environment</h2>
        <button disabled={busy} onClick={check}>
          {busy ? 'Checking…' : 'Check again'}
        </button>
      </div>
      <div className="settings-row" data-diagnostic="codex">
        <div className="settings-row-label">
          <h3>Codex CLI {setup?.version && <small>{setup.version}</small>}</h3>
          <p>{busy ? 'Checking the configured Codex executable…' : cli.hint}</p>
        </div>
        <Status state={busy ? 'unknown' : cli.state} label={busy ? 'Checking…' : cli.label} />
        {!busy && cli.state !== 'ready' && (
          <button onClick={() => openSetupGuide(cli.guide)}>Setup help</button>
        )}
      </div>
      <SettingsSettingsRow model={{ env, git, busy }} />
      <SettingsSettingsRow2 model={{ repo, env, busy }} />
      <div className="settings-row" data-diagnostic="history">
        <div className="settings-row-label">
          <h3>History database</h3>
          <p>
            {history === 'accessible'
              ? 'History API read succeeded. This is not a storage-integrity scan.'
              : historyError || 'No successful history read has been confirmed.'}
          </p>
        </div>
        <Status
          state={
            busy
              ? 'unknown'
              : history === 'accessible'
                ? 'ready'
                : history === 'failed'
                  ? 'warning'
                  : 'unknown'
          }
          label={
            busy
              ? 'Checking…'
              : history === 'accessible'
                ? 'Readable'
                : history === 'failed'
                  ? 'Read failed'
                  : 'Not checked'
          }
        />
      </div>
      {failure && (
        <p className="settings-diagnostic-error" role="alert">
          Could not complete the native diagnostic: {failure}
        </p>
      )}
      <p className="settings-check-note">
        {checked
          ? (failure || history === 'failed' ? 'Last attempt ' : 'Last checked ') +
            historyDate(checked) +
            ' · '
          : ''}
        Model access, network requests, and successful tool execution are confirmed only by a real
        run.
      </p>
    </section>
  );
}
