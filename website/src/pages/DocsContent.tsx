import { GuideLink } from '../components/molecules/GuideLink';
import { Note } from '../components/molecules/Note';
import { Step } from '../components/molecules/Step';
import { CLIInstall } from '../components/organisms/CLIInstall';
import { DesktopInstall } from '../components/organisms/DesktopInstall';
import { DocsContentContent } from '../components/organisms/DocsContentContent';
import { DocsContentContent2 } from '../components/organisms/DocsContentContent2';
import { DocsContentContent3 } from '../components/organisms/DocsContentContent3';
import { DocsContentContent4 } from '../components/organisms/DocsContentContent4';
import { DocsContentContent5 } from '../components/organisms/DocsContentContent5';
import { DocsContentContent6 } from '../components/organisms/DocsContentContent6';
import { sourceDocs } from '../data/DocsContent';
import type { Topic } from '../types/DocsShared';

export function DocsContent({ topic }: { topic: Topic }) {
  switch (topic) {
    case 'start':
      return <DocsContentContent5 />;
    case 'desktop-install':
      return <DesktopInstall />;
    case 'cli-install':
      return <CLIInstall />;
    case 'desktop-record':
      return <DocsContentContent2 />;
    case 'desktop-storage':
      return (
        <>
          <Note>These controls are native desktop actions, not CLI backup subcommands.</Note>
          <Step number={1} title="Create an encrypted history backup">
            <p>
              Open <strong>Storage & backups → Create backup</strong>. Enter and confirm a
              passphrase of at least 12 characters, choose the destination when prompted, and wait
              for success.
            </p>
            <Note caution>
              Keep the passphrase separately. AgentTM cannot recover it. The archive includes
              AgentTM history, configuration, manifests, logs, and blobs; it excludes Git history,
              live project files, restored worktrees, and Codex login credentials. It is not a
              complete project backup.
            </Note>
          </Step>
          <Step number={2} title="Restore history to a different repository">
            <p>
              Use <strong>Restore backup</strong>, select the archive and target Git repository,
              enter its passphrase, and review the confirmation. The target must not already contain
              an <code>.agenttm</code> history directory. Existing history is not overwritten.
            </p>
            <p>
              If the passphrase is wrong or the archive is corrupt, read the error and correct the
              input. Do not delete existing history just to make a restore succeed.
            </p>
          </Step>
          <Step number={3} title="Preview storage cleanup">
            <p>
              Choose <strong>Preview Cleanup</strong>. Review actual eligible blob counts and sizes
              before explicitly consenting to deletion. A preview alone deletes nothing. Active
              recording, maintenance locks, reference checks, and conservative integrity rules may
              block cleanup.
            </p>
            <Note caution>
              Deleting eligible blobs is permanent. Failed cleanup can be partially complete;
              refresh the preview before retrying.
            </Note>
          </Step>
        </>
      );
    case 'cli-record':
      return <DocsContentContent3 />;
    case 'cli-commands':
      return <DocsContentContent />;
    case 'history':
      return <DocsContentContent6 />;
    case 'restore':
      return (
        <>
          <Note caution>
            Restoration creates a separate Git worktree. It does not replace your original working
            tree, index, or HEAD, and it does not rewind the Codex conversation.
          </Note>
          <Step number={1} title="Review the checkpoint">
            <p>
              Inspect the files you need. Check completeness and omitted paths. Missing content
              cannot be restored as though it had been captured.
            </p>
          </Step>
          <Step number={2} title="Review the destination">
            <p>
              In the Explorer choose <strong>Restore checkpoint</strong>. Review the new worktree
              name and destination. Partial captures require explicit acknowledgment before
              restoration.
            </p>
          </Step>
          <Step number={3} title="Restore and inspect the result">
            <p>
              Confirm restoration and wait for its actual result. On success, open{' '}
              <strong>Restored workspaces</strong>, select the record, and copy its path. Updated
              Windows desktop builds can check the folder and open it in File Explorer.
            </p>
            <p>
              A recorded completed restore is a past result, not proof the folder is still present
              or healthy. A moved, missing, or inaccessible folder needs investigation.
            </p>
            <Note>
              To continue working, open the restored directory in your editor and review it. AgentTM
              does not automatically execute restored code or reconnect a Codex thread to that
              checkpoint.
            </Note>
          </Step>
        </>
      );
    case 'privacy':
      return (
        <>
          <h2>What is local</h2>
          <p>
            AgentTM history lives in the project's <code>.agenttm</code> directory: SQLite event
            data, snapshot manifests, and content-addressed file blobs. The browser dashboard binds
            to loopback. Codex still uses its configured service and network connection; the
            complete workflow is not offline.
          </p>
          <h2>Prompt capture</h2>
          <p>
            Prompt capture is configured per project. With prompt text capture off, recorded
            metadata does not recover an old prompt's text later. Settings shows the loaded policy;
            the <a href={sourceDocs + 'user-guide.md'}>full user guide</a> explains project capture
            configuration. Codex maintains its own conversation history separately.
          </p>
          <h2>What a capture means</h2>
          <p>
            Baseline, final, supported manual, and enabled operation-boundary captures record
            eligible files. Overlapping commands or outside changes can affect scan-time
            observations. Captures are not deterministic replay or exact action-to-line provenance.
          </p>
          <h2>Exclusions and secrets</h2>
          <p>
            Capture exclusions and limits can omit sensitive, ignored, large, unsupported, or unsafe
            paths. Partial status and omissions must remain visible. Event redaction is best effort;
            captured source files and outputs can still contain sensitive information. Review
            exclusions and stored content before sharing history.
          </p>
          <GuideLink topic="desktop-storage">Read the encrypted-backup guide</GuideLink>
        </>
      );
    case 'troubleshooting':
      return <DocsContentContent4 />;
  }
}
