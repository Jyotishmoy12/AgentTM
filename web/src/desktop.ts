export interface Approval {
  id: string;
  method: string;
  command: string;
  reason: string;
  directory: string;
}
export interface ChatState {
  session_id: string;
  running: boolean;
  draft: string;
  error: string;
  approvals: Approval[];
}
export interface GCReport {
  objects: number;
  referenced: number;
  candidates: number;
  bytes: number;
  removed: number;
  token: string;
}
export interface StorageUsage {
  total: number;
  blobs: number;
  database: number;
  manifests: number;
  logs: number;
  other: number;
  measured_at: string;
}
export interface CodexModel {
  model: string;
  displayName: string;
  isDefault: boolean;
}
export interface FeatureBridge {
  StorageUsage?(): Promise<StorageUsage>;
  CodexModels?(): Promise<CodexModel[]>;
  ChooseCodex?(): Promise<string>;
  ChatStatus(): Promise<ChatState>;
  StartChat(session: string, prompt: string, model: string, sandbox: string): Promise<string>;
  StopChat(): Promise<void>;
  DecideChat(id: string, allow: boolean): Promise<void>;
  GarbageCollect(apply: boolean, token: string): Promise<GCReport>;
  CreateBackup(password: string): Promise<string>;
  RestoreHistory(password: string): Promise<string>;
}
export function desktopFeatures(): FeatureBridge | null {
  const bridge = window.go?.main?.Desktop;
  return bridge && 'StartChat' in bridge ? (bridge as typeof bridge & FeatureBridge) : null;
}
