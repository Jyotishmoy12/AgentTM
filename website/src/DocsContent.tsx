import { Icon } from "./App";
import { links } from "./content";
import { CLIInstall, DesktopInstall } from "./DocsInstall";
import {
  Command,
  GuideLink,
  Note,
  Prerequisites,
  Step,
  type Topic,
} from "./DocsShared";

const sourceDocs = `${links.repo}/blob/main/docs/`;
export function DocsContent({ topic }: { topic: Topic }) {
  switch (topic) {
    case "start":
      return (
        <>
          <p className="doc-lead">
            Two ways to use AgentTM. Choose the experience you want, then follow
            that guide from start to finish.
          </p>
          <div className="doc-paths">
            <a href="#desktop-install">
              <Icon name="layers" />
              <span className="doc-path-tag">WINDOWS · NATIVE APP</span>
              <h2>Desktop</h2>
              <p>
                Chat with Codex, inspect history, restore workspaces, and manage
                backups in a native window.
              </p>
              <strong>
                Install the desktop app <Icon name="arrow" />
              </strong>
            </a>
            <a href="#cli-install">
              <Icon name="terminal" />
              <span className="doc-path-tag">WINDOWS · MACOS · LINUX</span>
              <h2>CLI + browser</h2>
              <p>
                Record from your terminal and explore sessions, captured files,
                and diffs in your browser.
              </p>
              <strong>
                Install the CLI <Icon name="arrow" />
              </strong>
            </a>
          </div>
          <Note>
            Desktop and CLI are separate downloads. The desktop ZIP includes{" "}
            <code>AgentTM.exe</code> and <code>agenttm-cli.exe</code>; the CLI
            archive includes the <code>agenttm</code> terminal executable.
          </Note>
          <h2>Before you begin</h2>
          <Prerequisites />
          <h2>Already installed?</h2>
          <p>
            <GuideLink topic="desktop-record">
              Start a desktop conversation
            </GuideLink>{" "}
            <GuideLink topic="cli-record">Record from the terminal</GuideLink>
          </p>
          <Note>
            These guides describe the current implementation. Features and
            launch steps depend on your downloaded release. Always check its
            notes and Assets.
          </Note>
        </>
      );
    case "desktop-install":
      return <DesktopInstall />;
    case "cli-install":
      return <CLIInstall />;
    case "desktop-record":
      return (
        <>
          <Note>
            For the native Windows desktop app. Terminal recording has its own{" "}
            <GuideLink topic="cli-record">CLI guide</GuideLink>.
          </Note>
          <Step number={1} title="Check your project and Codex setup">
            <p>
              Confirm the sidebar project name. Open{" "}
              <strong>Settings → Environment → Check again</strong>. Codex must
              be installed and signed in before recording; Git and the project
              checks should succeed.
            </p>
            <p>
              If Codex is missing, follow the app's <strong>Setup guide</strong>{" "}
              or{" "}
              <a href="https://developers.openai.com/codex/cli">
                official Codex installation and sign-in guide
              </a>
              . If the app cannot locate your installed CLI, use{" "}
              <strong>Choose Codex executable</strong> in Chat's model setup
              controls where your build provides it.
            </p>
            <Note>
              A successful readiness check does not prove every model or
              execution tool will work. A real turn confirms that.
            </Note>
          </Step>
          <Step number={2} title="Start with a read-only conversation">
            <p>
              Open <strong>Chat with Codex</strong>, start a new conversation,
              choose an available model, and leave permissions at{" "}
              <strong>Read only</strong>. Send:
            </p>
            <blockquote>
              Explain this project. Do not change any files.
            </blockquote>
            <p>
              Use the Send button or <strong>Ctrl+Enter</strong>. Enter adds a
              new line. Watch the actual response and any errors; use{" "}
              <strong>Stop turn</strong> if you need to cancel.
            </p>
          </Step>
          <Step number={3} title="Find the recording">
            <p>
              Open <strong>History</strong> and select the new session. You
              should see its recorded events and any captured workspace states.
              An explanation may produce no changed files; that is expected.
            </p>
            <GuideLink topic="history">
              Learn to inspect the recording
            </GuideLink>
          </Step>
          <Step number={4} title="When you want code changes">
            <p>
              Use a disposable project for your first edit. Switch to{" "}
              <strong>Allow project edits</strong> only when you intend file
              changes. Review any supported approval requests. Model, sandbox,
              authentication, or local-tool errors can still prevent edits.
            </p>
            <Note caution>
              Continuing a saved conversation continues that Codex thread. It
              does not rewind the conversation to a restored workspace
              checkpoint.
            </Note>
          </Step>
        </>
      );
    case "desktop-storage":
      return (
        <>
          <Note>
            These controls are native desktop actions, not CLI backup
            subcommands.
          </Note>
          <Step number={1} title="Create an encrypted history backup">
            <p>
              Open <strong>Storage & backups → Create backup</strong>. Enter and
              confirm a passphrase of at least 12 characters, choose the
              destination when prompted, and wait for success.
            </p>
            <Note caution>
              Keep the passphrase separately. AgentTM cannot recover it. The
              archive includes AgentTM history, configuration, manifests, logs,
              and blobs; it excludes Git history, live project files, restored
              worktrees, and Codex login credentials. It is not a complete
              project backup.
            </Note>
          </Step>
          <Step number={2} title="Restore history to a different repository">
            <p>
              Use <strong>Restore backup</strong>, select the archive and target
              Git repository, enter its passphrase, and review the confirmation.
              The target must not already contain an <code>.agenttm</code>{" "}
              history directory. Existing history is not overwritten.
            </p>
            <p>
              If the passphrase is wrong or the archive is corrupt, read the
              error and correct the input. Do not delete existing history just
              to make a restore succeed.
            </p>
          </Step>
          <Step number={3} title="Preview storage cleanup">
            <p>
              Choose <strong>Preview Cleanup</strong>. Review actual eligible
              blob counts and sizes before explicitly consenting to deletion. A
              preview alone deletes nothing. Active recording, maintenance
              locks, reference checks, and conservative integrity rules may
              block cleanup.
            </p>
            <Note caution>
              Deleting eligible blobs is permanent. Failed cleanup can be
              partially complete; refresh the preview before retrying.
            </Note>
          </Step>
        </>
      );
    case "cli-record":
      return (
        <>
          <Note>
            For an installed CLI. If you extracted the desktop ZIP, its helper
            is called <code>agenttm-cli.exe</code> and extraction does not
            create an <code>agenttm</code> PATH command. Use the Desktop guide
            unless you intentionally installed the CLI separately.
          </Note>
          <Step number={1} title="Open a terminal in your Git project">
            <p>
              Use your project folder, not the app's download folder. In File
              Explorer or your editor, open a terminal in that Git working tree.
              Confirm Git can find it:
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
              For missing Codex or authentication errors, follow{" "}
              <a href="https://developers.openai.com/codex/cli">
                Codex's setup guide
              </a>{" "}
              and then rerun the check.
            </p>
          </Step>
          <Step number={4} title="Record a small explanation">
            <Command
              code={
                'agenttm run codex -- "Explain this project. Do not change files."'
              }
              after="The run finishes and AgentTM prints a session ID and status. If it fails, inspect the actual error before retrying."
            />
            <p>
              This uses Codex's configured model. If your account cannot access
              that model, choose an available model explicitly as described in{" "}
              <GuideLink topic="troubleshooting">Troubleshooting</GuideLink>.
            </p>
          </Step>
          <Step number={5} title="Open the dashboard">
            <Command
              code="agenttm ui"
              after="Your browser opens the loopback address printed in the terminal, normally http://127.0.0.1:7331."
            />
            <p>
              Keep this terminal running while using the dashboard. Press{" "}
              <strong>Ctrl+C</strong> in this terminal when finished. The
              browser dashboard provides inspection; interactive Codex chat and
              encrypted backup flows require the native desktop app.
            </p>
            <GuideLink topic="history">Next: explore the recording</GuideLink>
          </Step>
        </>
      );
    case "cli-commands":
      return (
        <>
          <p className="doc-lead">
            Run commands from your Git project. Your installed version is the
            authority:
          </p>
          <Command code="agenttm help" />
          <div className="doc-table-scroll">
            <table>
              <caption>Common inspection and maintenance commands</caption>
              <thead>
                <tr>
                  <th>Command</th>
                  <th>Use it to</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["agenttm version", "Confirm the running version and build."],
                  [
                    "agenttm sessions",
                    "Find recorded session IDs and statuses.",
                  ],
                  [
                    "agenttm events SESSION_ID",
                    "Read recorded events in receipt order.",
                  ],
                  [
                    "agenttm operations SESSION_ID",
                    "Inspect recorded operation coverage and observation links.",
                  ],
                  [
                    "agenttm checkpoints SESSION_ID",
                    "List captured checkpoint IDs and partial flags.",
                  ],
                  [
                    "agenttm show CHECKPOINT_ID",
                    "Read the captured manifest and omissions.",
                  ],
                  [
                    "agenttm cat CHECKPOINT_ID PATH",
                    "Read a captured text file.",
                  ],
                  [
                    "agenttm diff CHECKPOINT_ID",
                    "Compare a capture with its parent.",
                  ],
                  [
                    "agenttm fork CHECKPOINT_ID --name review-copy",
                    "Restore a checkpoint into an isolated Git worktree.",
                  ],
                  ["agenttm forks", "List recorded restoration results."],
                  [
                    "agenttm doctor",
                    "Check supported project, history, object, and readiness diagnostics.",
                  ],
                  [
                    "agenttm gc",
                    "Preview eligible unreferenced blobs without deleting them.",
                  ],
                ].map(([command, description]) => (
                  <tr key={command}>
                    <td>
                      <code>{command}</code>
                    </td>
                    <td>{description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Note>
            <code>SESSION_ID</code>, <code>CHECKPOINT_ID</code>, and{" "}
            <code>PATH</code> are placeholders in this reference table. Copy
            real IDs from <code>sessions</code> and <code>checkpoints</code>,
            and a captured path from <code>show</code>. These examples are not
            one block to paste.
          </Note>
          <p>
            Pagination, manual capture, explicit cleanup, and purge options are
            documented in the{" "}
            <a href={sourceDocs + "cli.md"}>complete CLI reference</a>.
            Destructive actions require their own review; this page does not run
            commands for you.
          </p>
        </>
      );
    case "history":
      return (
        <>
          <p className="doc-lead">
            A session is one managed recording. Events describe received
            activity; checkpoints contain captured workspace states. They are
            related, but are not the same thing.
          </p>
          <Step number={1} title="Choose a session in History">
            <p>
              Select the recording you want. Follow the timeline to find
              prompts, reported tool activity, failures, and captured workspace
              milestones. Longer loaded histories can show activity bars based
              on real event timestamps; click a populated bar to jump to that
              segment.
            </p>
          </Step>
          <Step number={2} title="Inspect a captured state">
            <p>
              Choose <strong>Inspect checkpoint</strong> on a milestone. In the
              Explorer, search for a captured file and select it. The code
              viewer is read-only. An event without a checkpoint does not create
              a new file state.
            </p>
            <img
              className="doc-product-image"
              src={`${import.meta.env.BASE_URL}images/explorer-detail.png`}
              alt="Current read-only Checkpoint Explorer in a disposable demo project"
              loading="lazy"
            />
          </Step>
          <Step number={3} title="Compare supported changes">
            <p>
              Open <strong>Changes</strong> to compare the selected checkpoint
              with its recorded parent. Use inline or split views where
              supported. Technical IDs and capture metadata are available
              through <strong>Details</strong>.
            </p>
            <Note caution>
              A partial capture omitted some paths. Open the omissions list
              before assuming a file was saved. Workspace scans are
              observations, not necessarily atomic snapshots or proof that a
              particular agent action caused each line change.
            </Note>
          </Step>
          <GuideLink topic="restore">
            Next: restore a checkpoint safely
          </GuideLink>
        </>
      );
    case "restore":
      return (
        <>
          <Note caution>
            Restoration creates a separate Git worktree. It does not replace
            your original working tree, index, or HEAD, and it does not rewind
            the Codex conversation.
          </Note>
          <Step number={1} title="Review the checkpoint">
            <p>
              Inspect the files you need. Check completeness and omitted paths.
              Missing content cannot be restored as though it had been captured.
            </p>
          </Step>
          <Step number={2} title="Review the destination">
            <p>
              In the Explorer choose <strong>Restore checkpoint</strong>. Review
              the new worktree name and destination. Partial captures require
              explicit acknowledgment before restoration.
            </p>
          </Step>
          <Step number={3} title="Restore and inspect the result">
            <p>
              Confirm restoration and wait for its actual result. On success,
              open <strong>Restored workspaces</strong>, select the record, and
              copy its path. Updated Windows desktop builds can check the folder
              and open it in File Explorer.
            </p>
            <p>
              A recorded completed restore is a past result, not proof the
              folder is still present or healthy. A moved, missing, or
              inaccessible folder needs investigation.
            </p>
            <Note>
              To continue working, open the restored directory in your editor
              and review it. AgentTM does not automatically execute restored
              code or reconnect a Codex thread to that checkpoint.
            </Note>
          </Step>
        </>
      );
    case "privacy":
      return (
        <>
          <h2>What is local</h2>
          <p>
            AgentTM history lives in the project's <code>.agenttm</code>{" "}
            directory: SQLite event data, snapshot manifests, and
            content-addressed file blobs. The browser dashboard binds to
            loopback. Codex still uses its configured service and network
            connection; the complete workflow is not offline.
          </p>
          <h2>Prompt capture</h2>
          <p>
            Prompt capture is configured per project. With prompt text capture
            off, recorded metadata does not recover an old prompt's text later.
            Settings shows the loaded policy; the{" "}
            <a href={sourceDocs + "user-guide.md"}>full user guide</a> explains
            project capture configuration. Codex maintains its own conversation
            history separately.
          </p>
          <h2>What a capture means</h2>
          <p>
            Baseline, final, supported manual, and enabled operation-boundary
            captures record eligible files. Overlapping commands or outside
            changes can affect scan-time observations. Captures are not
            deterministic replay or exact action-to-line provenance.
          </p>
          <h2>Exclusions and secrets</h2>
          <p>
            Capture exclusions and limits can omit sensitive, ignored, large,
            unsupported, or unsafe paths. Partial status and omissions must
            remain visible. Event redaction is best effort; captured source
            files and outputs can still contain sensitive information. Review
            exclusions and stored content before sharing history.
          </p>
          <GuideLink topic="desktop-storage">
            Read the encrypted-backup guide
          </GuideLink>
        </>
      );
    case "troubleshooting":
      return (
        <>
          <p className="doc-lead">
            Stop at the first failed step. Read the exact message before
            retrying; do not continue with missing files, failed checksums, or
            an unverified destination.
          </p>
          {[
            [
              "The terminal cannot find agenttm",
              "CLI: open a new terminal after PATH changes. Windows normally installs to %LOCALAPPDATA%\\AgentTM\\bin. Desktop extraction does not install that global command; launch AgentTM.exe instead.",
            ],
            [
              "Codex executable not found",
              "Install Codex CLI using its official guide, then restart AgentTM so it sees the updated environment. Updated desktop builds also let you choose the installed executable in model setup.",
            ],
            [
              "Codex is installed but sign-in fails",
              "Complete Codex sign-in using its own setup instructions, then rerun agenttm codex doctor in the CLI or Settings → Check again in the desktop app. Do not paste login tokens into AgentTM chat.",
            ],
            [
              "Model access or model not found",
              "Desktop: refresh the model list and choose a model available to your account. CLI: pass --model followed by an actual available model ID before -- and the prompt. Example model names are not available to every account.",
            ],
            [
              "Port 7331 is already occupied",
              "CLI: leave the existing server alone if you still use it. Start another dashboard with the separate command below and open the URL it prints.",
            ],
            [
              "Checksum entry is missing or the hashes differ",
              "Do not extract or install. Confirm the archive and SHA256SUMS came from the same release and the manifest names that exact archive. Download both again if needed.",
            ],
            [
              "install.ps1 is missing",
              "That script is downloaded separately for CLI installation. The desktop ZIP does not contain or use it. Return to the correct installation path.",
            ],
            [
              "Permission denied or destination already exists",
              "Use a writable user-owned destination. Close AgentTM before replacing its executable. Follow your platform's explicit upgrade instructions; do not overwrite history or bypass a managed policy.",
            ],
            [
              "No window after choosing another project",
              "Use a build containing the visible-window launch fix. Reopen the updated AgentTM.exe, choose an existing Git project, and check for an initialization prompt in the new window.",
            ],
          ].map(([title, description]) => (
            <section className="doc-trouble" key={title}>
              <h2>{title}</h2>
              <p>{description}</p>
            </section>
          ))}
          <Command
            code="agenttm ui --port 7332"
            after="Use the actual address printed by this command; the server normally uses 127.0.0.1:7332."
          />
          <p>
            For unresolved issues, include the AgentTM version, operating
            system, failing step, and sanitized error. Do not post passphrases,
            tokens, or private captured files.{" "}
            <a href={links.repo + "/issues"}>Open an issue</a>.
          </p>
        </>
      );
  }
}
