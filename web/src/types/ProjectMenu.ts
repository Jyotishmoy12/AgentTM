export type ProjectBridge = {
  ProjectPath?: () => Promise<string>;
  CheckSetup?: () => Promise<{ path?: string }>;
  CopyText?: (text: string) => Promise<void>;
  OpenProjectWindow?: () => Promise<boolean>;
};
