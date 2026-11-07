import { Command } from '../molecules/Command';
import { GuideLink } from '../molecules/GuideLink';
import { Note } from '../molecules/Note';
import { Step } from '../molecules/Step';

export function DocsContentContent3() {
  return (
    <>
      <Note>
        For an installed CLI. If you extracted the desktop ZIP, its helper is called{' '}
        <code>agenttm-cli.exe</code> and extraction does not create an <code>agenttm</code> PATH
        command. Use the Desktop guide unless you intentionally installed the CLI separately.
      </Note>
      <Step number={1} title="Open a terminal in your Git project">
        <p>
          Use your project folder, not the app's download folder. In File Explorer or your editor,
          open a terminal in that Git working tree. Confirm Git can find it:
        </p>
        <Command
          code="git rev-parse --show-toplevel"
          after="The printed root is the project you intend to record. Stop if it says not a git repository."
        />
      </Step>
      <Step number={2} title="Initialize local history">
        <Command
          code="agenttm init"
          after="AgentTM reports that it initialized or opened .agenttm in this project. No Git commit is created."
        />
      </Step>
      <Step number={3} title="Check Codex readiness">
        <Command
          code="agenttm codex doctor"
          after="Codex is found and its supported readiness checks succeed. If not, resolve the reported setup or sign-in problem first."
        />
        <p>
          For missing Codex or authentication errors, follow{' '}
          <a href="https://developers.openai.com/codex/cli">Codex's setup guide</a> and then rerun
          the check.
        </p>
      </Step>
      <Step number={4} title="Record a small explanation">
        <Command
          code={'agenttm run codex -- "Explain this project. Do not change files."'}
          after="The run finishes and AgentTM prints a session ID and status. If it fails, inspect the actual error before retrying."
        />
        <p>
          This uses Codex's configured model. If your account cannot access that model, choose an
          available model explicitly as described in{' '}
          <GuideLink topic="troubleshooting">Troubleshooting</GuideLink>.
        </p>
      </Step>
      <Step number={5} title="Open the dashboard">
        <Command
          code="agenttm ui"
          after="Your browser opens the loopback address printed in the terminal, normally http://127.0.0.1:7331."
        />
        <p>
          Keep this terminal running while using the dashboard. Press <strong>Ctrl+C</strong> in
          this terminal when finished. The browser dashboard provides inspection; interactive Codex
          chat and encrypted backup flows require the native desktop app.
        </p>
        <GuideLink topic="history">Next: explore the recording</GuideLink>
      </Step>
    </>
  );
}
