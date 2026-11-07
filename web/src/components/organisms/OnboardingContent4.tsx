export function OnboardingContent4() {
  return (
    <>
      <p>
        Checkpoint restoration creates an isolated Git worktree. It does not replace your original
        project.
      </p>
      <ol>
        <li>Inspect the checkpoint’s captured files and supported parent comparison.</li>
        <li>Review every partial-capture warning, omission, and consistency limitation.</li>
        <li>Choose Restore checkpoint and review the destination and branch.</li>
        <li>Confirm the restore. Open Restored workspaces to find the resulting folder.</li>
      </ol>
      <div className="setup-callout">
        The original working tree, index, and HEAD stay unchanged. Restoration does not rewind the
        Codex conversation.
      </div>
      <h2>What stays outside the restore</h2>
      <p>
        Dependencies, excluded files, external services, credentials, and unsupported filesystem
        state may be absent. No restored code or installer is executed automatically.
      </p>
      <h2>Continue deliberately</h2>
      <p>
        Open the separate folder in your editor and review it before bringing changes back. Continue
        in chat resumes a saved Codex thread; it is not a checkpoint-based agent rewind.
      </p>
    </>
  );
}
