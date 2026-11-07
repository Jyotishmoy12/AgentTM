import { steps } from '../../data/Onboarding';
import { copyText } from '../../handlers/native';
import { useOnboardingState } from '../../hooks/useOnboardingState';
import { DialogClose } from '../atoms/DialogClose';
import { GuideDialog } from '../molecules/GuideDialog';
import { OnboardingContent } from './OnboardingContent';
import { OnboardingContent2 } from './OnboardingContent2';
import { OnboardingContent3 } from './OnboardingContent3';
import { OnboardingContent4 } from './OnboardingContent4';
import { OnboardingContent5 } from './OnboardingContent5';
import { OnboardingSetupActions } from './OnboardingSetupActions';

export function Onboarding({}: { projectName?: string }) {
  const {
    bridge,
    open,
    setOpen,
    step,
    setStep,
    setup,
    busy,
    error,
    setError,
    copied,
    setCopied,
    checkedAt,
    check,
  } = useOnboardingState();
  async function copy(text: string) {
    try {
      if (bridge) await bridge.CopyText(text);
      else await copyText(text);
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
              {step === 2 && <OnboardingContent2 model={{ command, bridge, setError }} />}
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
              {step === 4 && <OnboardingContent5 model={{ command }} />}
              {step === 5 && <OnboardingContent model={{ command }} />}
              {step === 6 && <OnboardingContent3 model={{ command }} />}
              {step === 7 && <OnboardingContent4 />}
              {error && (
                <p className="error-box" role="alert">
                  {error}
                </p>
              )}
            </div>
            {step < 5 ? (
              <OnboardingSetupActions model={{ setOpen, step, setStep, bridge, ready, busy }} />
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
