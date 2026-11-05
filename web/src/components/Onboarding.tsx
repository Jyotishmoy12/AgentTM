import { DialogClose } from './DialogClose';
import { useEffect, useRef, useState } from 'react';
import './onboarding.css';
import { message } from '../api';

export interface Setup {
  state: string;
  version: string;
  project: string;
  path: string;
  environment?: {
    git_state: string;
    git_version: string;
    repository_state: string;
  };
}
interface DesktopBridge {
  CheckSetup(): Promise<Setup>;
  CopyText(text: string): Promise<void>;
  OpenCodexDocs(): Promise<void>;
}
declare global {
  interface Window {
    go?: { main?: { Desktop?: DesktopBridge } };
  }
}
const steps = [
  'Welcome',
  'Your workspace',
  'Install Codex',
  'Sign in & verify',
  'First recording',
  'History basics',
  'Capture & limits',
  'Restore safely',
];
export function openSetupGuide(step = 0) {
  window.dispatchEvent(new CustomEvent('agenttm:setup-guide', { detail: step }));
}
function GuideDialog({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const node = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = node.current;
    const opener = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      requestAnimationFrame(() => {
        if (opener instanceof HTMLElement && opener.isConnected)
          opener.focus({ preventScroll: true });
      });
    };
  }, []);
  return (
    <dialog
      ref={node}
      className="setup-dialog"
      aria-labelledby="setup-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {children}
    </dialog>
  );
}
const completionKey = 'agenttm:onboarding:v1';

