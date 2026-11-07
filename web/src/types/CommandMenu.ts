export interface AppCommand {
  id: string;
  title: string;
  detail: string;
  icon: string;
  run: () => void;
}
