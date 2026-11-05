import { useEffect, useState } from "react";
import { message } from "../api";
import type { CodexModel, FeatureBridge } from "../desktop";

const preferenceKey = "agenttm:chat:model";
export function ModelPicker({
  bridge,
  value,
  onChange,
  disabled,
}: {
  bridge: FeatureBridge;
  value: string;
  onChange: (model: string) => void;
  disabled: boolean;
}) {
  const [models, setModels] = useState<CodexModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [custom, setCustom] = useState(false);
  const [revision, setRevision] = useState(0);
  const [choosing, setChoosing] = useState(false);
  const [location, setLocation] = useState("");
  const [toolsOpen, setToolsOpen] = useState(false);
  useEffect(() => {
    let disposed = false;
    setLoading(true);
    setError("");
    if (!bridge.CodexModels) {
      setLoading(false);
      setCustom(true);
      return;
    }
    bridge
      .CodexModels()
      .then((list) => {
        if (disposed) return;
        setModels(list);
        setCustom(!list.length);
        let saved = "";
        try {
          saved = localStorage.getItem(preferenceKey) ?? "";
        } catch {
          /* optional preference */
        }
        const preferred =
          list.find((m) => m.model === value) ??
          list.find((m) => m.model === saved) ??
          list.find((m) => m.isDefault) ??
          list[0];
        if (preferred) onChange(preferred.model);
      })
      .catch((e) => {
        if (!disposed) {
          setError(message(e));
          setCustom(true);
        }
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, [revision]);
  function select(model: string) {
    onChange(model);
    try {
      localStorage.setItem(preferenceKey, model);
    } catch {
      /* optional preference */
    }
  }
  async function chooseCodex() {
    if (!bridge.ChooseCodex) return;
    setChoosing(true);
    try {
      const path = await bridge.ChooseCodex();
      if (path) {
        setLocation(path);
        setError("");
        setToolsOpen(false);
        setRevision((n) => n + 1);
      }
    } catch (e) {
      setError(message(e));
    } finally {
      setChoosing(false);
    }
  }
  return (
    <div className="model-picker">
      <label>
        Model
        <select
          aria-label="Chat model"
          disabled={disabled || loading}
          value={custom ? "__custom" : value}
          onChange={(e) => {
            if (e.target.value === "__custom") {
              setCustom(true);
              onChange("");
            } else {
              setCustom(false);
              select(e.target.value);
            }
          }}
        >
          <option value="" disabled>
            {loading ? "Loading Codex models…" : "Choose a model"}
          </option>
          {models.map((model) => (
            <option key={model.model} value={model.model}>
              {model.displayName}
              {model.isDefault ? " (recommended)" : ""}
            </option>
          ))}
          <option value="__custom">Enter a model manually…</option>
        </select>
      </label>
      {custom && (
        <input
          aria-label="Custom chat model"
          placeholder="Model ID available to your account"
          value={value}
          onChange={(e) => select(e.target.value)}
          maxLength={200}
          disabled={disabled || loading}
        />
      )}
      {error && <small role="status">Could not load models: {error}</small>}
      <details
        className="model-tools"
        open={toolsOpen}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            setToolsOpen(false);
            event.currentTarget.querySelector("summary")?.focus();
          }
        }}
        onToggle={(e) => setToolsOpen(e.currentTarget.open)}
      >
        <summary>Model settings</summary>
        <div className="model-tools-panel">
          <button
            type="button"
            className="text-button"
            disabled={disabled || loading}
            onClick={() => setRevision((n) => n + 1)}
          >
            {loading ? "Checking model catalog…" : "Refresh models"}
          </button>
          {bridge.ChooseCodex && (
            <button
              type="button"
              className="text-button"
              disabled={disabled || loading || choosing}
              onClick={chooseCodex}
            >
              {choosing ? "Choosing Codex…" : "Choose Codex executable…"}
            </button>
          )}
          {location && <small>Using: {location}</small>}
        </div>
      </details>
    </div>
  );
}
