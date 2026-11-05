import { useEffect, useRef, useState } from 'react';
import { get, message } from '../api';
import type { Health, Page, Session } from '../types';
import { historyDate } from '../history-presentation';
import { openSetupGuide, type Setup } from './Onboarding';

function Status({ state, label }: { state: string; label: string }) {
  return (
    <span className={'settings-status status-' + state}>
      <i aria-hidden="true" />
      {label}
    </span>
  );
}
export function SettingsPage({ health }: { health: Health | null }) {
  const bridge = window.go?.main?.Desktop;
  const [setup, setSetup] = useState<Setup | null>(null),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState(''),
    [history, setHistory] = useState('unchecked'),
    [historyError, setHistoryError] = useState(''),
    [checked, setChecked] = useState('');
  const controller = useRef<AbortController | null>(null),
    alive = useRef(true),
    running = useRef(false);
  async function check() {
    if (running.current) return;
    running.current = true;
    controller.current?.abort();
    const run = new AbortController();
    controller.current = run;
    setBusy(true);
    setFailure('');
    setHistoryError('');
    setSetup(null);
    setHistory('unchecked');
    try {
      const [native, read] = await Promise.allSettled([
        Promise.resolve().then(() => (bridge ? bridge.CheckSetup() : null)),
        get<Page<Session>>('/sessions?limit=1', run.signal),
      ]);
      if (!alive.current || run.signal.aborted) return;
      if (native.status === 'fulfilled') setSetup(native.value);
      else setFailure(message(native.reason));
      if (read.status === 'fulfilled') setHistory('accessible');
      else {
        setHistory('failed');
        setHistoryError(message(read.reason));
      }
      setChecked(new Date().toISOString());
    } finally {
      if (controller.current === run) {
        running.current = false;
        if (alive.current && !run.signal.aborted) setBusy(false);
      }
    }
  }
  useEffect(() => {
    alive.current = true;
    void check();
    return () => {
      alive.current = false;
      running.current = false;
      controller.current?.abort();
    };
  }, []);
  const codex: Record<string, { state: string; label: string; hint: string; guide: number }> = {
    ready: {
      state: 'ready',
      label: 'Ready',
      hint: 'Version, JSON support, and observable sign-in checked.',
      guide: 3,
    },
    missing: {
      state: 'warning',
      label: 'Not found',
      hint: 'Install Codex or choose its executable in Chat’s Model settings, then relaunch AgentTM.',
      guide: 2,
    },
    incompatible: {
      state: 'warning',
      label: 'Compatibility check failed',
      hint: 'The installed CLI did not pass AgentTM’s exec --json compatibility check. Update it and retry.',
      guide: 2,
    },
    login_required: {
      state: 'warning',
      label: 'Sign-in not confirmed',
      hint: 'Sign in through Codex, then check again. AgentTM does not collect your credentials.',
      guide: 3,
    },
    project_required: {
      state: 'warning',
      label: 'Project required',
      hint: 'Open a Git project before checking recording readiness.',
      guide: 1,
    },
  };
  const cli = codex[setup?.state || ''] || {
    state: 'unknown',
    label: 'Not verified',
    hint:
      failure ||
      (!bridge
        ? 'Use the Setup Guide to check Codex from your terminal.'
        : 'No successful diagnostic result is available.'),
    guide: 3,
  };
  const env = setup?.environment;
  const git = env?.git_state === 'available',
    repo = env?.repository_state === 'valid';
  const capture =
    health?.prompt_mode === 'sanitized'
      ? 'Sanitized prompt text'
      : health?.prompt_mode === 'metadata_only'
        ? 'Metadata only · prompt text off'
        : health?.prompt_mode || 'Not available';
  return (
    <section className="settings-editorial" aria-label="Application settings">
      <header className="settings-heading">
        <div>
          <span className="editorial-kicker">PROJECT & ENVIRONMENT</span>
          <h1>Settings</h1>
          <p>Your current configuration and recording environment.</p>
        </div>
        <button className="settings-guide-action" onClick={() => openSetupGuide(0)}>
          Open setup guide <span aria-hidden="true">↗</span>
        </button>
      </header>
      <div className="settings-content">
        <section className="settings-group" aria-labelledby="settings-general">
          <div className="settings-section-title">
            <h2 id="settings-general">General</h2>
            <span>Loaded project configuration · read only</span>
          </div>
          <div className="settings-row">
            <div className="settings-row-label">
              <h3>Current project</h3>
              <p title={setup?.path}>
                {setup?.path || 'History is scoped to the project open in this window.'}
              </p>
            </div>
            <span className="settings-value">
              {health?.project || setup?.project || 'Not available'}
            </span>
          </div>
          <div className="settings-row">
            <div className="settings-row-label">
              <h3>Prompt capture</h3>
              <p>Configured per project; no changes are made here.</p>
            </div>
            <span className="settings-value">{capture}</span>
          </div>
        </section>
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
          <div className="settings-row" data-diagnostic="git">
            <div className="settings-row-label">
              <h3>
                Git{' '}
                {env?.git_version && (
                  <small>{env.git_version.replace(/^git version\s+/, '')}</small>
                )}
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
            Model access, network requests, and successful tool execution are confirmed only by a
            real run.
          </p>
        </section>
        <section className="settings-group" aria-labelledby="settings-about">
          <div className="settings-section-title">
            <h2 id="settings-about">About</h2>
          </div>
          <div className="settings-row">
            <div className="settings-row-label">
              <h3>AgentTM version</h3>
            </div>
            <span className="settings-value">{health?.version || 'Not available'}</span>
          </div>
          <div className="settings-row">
            <div className="settings-row-label">
              <h3>Interface</h3>
            </div>
            <span className="settings-value">
              {bridge ? 'Windows desktop' : 'Browser dashboard'}
            </span>
          </div>
          <p className="settings-check-note">
            History stays on this device. Codex uses its configured service.
          </p>
        </section>
      </div>
    </section>
  );
}
