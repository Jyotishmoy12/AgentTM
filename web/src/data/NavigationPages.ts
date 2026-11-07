import type { AppPage } from '../types/NavigationPages';

export const navigation: {
  id: AppPage;
  title: string;
  hint: string;
  icon: string;
}[] = [
  {
    id: 'overview',
    title: 'Overview',
    hint: 'Your starting point',
    icon: 'home',
  },
  {
    id: 'chat',
    title: 'Chat with Codex',
    hint: 'Record & continue',
    icon: 'chat',
  },
  {
    id: 'sessions',
    title: 'History',
    hint: 'Sessions & captured workspaces',
    icon: 'sessions',
  },
  {
    id: 'restores',
    title: 'Restored workspaces',
    hint: 'Separate working copies',
    icon: 'restores',
  },
  {
    id: 'storage',
    title: 'Storage & backups',
    hint: 'Protect & clean up history',
    icon: 'storage',
  },
  {
    id: 'setup',
    title: 'Settings',
    hint: 'Recording setup & help',
    icon: 'setup',
  },
];

export const descriptions: Record<AppPage, string> = {
  overview: 'Record a run, explore its history, then restore the workspace you need.',
  chat: 'Chat with Codex in this project. Start a new conversation or continue a recorded one.',
  sessions:
    'A session is one recorded agent run. Open one to explore its timeline, files, and changes.',
  checkpoints:
    'A checkpoint captures project files at a moment in a recording. Inspect it or restore a separate copy.',
  restores:
    'Find the separate Git worktrees created from your checkpoints. Your original workspace stays in place.',
  storage:
    'Create encrypted history backups, restore into a clean clone, and safely reclaim unused blob storage.',
  setup: 'Check your recording setup and learn what each part of AgentTM does.',
};
