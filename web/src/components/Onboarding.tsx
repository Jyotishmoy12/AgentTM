import { useEffect, useState } from 'react';
import './onboarding.css';

interface Setup { state: string; version: string; project: string; path: string }
interface DesktopBridge {
  CheckSetup(): Promise<Setup>;
  CopyText(text: string): Promise<void>;
  OpenCodexDocs(): Promise<void>;
}
declare global { interface Window { go?: { main?: { Desktop?: DesktopBridge } } } }
const steps = ['Welcome', 'Your workspace', 'Install Codex', 'Sign in & verify', 'First recording'];
const completionKey = 'agenttm:onboarding:v1';

export function Onboarding() {
  const bridge = window.go?.main?.Desktop;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [checkedAt, setCheckedAt] = useState('');
  async function check() {
    if (!bridge) return;
    setBusy(true); setError('');
    try { const result = await bridge.CheckSetup(); setSetup(result); setCheckedAt(new Date().toLocaleTimeString()); return result; }
    catch { setError('Could not check your setup. Try again or reopen AgentTM.'); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    if (!bridge) return;
    let disposed = false;
    check().then(result => {
      if (disposed) return;
      let completed = false;
      try { completed = localStorage.getItem(completionKey) === 'done'; } catch { /* storage may be unavailable */ }
      if (!completed || result?.state !== 'ready') setOpen(true);
    });
    return () => { disposed = true; };
  }, [bridge]);
  if (!bridge) return null;
  async function copy(text: string) {
    try { await bridge!.CopyText(text); setCopied(text); }
    catch { setError('Could not copy. Select and copy the command manually.'); }
  }
  const command = (text: string) => <div className="setup-command"><code>{text}</code><button onClick={() => copy(text)}>{copied === text ? 'Copied' : 'Copy'}</button></div>;
  const ready = setup?.state === 'ready';
  const status = busy ? 'Checking Codex…' : ready ? 'Codex is ready' : setup?.state === 'login_required' ? 'Sign-in could not be confirmed' : setup?.state === 'incompatible' ? 'Codex was found but could not pass the compatibility check' : 'Codex is not available to AgentTM';
  return <>
    <button className="setup-launcher" onClick={() => setOpen(true)}>Setup guide</button>
    {open && <div className="setup-backdrop"><section className="setup-dialog" role="dialog" aria-modal="true" aria-labelledby="setup-title">
      <nav className="setup-steps" aria-label="Setup steps"><strong>AgentTM</strong><p>Get ready to record</p>{steps.map((name, i) => <button key={name} aria-current={i === step ? 'step' : undefined} onClick={() => setStep(i)}><span>{i + 1}</span>{name}</button>)}<small>Everything starts on your device.</small></nav>
      <div className="setup-main"><div className="setup-top"><span>STEP {step + 1} OF {steps.length}</span><button onClick={() => setOpen(false)} aria-label="Close setup guide">Close</button></div>
        <div className="setup-body">
          <h1 id="setup-title">{steps[step]}</h1>
          {step === 0 && <><p>Give your coding agent a workspace history.</p><p>AgentTM records sessions you launch through its CLI. Inspect the timeline, compare captured files, and restore a checkpoint into a separate Git worktree.</p><div className="setup-callout">You can explore existing recordings immediately. Codex is needed only for new recordings.</div><h2>What you will need</h2><ul><li>A Git repository for your project.</li><li>Codex CLI installed and signed in.</li><li>A terminal for starting recordings.</li></ul><p>AgentTM stores history in your project's <code>.agenttm</code> folder. Codex uses its own account and network connection.</p></>}
          {step === 1 && <><p>This window is viewing the project below.</p><div className="setup-callout"><strong>{setup?.project || 'Checking project…'}</strong><code>{setup?.path || 'Loading workspace path…'}</code></div><h2>Open PowerShell in this folder</h2><p>In File Explorer, open the project folder, right-click and choose “Open in Terminal”. Check that Git can see the repository:</p>{command('git status')}<p>For a different project, open a terminal there and initialize AgentTM:</p>{command('agenttm init')}<p>This desktop preview currently opens the repository it is launched from. A project picker is not available yet.</p><p>Do not run <code>git init</code> in an unrelated folder just to dismiss a setup error.</p></>}
          {step === 2 && <><p>AgentTM needs the standalone Codex CLI. Having the editor extension alone does not guarantee that the desktop app can find it.</p><h2>Install from PowerShell</h2><p>If Node.js and npm are installed, run:</p>{command('npm.cmd install -g @openai/codex')}<p>If npm is missing, install Node.js with npm first, or follow the official Codex installation guide.</p><button onClick={() => bridge.OpenCodexDocs().catch(() => setError('Could not open documentation. Visit developers.openai.com/codex/cli.'))}>Open official Codex guide ↗</button><h2>Confirm the command works</h2>{command('codex --version')}<p>If Windows says “not recognized”, Codex is not on PATH. Reopen PowerShell after installing. Fully close and relaunch AgentTM from that new terminal so it inherits the updated PATH.</p><p>If Codex is found but the compatibility check fails, update it using the install command above and check again.</p></>}
          {step === 3 && <><p>Sign in through Codex itself. AgentTM does not ask you to paste passwords, tokens, or API keys into this screen.</p>{command('codex login')}{command('codex login status')}<p>Follow the sign-in prompts in your terminal/browser, then check again here.</p><div className={`setup-callout ${ready ? 'setup-ready' : ''}`} role="status"><strong>{status}</strong>{setup?.version && <code>{setup.version}</code>}{checkedAt && <small>Last checked at {checkedAt}</small>}</div><button disabled={busy} onClick={() => check()}>{busy ? 'Checking…' : 'Check again'}</button><p>Installation, JSON support, and observable login readiness are checked. Model access and network connectivity are confirmed only by a real run.</p></>}
          {step === 4 && <><p>In PowerShell, use the same project folder shown in step 2. Start with a small greeting task:</p>{command('agenttm run codex -- "Reply with a greeting."')}<p>Use your configured Codex model. If model access fails, choose a model available to your account with <code>--model MODEL</code>.</p><h2>Inspect your recording</h2><ol><li>Wait for the terminal to print the completed session.</li><li>Return here and click “Refresh history”.</li><li>Select the session to inspect its timeline.</li><li>Select a checkpoint to browse files or compare changes.</li><li>Use “Fork checkpoint” to restore into a separate workspace after reviewing the destination.</li></ol><div className="setup-callout">Only sessions started with <code>agenttm run codex</code> are recorded. Checkpoints are workspace observations; other programs can also change files between observations.</div><p>You can reopen this guide anytime using “Setup guide”.</p></>}
          {error && <p className="error-box" role="alert">{error}</p>}
        </div>
        <footer className="setup-actions"><button onClick={() => setOpen(false)}>Explore history for now</button><div><button disabled={step === 0} onClick={() => setStep(n => n - 1)}>Back</button>{step < steps.length - 1 ? <button className="primary-button" onClick={() => setStep(n => n + 1)}>Continue</button> : <button className="primary-button" disabled={!ready || busy} onClick={() => { try { localStorage.setItem(completionKey, 'done'); } catch { /* optional preference */ } setOpen(false); }}>Finish setup</button>}</div>{step === 4 && !ready && <small>Check Codex readiness in step 4 before finishing, or explore history now.</small>}</footer>
      </div>
    </section></div>}
  </>;
}
