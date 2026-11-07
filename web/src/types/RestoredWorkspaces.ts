export type FolderState = { state: string; checked_at: string; message: string };

export type RestoreBridge = {
  CopyText?: (value: string) => Promise<void>;
  CheckRestoredWorkspace?: (id: string) => Promise<FolderState>;
  OpenRestoredWorkspace?: (id: string) => Promise<void>;
};
