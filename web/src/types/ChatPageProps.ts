import type { Session } from '../types';
export interface ChatPageProps {
  resume: string;
  sessions: Session[];
  onRecorded: () => void;
  project: string;
  promptMode: string;
  onInspect: (id: string) => void;
}