export function Onboarding({ projectName }: { projectName?: string }) {
  const bridge = window.go?.main?.Desktop;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [checkedAt, setCheckedAt] = useState('');
  useEffect(() => {
    const show = (event: Event) => {
      const value = (event as CustomEvent).detail;
      setStep(Number.isInteger(value) && value >= 0 && value < steps.length ? value : 0);
      setOpen(true);
      void check();
    };
    window.addEventListener('agenttm:setup-guide', show);
    return () => window.removeEventListener('agenttm:setup-guide', show);
  }, []);
  async function check() {
    if (!bridge) return;
    setBusy(true);
    setError('');
    try {
      const result = await bridge.CheckSetup();
      setSetup(result);
      setCheckedAt(new Date().toLocaleTimeString());
      return result;
    } catch (e) {
      setSetup(null);
      setError('Could not check your setup: ' + message(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!bridge) return;
    let disposed = false;
    check().then((result) => {
      if (disposed) return;
      let completed = false;
      try {
        completed = localStorage.getItem(completionKey) === 'done';
      } catch {
        /* storage may be unavailable */
      }
      if (!completed || result?.state !== 'ready') setOpen(true);
    });
    return () => {
      disposed = true;
    };
  }, [bridge]);
  async function copy(text: string) {
    try {
      if (bridge) await bridge.CopyText(text);
      else await navigator.clipboard.writeText(text);
      setCopied(text);
    } catch {
      setError('Could not copy. Select and copy the command manually.');
    }
  }
  const command = (text: string) => (
    <div className="setup-command">
      <code>{text}</code>
      <button onClick={() => copy(text)}>{copied === text ? 'Copied' : 'Copy'}</button>
    </div>
  );
  const ready = setup?.state === 'ready';
  const status = busy
    ? 'Checking Codex…'
    : error && !setup
      ? 'Readiness could not be verified'
      : ready
        ? 'Codex is ready'
        : setup?.state === 'login_required'
          ? 'Sign-in could not be confirmed'
          : setup?.state === 'incompatible'
            ? 'Codex was found but could not pass the compatibility check'
            : 'Codex is not available to AgentTM';
  return (
    <>
      <button className="setup-launcher" onClick={() => setOpen(true)}>
        Setup guide
      </button>
      {open && (
        <GuideDialog onClose={() => setOpen(false)}>
          <nav className="setup-steps" aria-label="Setup steps">
            <strong>AgentTM</strong>
            <p>Get ready to record</p>
            {steps.map((name, i) => (
              <button
                key={name}
                aria-current={i === step ? 'step' : undefined}
                onClick={() => setStep(i)}
              >
                <span>{i < 5 ? i + 1 : '↗'}</span>
                {name}
              </button>
            ))}
            <small>Everything starts on your device.</small>
          </nav>
          <div className="setup-main">
            <div className="setup-top">
              <span>{step < 5 ? 'STEP ' + (step + 1) + ' OF 5' : 'SETUP GUIDE · REFERENCE'}</span>
              <DialogClose label="Close setup guide" onClick={() => setOpen(false)} />
            </div>
            <div className="setup-body">
              <h1 id="setup-title">{steps[step]}</h1>
              {step === 0 && (
                <>
                  <p>Give your coding agent a workspace history.</p>
                  <p>
                    AgentTM records sessions launched through its CLI or Chat with Codex. Inspect
                    the timeline, compare captured files, and restore a checkpoint into a separate
                    Git worktree.
                  </p>
                  <div className="setup-callout">
                    You can explore existing recordings immediately. Codex is needed only for new
                    recordings.
                  </div>
                  <h2>What you will need</h2>
                  <ul>
                    <li>A Git repository for your project.</li>
                    <li>Codex CLI installed and signed in.</li>
                    <li>A terminal for installation, sign-in, and optional CLI recording.</li>
                  </ul>
                  <p>
                    AgentTM stores history in your project's <code>.agenttm</code> folder. Codex
                    uses its own account and network connection.
                  </p>
                </>
              )}
              {step === 1 && (
                <>
                  <p>This window is viewing the project below.</p>
                  <div className="setup-callout">
                    <strong>{setup?.project || 'Checking project…'}</strong>
                    <code>{setup?.path || 'Loading workspace path…'}</code>
                  </div>
                  <h2>Open PowerShell in this folder</h2>
                  <p>
                    In File Explorer, open the project folder, right-click and choose “Open in
                    Terminal”. Check that Git can see the repository:
                  </p>
                  {command('git --version')}
                  {command('git status')}
                  <p>For a different project, open a terminal there and initialize AgentTM:</p>
                  {command('agenttm init')}
                  <p>
                    This window stays with its current project. To choose another, close and reopen
                    AgentTM outside an initialized project, then choose Open a Git project on the
                    welcome screen.
                  </p>
                  <p>
                    Do not run <code>git init</code> in an unrelated folder just to dismiss a setup
                    error.
                  </p>
                </>
              )}
              {step === 2 && (
                <>
                  <p>
                    AgentTM needs the standalone Codex CLI. Having the editor extension alone does
                    not guarantee that the desktop app can find it.
                  </p>
                  <h2>Install from PowerShell</h2>
                  <p>If Node.js and npm are installed, run:</p>
                  {command('npm.cmd install -g @openai/codex')}
                  <p>
                    If npm is missing, install Node.js with npm first, or follow the official Codex
                    installation guide.
                  </p>
                  <button
                    onClick={() =>
                      bridge
                        ? bridge
                            .OpenCodexDocs()
                            .catch(() =>
                              setError(
                                'Could not open documentation. Visit developers.openai.com/codex/cli.',
                              ),
                            )
                        : window.open(
                            'https://developers.openai.com/codex/cli',
                            '_blank',
                            'noopener,noreferrer',
                          )
                    }
                  >
                    Open official Codex guide ↗
                  </button>
                  <h2>Confirm the command works</h2>
                  {command('codex --version')}
                  <p>
                    If Windows says “not recognized”, Codex is not on PATH. Reopen PowerShell after
                    installing. Fully close and relaunch AgentTM from that new terminal so it
                    inherits the updated PATH.
                  </p>
                  <p>
                    If Codex is found but the compatibility check fails, update it using the install
                    command above and check again.
                  </p>
                </>
              )}
              {step === 3 && (
                <>
                  <p>
                    Sign in through Codex itself. AgentTM does not ask you to paste passwords,
                    tokens, or API keys into this screen.
                  </p>
                  {command('codex login')}
                  {command('codex login status')}
                  <p>Follow the sign-in prompts in your terminal/browser, then check again here.</p>
                  <div className={`setup-callout ${ready ? 'setup-ready' : ''}`} role="status">
                    <strong>{bridge ? status : 'Run the readiness check in your terminal'}</strong>
                    {setup?.version && <code>{setup.version}</code>}
                    {checkedAt && <small>Last checked at {checkedAt}</small>}
                  </div>
                  {bridge ? (
                    <button disabled={busy} onClick={() => check()}>
                      {busy ? 'Checking…' : 'Check again'}
                    </button>
                  ) : (
                    command('agenttm codex doctor')
                  )}
                  <p>
                    Installation, JSON support, and observable login readiness are checked. Model
                    access and network connectivity are confirmed only by a real run.
                  </p>
                </>
              )}
              {step === 4 && (
                <>
                  <p>
                    In the desktop app, start a new Chat with Codex in Read only mode for a small
                    first task. For terminal recording, use the installed agenttm CLI in the same
                    Git project:
                  </p>
                  {command('agenttm run codex -- "Reply with a greeting."')}
                  <p>
                    Use your configured Codex model. If model access fails, choose a model available
                    to your account with <code>--model MODEL</code>.
                  </p>
                  <h2>Inspect your recording</h2>
                  <ol>
                    <li>Wait for the terminal to print the completed session.</li>
                    <li>Return here and click “Refresh history”.</li>
                    <li>Select the session to inspect its timeline.</li>
                    <li>Select a checkpoint to browse files or compare changes.</li>
                    <li>
                      Use “Restore checkpoint” to restore into a separate workspace after reviewing
                      the destination.
                    </li>
                  </ol>
                  <div className="setup-callout">
                    Only AgentTM-managed CLI runs and desktop chats are recorded. Checkpoints are
                    workspace observations; other programs can also change files between
                    observations.
                  </div>
                  <p>You can reopen this guide anytime using “Setup guide”.</p>
                </>
              )}
              {step === 5 && (
                <>
                  <p>
                    Recorded activity and captured workspace states are related, distinct kinds of
                    history.
                  </p>
                  <dl className="guide-terms">
                    <dt>Session</dt>
                    <dd>
                      One AgentTM-managed CLI run or recorded desktop chat turn. Its events describe
                      received activity.
                    </dd>
                    <dt>Event</dt>
                    <dd>
                      A prompt, message, command notification, lifecycle update, or capture
                      notification. It may have no linked checkpoint.
                    </dd>
                    <dt>Checkpoint</dt>
                    <dd>
                      A captured set of eligible project files. It is a workspace observation, not a
                      Git commit or an atomic snapshot.
                    </dd>
                    <dt>Changes</dt>
                    <dd>
                      A comparison with the checkpoint’s recorded parent. Baselines compare with an
                      empty tree.
                    </dd>
                  </dl>
                  <h2>Explore a recording</h2>
                  <ol>
                    <li>Open History and choose the session.</li>
                    <li>
                      Use event icons, filters, and checkpoint milestones to find the moment you
                      need.
                    </li>
                    <li>Choose Inspect checkpoint to open its read-only files or comparisons.</li>
                    <li>
                      Open Details for technical metadata; expand omissions on partial captures.
                    </li>
                  </ol>
                  <h2>Check stored history</h2>
                  {command('agenttm doctor')}
                  <p>
                    Read the output carefully: storage integrity and Codex readiness are separate
                    diagnostics.
                  </p>
                </>
              )}
              {step === 6 && (
                <>
                  <p>
                    AgentTM observes files; it does not prove which agent action authored each line.
                  </p>
                  <h2>What is captured</h2>
                  <p>
                    Baseline and final workspace observations, plus supported manual and optional
                    tool-boundary captures. When enabled, boundary observations describe
                    before/after workspace states around received tool notifications.
                  </p>
                  <h2>Observation limits</h2>
                  <ul>
                    <li>
                      Scans are not atomic. Other programs or overlapping operations can change
                      files while a scan runs.
                    </li>
                    <li>
                      An event without a linked checkpoint does not establish a new file state.
                    </li>
                    <li>
                      Exact causal line attribution and deterministic replay of AI reasoning are not
                      provided.
                    </li>
                  </ul>
                  <h2>Partial captures</h2>
                  <p>
                    Excluded paths, Git-ignored files, configured size limits, unsupported file
                    types, or scan consistency issues can limit a capture. The inspector lists
                    recorded omissions; missing files must not be treated as captured.
                  </p>
                  <h2>Prompt privacy</h2>
                  <p>
                    Prompt text capture is off by default. Sanitized prompt capture is a project
                    configuration option; redaction is best-effort and historical file contents are
                    not secret-redacted.
                  </p>
                  <h2>Keep your first test small</h2>
                  {command('agenttm run codex -- "Explain this project"')}
                  <p>
                    Only tasks launched through AgentTM are recorded. Codex uses its configured
                    service; the entire workflow is not offline.
                  </p>
                </>
              )}
              {step === 7 && (
                <>
                  <p>
                    Checkpoint restoration creates an isolated Git worktree. It does not replace
                    your original project.
                  </p>
                  <ol>
                    <li>
                      Inspect the checkpoint’s captured files and supported parent comparison.
                    </li>
                    <li>
                      Review every partial-capture warning, omission, and consistency limitation.
                    </li>
                    <li>Choose Restore checkpoint and review the destination and branch.</li>
                    <li>
                      Confirm the restore. Open Restored workspaces to find the resulting folder.
                    </li>
                  </ol>
                  <div className="setup-callout">
                    The original working tree, index, and HEAD stay unchanged. Restoration does not
                    rewind the Codex conversation.
                  </div>
                  <h2>What stays outside the restore</h2>
                  <p>
                    Dependencies, excluded files, external services, credentials, and unsupported
                    filesystem state may be absent. No restored code or installer is executed
                    automatically.
                  </p>
                  <h2>Continue deliberately</h2>
                  <p>
                    Open the separate folder in your editor and review it before bringing changes
                    back. Continue in chat resumes a saved Codex thread; it is not a
                    checkpoint-based agent rewind.
                  </p>
                </>
              )}
              {error && (
                <p className="error-box" role="alert">
                  {error}
                </p>
              )}
            </div>
            {step < 5 ? (
              <footer className="setup-actions">
                <button onClick={() => setOpen(false)}>Explore history for now</button>
                <div>
                  <button disabled={step === 0} onClick={() => setStep((n) => n - 1)}>
                    Back
                  </button>
                  {step < 4 ? (
                    <button className="primary-button" onClick={() => setStep((n) => n + 1)}>
                      Continue
                    </button>
                  ) : (
                    <button
                      className="primary-button"
                      disabled={!!bridge && (!ready || busy)}
                      onClick={() => {
                        try {
                          localStorage.setItem(completionKey, 'done');
                        } catch {
                          /* optional preference */
                        }
                        setOpen(false);
                      }}
                    >
                      Finish setup
                    </button>
                  )}
                </div>
                {step === 4 && !!bridge && !ready && (
                  <small>
                    Check Codex readiness in step 4 before finishing, or explore history now.
                  </small>
                )}
              </footer>
            ) : (
              <footer className="setup-actions">
                <button onClick={() => setStep(4)}>First recording</button>
                <button className="primary-button" onClick={() => setOpen(false)}>
                  Done reading
                </button>
              </footer>
            )}
          </div>
        </GuideDialog>
      )}
    </>
  );
}
