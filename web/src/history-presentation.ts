import { record } from "./state.ts";
import type { RecordedEvent } from "./types.ts";

export const historyDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
export const historyTime = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
export const plural = (
  count: number,
  singular: string,
  multiple = singular + "s",
) => (count === 1 ? singular : multiple);

export function eventFailed(event: RecordedEvent) {
  const payload = record(event.payload),
    item = record(payload.item);
  return (
    /error|failed|cancel/i.test(event.kind) ||
    item.type === "error" ||
    item.status === "failed" ||
    (typeof item.exit_code === "number" && item.exit_code !== 0)
  );
}

/** Labels describe the received notification, never assumed tool execution. */
export function activityKind(event: RecordedEvent) {
  const payload = record(event.payload),
    item = record(payload.item);
  if (eventFailed(event))
    return {
      icon: "failure",
      label: event.kind.includes("cancel")
        ? "Cancellation recorded"
        : "Failure recorded",
      hint: "Recorded failure or interruption",
    };
  if (event.kind === "agenttm.chat.prompt")
    return {
      icon: "prompt",
      label: "Prompt received",
      hint: "User interaction with Codex",
    };
  if (event.kind.startsWith("agenttm.snapshot."))
    return {
      icon: "capture",
      label: "Capture recorded",
      hint: "Workspace capture notification",
    };
  if (
    event.tool_name === "command_execution" ||
    item.type === "command_execution"
  )
    return {
      icon: "command",
      label:
        event.kind === "item.completed"
          ? "Command completed"
          : event.kind === "item.started"
            ? "Command started"
            : "Command updated",
      hint: "Recorded tool activity",
    };
  if (event.tool_name === "file_change" || item.type === "file_change")
    return {
      icon: "file",
      label:
        event.kind === "item.completed"
          ? "File change reported"
          : "File change started",
      hint: "Recorded tool activity",
    };
  if (item.type === "agent_message")
    return {
      icon: "reply",
      label: "Codex response",
      hint: "Recorded assistant message",
    };
  if (event.tool_name)
    return {
      icon: "tool",
      label:
        event.kind === "item.completed" ? "Tool completed" : "Tool activity",
      hint: "Recorded tool notification",
    };
  const labels: Record<string, string> = {
    "turn.started": "Turn started",
    "turn.completed": "Turn completed",
    "thread.started": "Conversation started",
    "agenttm.run.started": "Recording started",
    "agenttm.run.completed": "Recording completed",
    "agenttm.process.exited": "Process exited",
  };
  return {
    icon: "event",
    label: labels[event.kind] || "Recorded event",
    hint: "Session activity",
  };
}

/** Only explicit IDs are eligible. Never assign a turn by event proximity. */
export function eventGroupKey(event: RecordedEvent): string {
  if (
    eventFailed(event) ||
    event.checkpoint_id ||
    !event.kind.startsWith("item.")
  )
    return "";
  const payload = record(event.payload);
  const valid = (value: unknown): value is string =>
    typeof value === "string" && !!value.trim() && !/^\[.*\]$/.test(value);
  if (valid(payload.turn_id)) return "turn:" + payload.turn_id;
  return valid(event.tool_call_id) ? "tool:" + event.tool_call_id : "";
}

export function eventDensity(events: RecordedEvent[], count = 48) {
  const valid = events
    .map((event) => ({ event, stamp: Date.parse(event.received_at) }))
    .filter((value) => Number.isFinite(value.stamp))
    .sort((a, b) => a.stamp - b.stamp);
  const start = valid[0]?.stamp ?? 0,
    end = valid.at(-1)?.stamp ?? start;
  const bins = Array.from({ length: count }, () => ({ count: 0, eventID: "" }));
  valid.forEach(({ event, stamp }) => {
    const bin =
      bins[
        Math.min(
          count - 1,
          Math.floor(((stamp - start) / Math.max(1, end - start)) * count),
        )
      ];
    bin.count++;
    bin.eventID ||= event.id;
  });
  return {
    start,
    end,
    bins,
    max: Math.max(1, ...bins.map((bin) => bin.count)),
    count: valid.length,
  };
}
