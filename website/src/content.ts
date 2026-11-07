export const repo = 'https://github.com/Jyotishmoy12/AgentTM';
export const links = {
  repo,
  releases: `${repo}/releases/latest`,
  docs: `${import.meta.env.BASE_URL}docs.html`,
  license: `${repo}/blob/main/LICENSE`,
  checkpoints: `${repo}/blob/main/docs/granular-checkpoints.md`,
};

export const platforms = {
  windows: {
    label: 'Windows',
    detail: 'Native desktop preview or CLI + browser dashboard',
    href: `${repo}/blob/main/docs/install/windows/README.md`,
  },
  macos: {
    label: 'macOS',
    detail: 'CLI + browser dashboard · Apple silicon & Intel',
    href: `${repo}/blob/main/docs/install/macos/README.md`,
  },
  linux: {
    label: 'Linux',
    detail: 'CLI + browser dashboard · amd64 & ARM64',
    href: `${repo}/blob/main/docs/install/linux/README.md`,
  },
};
export type Platform = keyof typeof platforms;

export const showcases = [
  {
    id: 'timeline',
    label: 'Session timeline',
    icon: 'timeline',
    number: '01',
    title: 'The steps behind the final diff.',
    copy: 'Follow supported Codex events, tool notifications, and commands in the order they were recorded. Find the moment you want to investigate.',
    image: 'history-detail.png',
    width: 2740,
    height: 1854,
    alt: 'Current AgentTM History screen with recorded activity, timestamp-based activity bars, and checkpoint milestones from a disposable demo session.',
    detail: 'Recorded events. Workspace context. One local history.',
  },
  {
    id: 'diffs',
    label: 'File history & diffs',
    icon: 'code',
    number: '02',
    title: 'See what changed between observations.',
    copy: 'Browse captured file versions and compare checkpoints. Inspect the code as it was observed near supported agent activity, without making a Git commit.',
    image: 'explorer-detail.png',
    width: 2740,
    height: 1854,
    alt: 'Current AgentTM Checkpoint Explorer showing the recorded cart subtotal fix in a read-only split comparison.',
    detail: 'Historical files and diffs, alongside the execution timeline.',
  },
  {
    id: 'restore',
    label: 'Safe restoration',
    icon: 'branch',
    number: '03',
    title: 'A separate workspace. A fresh starting point.',
    copy: 'Restore eligible captured files into an isolated Git worktree. Your original working tree, Git index, and HEAD stay in place while you inspect the restored copy.',
    image: 'workspaces-detail.png',
    width: 2740,
    height: 1854,
    alt: 'Current AgentTM Restored Workspaces manager showing recorded isolated worktrees and the selected workspace details.',
    detail: 'Recover captured files without replacing your original workspace.',
  },
] as const;

export const commands = [
  {
    title: 'Initialize local history',
    command: 'agenttm init',
    detail: 'Run inside the Git project you want to record.',
  },
  {
    title: 'Check Codex setup',
    command: 'agenttm codex doctor',
    detail: 'Codex must be installed and authenticated.',
  },
  {
    title: 'Record your first session',
    command: 'agenttm run codex -- "Explain this project"',
    detail: 'Start with an explanation before requesting edits.',
  },
  {
    title: 'Open the dashboard',
    command: 'agenttm ui',
    detail: 'Open the printed loopback URL. Keep this terminal running.',
  },
];

export const features = [
  {
    icon: 'lock',
    title: 'Your history stays local',
    text: 'SQLite history, snapshot manifests, and file blobs live in your project’s .agenttm directory.',
    tag: 'LOCAL-FIRST',
  },
  {
    icon: 'database',
    title: 'Less duplication, more context',
    text: 'SHA-256 content-addressable storage shares identical file bytes across checkpoints.',
    tag: 'DEDUPLICATED STORAGE',
  },
  {
    icon: 'chat',
    title: 'Pick up the conversation',
    text: 'Continue a supported saved Codex conversation in Windows desktop chat. File restoration is a separate action.',
    tag: 'WINDOWS DESKTOP',
  },
  {
    icon: 'shield',
    title: 'Protect your history backups',
    text: 'Create and restore passphrase-encrypted history backups from the desktop app. Keep your passphrase safe.',
    tag: 'WINDOWS DESKTOP',
  },
  {
    icon: 'check',
    title: 'Check the history you keep',
    text: 'Run integrity diagnostics to check the SQLite index and captured snapshot objects.',
    tag: 'INTEGRITY CHECKS',
  },
  {
    icon: 'layers',
    title: 'Clean up with intent',
    text: 'Purge sessions and explicitly remove unreferenced blobs with storage safeguards.',
    tag: 'STORAGE MANAGEMENT',
  },
] as const;

export const gitComparison = [
  {
    feature: 'File versions & code diffs',
    git: 'Commits and saved Git history',
    agenttm: 'Captured workspace versions and checkpoint diffs',
  },
  {
    feature: 'Commits, branches & collaboration',
    git: 'Core version-control workflow',
    agenttm: 'Works alongside your Git repository',
  },
  {
    feature: 'AI coding session timeline',
    git: 'Not built in',
    agenttm: 'Events from AgentTM-managed Codex runs',
  },
  {
    feature: 'Tool activity, commands & failures',
    git: 'Not recorded as agent activity',
    agenttm: 'Supported events reported by Codex',
  },
  {
    feature: 'Workspace states without commits',
    git: 'Save manually, for example with stash',
    agenttm: 'Baseline, final, and enabled operation-boundary captures',
  },
  {
    feature: 'Restore in a separate workspace',
    git: 'Set up with git worktree',
    agenttm: 'Integrated restore from an eligible checkpoint',
  },
  {
    feature: 'Continue a saved agent conversation',
    git: 'Not built in',
    agenttm: 'Supported Codex conversation continuation',
  },
] as const;
