export interface Setup {
  state: string;
  version: string;
  project: string;
  path: string;
  environment?: {
    git_state: string;
    git_version: string;
    repository_state: string;
  };
}

export interface DesktopBridge {
  CheckSetup(): Promise<Setup>;
  CopyText(text: string): Promise<void>;
  OpenCodexDocs(): Promise<void>;
}

declare global {
  interface Window {
    go?: { main?: { Desktop?: DesktopBridge } };
  }
}
