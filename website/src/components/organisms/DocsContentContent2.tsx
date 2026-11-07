import { GuideLink } from '../molecules/GuideLink';
import { Note } from '../molecules/Note';
import { Step } from '../molecules/Step';

export function DocsContentContent2() {
  return (
    <>
      <Note>
        For the native Windows desktop app. Terminal recording has its own{' '}
        <GuideLink topic="cli-record">CLI guide</GuideLink>.
      </Note>
      <Step number={1} title="Check your project and Codex setup">
        <p>
          Confirm the sidebar project name. Open{' '}
          <strong>Settings → Environment → Check again</strong>. Codex must be installed and signed
          in before recording; Git and the project checks should succeed.
        </p>
        <p>
          If Codex is missing, follow the app's <strong>Setup guide</strong> or{' '}
          <a href="https://developers.openai.com/codex/cli">
            official Codex installation and sign-in guide
          </a>
          . If the app cannot locate your installed CLI, use{' '}
          <strong>Choose Codex executable</strong> in Chat's model setup controls where your build
          provides it.
        </p>
        <Note>
          A successful readiness check does not prove every model or execution tool will work. A
          real turn confirms that.
        </Note>
      </Step>
      <Step number={2} title="Start with a read-only conversation">
        <p>
          Open <strong>Chat with Codex</strong>, start a new conversation, choose an available
          model, and leave permissions at <strong>Read only</strong>. Send:
        </p>
        <blockquote>Explain this project. Do not change any files.</blockquote>
        <p>
          Use the Send button or <strong>Ctrl+Enter</strong>. Enter adds a new line. Watch the
          actual response and any errors; use <strong>Stop turn</strong> if you need to cancel.
        </p>
      </Step>
      <Step number={3} title="Find the recording">
        <p>
          Open <strong>History</strong> and select the new session. You should see its recorded
          events and any captured workspace states. An explanation may produce no changed files;
          that is expected.
        </p>
        <GuideLink topic="history">Learn to inspect the recording</GuideLink>
      </Step>
      <Step number={4} title="When you want code changes">
        <p>
          Use a disposable project for your first edit. Switch to{' '}
          <strong>Allow project edits</strong> only when you intend file changes. Review any
          supported approval requests. Model, sandbox, authentication, or local-tool errors can
          still prevent edits.
        </p>
        <Note caution>
          Continuing a saved conversation continues that Codex thread. It does not rewind the
          conversation to a restored workspace checkpoint.
        </Note>
      </Step>
    </>
  );
}
