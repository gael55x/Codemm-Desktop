"use client";

import { useEffect, useState } from "react";
import { useThemeMode } from "@/lib/useThemeMode";

type LlmProvider = "openai" | "anthropic" | "gemini";

type LlmSettingsResponse = {
  configured: boolean;
  provider: string | null;
  updatedAt: string | null;
};

export default function LlmSettingsPage() {
  const { darkMode } = useThemeMode();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<LlmSettingsResponse | null>(null);

  const [provider, setProvider] = useState<LlmProvider>("openai");
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const api = (window as any)?.codemm?.secrets;
        if (!api || typeof api.getLlmSettings !== "function") {
          setStatus({
            configured: false,
            provider: null,
            updatedAt: null,
          });
          setError("IDE bridge unavailable. Launch this screen inside Codemm-IDE.");
          return;
        }

        const data = (await api.getLlmSettings()) as LlmSettingsResponse;
        setStatus(data);

        const p = String(data.provider || "").toLowerCase();
        if (p === "openai" || p === "anthropic" || p === "gemini") {
          setProvider(p);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load LLM settings");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function save() {
    const api = (window as any)?.codemm?.secrets;
    if (!api || typeof api.setLlmSettings !== "function") {
      setError("IDE bridge unavailable. Launch this screen inside Codemm-IDE.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api.setLlmSettings({ provider, apiKey });
      setApiKey("");
      const refreshed = (await api.getLlmSettings()) as LlmSettingsResponse;
      setStatus(refreshed);
    } catch (e: any) {
      setError(e?.message || "Failed to save LLM settings");
    } finally {
      setSaving(false);
    }
  }

  async function clearKey() {
    const api = (window as any)?.codemm?.secrets;
    if (!api || typeof api.clearLlmSettings !== "function") {
      setError("IDE bridge unavailable. Launch this screen inside Codemm-IDE.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api.clearLlmSettings();
      setApiKey("");
      setStatus({ configured: false, provider: null, updatedAt: null });
    } catch (e: any) {
      setError(e?.message || "Failed to clear LLM settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"}`}>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">LLM API Key</h1>
            <p className={`mt-2 text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
              Store your own provider API key for generation. Keys are stored locally and are never shown back in the UI.
            </p>
          </div>
          <button
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              darkMode ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-100 hover:bg-slate-200"
            }`}
            onClick={() => history.back()}
          >
            Back
          </button>
        </div>

        <div className={`mt-8 rounded-2xl border p-5 ${darkMode ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-white"}`}>
          {loading ? (
            <div className={darkMode ? "text-slate-300" : "text-slate-600"}>Loading…</div>
          ) : (
            <>
              {error ? (
                <div className={`mb-4 rounded-lg px-3 py-2 text-sm ${darkMode ? "bg-rose-950 text-rose-200" : "bg-rose-50 text-rose-700"}`}>
                  {error}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={`block text-sm font-medium ${darkMode ? "text-slate-200" : "text-slate-700"}`}>Provider</label>
                  <select
                    className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm ${
                      darkMode ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-300 bg-white text-slate-900"
                    }`}
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as LlmProvider)}
                    disabled={saving}
                  >
                    <option value="openai">OpenAI / OpenAI-compatible</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="gemini">Gemini</option>
                  </select>
                  <p className={`mt-2 text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                    This key is stored locally and used for generation.
                  </p>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${darkMode ? "text-slate-200" : "text-slate-700"}`}>API Key</label>
                  <input
                    className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm ${
                      darkMode ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-300 bg-white text-slate-900"
                    }`}
                    type="password"
                    placeholder={status?.configured ? "••••••••••••••••" : "paste your key here"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    disabled={saving}
                  />
                  <p className={`mt-2 text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Leaving this blank won’t change anything. To update, paste a new key and Save.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                    darkMode ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-emerald-600 hover:bg-emerald-500 text-white"
                  } ${saving ? "opacity-60" : ""}`}
                  onClick={save}
                  disabled={saving || !apiKey.trim()}
                >
                  {saving ? "Saving…" : "Save key"}
                </button>
                <button
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                    darkMode ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-100 hover:bg-slate-200"
                  } ${saving ? "opacity-60" : ""}`}
                  onClick={clearKey}
                  disabled={saving || !status?.configured}
                >
                  Remove key
                </button>
                <div className={`ml-auto text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  {status?.configured ? `Configured (${status.provider})` : "Not configured"}
                  {status?.updatedAt ? ` • updated ${new Date(status.updatedAt).toLocaleString()}` : ""}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
