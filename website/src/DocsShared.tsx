import type { ReactNode } from "react";
import { CodeBlock, Icon } from "./App";

export const guides = [
  {
    id: "start",
    group: "Start here",
    title: "Choose your setup",
    description: "Desktop or CLI: choose one path before installing.",
    icon: "layers",
  },
  {
    id: "desktop-install",
    group: "Windows desktop",
    title: "Install the desktop app",
    description: "Download, verify, extract, and open your project.",
    icon: "download",
  },
  {
    id: "desktop-record",
    group: "Windows desktop",
    title: "Your first conversation",
    description: "Set up Codex, choose permissions, and record a turn.",
    icon: "chat",
  },
  {
    id: "desktop-storage",
    group: "Windows desktop",
    title: "Backups & storage",
    description:
      "Create an encrypted backup, restore history, and preview cleanup.",
    icon: "database",
  },
  {
    id: "cli-install",
    group: "CLI & browser dashboard",
    title: "Install the CLI",
    description:
      "Separate installation instructions for Windows, macOS, and Linux.",
    icon: "terminal",
  },
  {
    id: "cli-record",
    group: "CLI & browser dashboard",
    title: "Record your first run",
    description:
      "Initialize a Git project, record Codex, and open the dashboard.",
    icon: "play",
  },
  {
    id: "cli-commands",
    group: "CLI & browser dashboard",
    title: "Command reference",
    description:
      "Find sessions, checkpoints, diffs, diagnostics, and restore commands.",
    icon: "code",
  },
  {
    id: "history",
    group: "Understand your history",
    title: "Explore a recording",
    description:
      "Sessions, recorded events, checkpoint files, and comparisons.",
    icon: "timeline",
  },
  {
    id: "restore",
    group: "Understand your history",
    title: "Restore a checkpoint",
    description: "Review omissions and create a separate Git working copy.",
    icon: "branch",
  },
  {
    id: "privacy",
    group: "Understand your history",
    title: "Capture & privacy",
    description:
      "Local data, prompt capture, exclusions, and observation limits.",
    icon: "lock",
  },
  {
    id: "troubleshooting",
    group: "Help",
    title: "Troubleshooting",
    description:
      "Missing dependencies, model access, ports, PATH, and checksum errors.",
    icon: "shield",
  },
] as const;
export type Topic = (typeof guides)[number]["id"];
export function Note({
  children,
  caution = false,
}: {
  children: ReactNode;
  caution?: boolean;
}) {
  return (
    <div className={`doc-note ${caution ? "doc-caution" : ""}`}>
      <Icon name={caution ? "shield" : "check"} />
      <div>{children}</div>
    </div>
  );
}
export function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="doc-step">
      <span className="doc-step-number">{String(number).padStart(2, "0")}</span>
      <div>
        <h2>{title}</h2>
        {children}
      </div>
    </section>
  );
}
export function Command({ code, after }: { code: string; after?: string }) {
  return (
    <div className="doc-command">
      <CodeBlock command={code} />
      {after && (
        <p className="doc-expected">
          <span>Check</span>
          {after}
        </p>
      )}
    </div>
  );
}
export function GuideLink({
  topic,
  children,
}: {
  topic: Topic;
  children: ReactNode;
}) {
  return (
    <a className="doc-inline-link" href={`#${topic}`}>
      {children}
      <Icon name="arrow" />
    </a>
  );
}
export function Prerequisites({ desktop = false }: { desktop?: boolean }) {
  return (
    <ul className="doc-checklist">
      <li>
        <Icon name="check" />
        <span>
          <strong>Git 2.42+ and a Git working tree.</strong> An ordinary folder
          alone is not enough; AgentTM needs a Git project.
        </span>
      </li>
      {desktop && (
        <li>
          <Icon name="check" />
          <span>
            <strong>Windows Intel/AMD 64-bit and WebView2.</strong> The native
            desktop preview is not a macOS or Linux app.{" "}
            <a href="https://developer.microsoft.com/microsoft-edge/webview2/">
              Get WebView2
            </a>
            .
          </span>
        </li>
      )}
      <li>
        <Icon name="check" />
        <span>
          <strong>
            Codex CLI, installed and signed in, for new recordings.
          </strong>{" "}
          You can inspect existing history without it.{" "}
          <a href="https://developers.openai.com/codex/cli">
            Official Codex setup
          </a>
          .
        </span>
      </li>
      <li>
        <Icon name="check" />
        <span>
          <strong>No Go or Node.js required for prebuilt AgentTM.</strong>{" "}
          Installing Codex itself has its own prerequisites.
        </span>
      </li>
    </ul>
  );
}
