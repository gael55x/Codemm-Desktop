"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useThemeMode } from "@/lib/useThemeMode";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

type LlmProvider = "openai" | "anthropic" | "gemini";

type LlmSettingsResponse = {
  configured: boolean;
  provider: string | null;
  updatedAt: string | null;
};

export default function LlmSettingsPage() {
  const router = useRouter();
  const { darkMode } = useThemeMode();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<LlmSettingsResponse | null>(null);

  const [provider, setProvider] = useState<LlmProvider>("openai");
  const [apiKey, setApiKey] = useState("");

  const token = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem("codem-token") : null), []);

  useEffect(() => {
    if (!token) {
      router.push("/auth/login");
      return;
    }

    async function load() {
      try {
        const res = await fetch(`${BACKEND_URL}/profile/llm`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("codem-token");
          localStorage.removeItem("codem-user");
          router.push("/auth/login");
          return;
        }

        const data = (await res.json()) as LlmSettingsResponse;
        if (!res.ok) {
          throw new Error((data as any)?.error || "Failed to load LLM settings");
        }

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
  }, [router, token]);

  async function save() {
    if (!token) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/profile/llm`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ provider, apiKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || data?.error || "Failed to save LLM settings");
      }
      setApiKey("");

      const refreshed = await fetch(`${BACKEND_URL}/profile/llm`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const refreshedData = await refreshed.json();
      if (refreshed.ok) setStatus(refreshedData);
    } catch (e: any) {
      setError(e?.message || "Failed to save LLM settings");
    } finally {
      setSaving(false);
    }
  }

  async function clearKey() {
    if (!token) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/profile/llm`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to clear LLM settings");
      }
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
              Store your own provider API key for generation. Keys are stored encrypted on the backend and are never shown back in the UI.
            </p>
          </div>
          <button
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              darkMode ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-100 hover:bg-slate-200"
            }`}
            onClick={() => router.push("/profile")}
          >
            Back to profile
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
                    Your key overrides the server default for your account.
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
