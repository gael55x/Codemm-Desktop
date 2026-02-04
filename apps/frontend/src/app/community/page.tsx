"use client";

import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { OnboardingTour, type TourStep } from "@/components/OnboardingTour";

type CommunityActivity = {
  id: string;
  title: string;
  communitySummary: string | null;
  communityTags: string[];
  communityPublishedAt: string | null;
  createdAt: string;
  problemCount: number;
  author: { username: string; displayName: string };
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

function formatRelativeDate(iso: string | null): string {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (!Number.isFinite(dt.getTime())) return "—";
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function safeText(s: unknown): string {
  return typeof s === "string" ? s : "";
}

function safeStringArray(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  return x.filter((v) => typeof v === "string" && v.trim()).map((v) => v.trim());
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && typeof err.message === "string" && err.message.trim()) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  return fallback;
}

function safeAuthor(a: Record<string, unknown>): { username: string; displayName: string } {
  const raw = a.author;
  if (!raw || typeof raw !== "object") {
    return { username: "", displayName: "" };
  }
  const author = raw as Record<string, unknown>;
  const username = safeText(author.username);
  const displayName = safeText(author.displayName) || username;
  return { username, displayName };
}

export default function CommunityPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [query, setQuery] = useState("");
  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const [tourOpen, setTourOpen] = useState(false);

  const tourSteps: TourStep[] = [
    {
      id: "browse",
      selector: '[data-tour="community-card"]',
      title: "Browse activities",
      body: "Each activity was published by the community and is ready to open.",
    },
    {
      id: "search",
      selector: '[data-tour="community-search"]',
      title: "Search by title or tag",
      body: "Filter the feed by keywords (e.g. SQL, graphs, arrays).",
    },
    {
      id: "open",
      selector: '[data-tour="community-open"]',
      title: "Open and try it",
      body: "Open an activity to see the problems and start solving.",
    },
  ];

  useEffect(() => {
    try {
      const stored = localStorage.getItem("codem-theme");
      if (stored === "dark") setDarkMode(true);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activities.length === 0) return;
    const key = "codem-tutorial-community-v1";
    if (localStorage.getItem(key) === "1") return;
    const t = window.setTimeout(() => setTourOpen(true), 600);
    return () => window.clearTimeout(t);
  }, [activities.length]);

  async function loadMore() {
    if (loading) return;
    if (nextOffset == null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${BACKEND_URL}/community/activities?limit=20&offset=${encodeURIComponent(String(nextOffset))}`,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Failed to load (${res.status})`);
      }

      const items = Array.isArray(data?.activities) ? data.activities : [];
      const parsed = items
        .map((raw: unknown) => {
          if (!raw || typeof raw !== "object") return null;
          const a = raw as Record<string, unknown>;
          const id = safeText(a.id).trim();
          const title = safeText(a.title).trim();
          if (!id || !title) return null;
          return {
            id,
            title,
            communitySummary: typeof a.communitySummary === "string" ? a.communitySummary : null,
            communityTags: safeStringArray(a.communityTags),
            communityPublishedAt: typeof a.communityPublishedAt === "string" ? a.communityPublishedAt : null,
            createdAt: typeof a.createdAt === "string" ? a.createdAt : "",
            problemCount: typeof a.problemCount === "number" ? a.problemCount : 0,
            author: safeAuthor(a),
          } satisfies CommunityActivity;
        })
        .filter(Boolean) as CommunityActivity[];

      setActivities((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const next = [...prev];
        for (const p of parsed) {
          if (!seen.has(p.id)) next.push(p);
        }
        return next;
      });

      setNextOffset(typeof data?.nextOffset === "number" ? data.nextOffset : null);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load community activities."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activities;
    return activities.filter((a) => {
      const hay = [
        a.title,
        a.communitySummary ?? "",
        a.author.displayName,
        a.author.username,
        a.communityTags.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [activities, query]);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    try {
      localStorage.setItem("codem-theme", next ? "dark" : "light");
    } catch {
      // ignore
    }
  };

  async function copyActivityLink(id: string) {
    try {
      const url = `${window.location.origin}/activity/${id}`;
      await navigator.clipboard.writeText(url);
      setToast("Link copied.");
    } catch {
      setToast("Could not copy link.");
    }
  }

  return (
    <div
      className={`relative min-h-screen overflow-x-hidden transition-colors ${
        darkMode ? "bg-slate-950 text-slate-50" : "bg-slate-50 text-slate-900"
      }`}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className={`absolute left-1/2 top-10 -z-10 h-[520px] w-[520px] -translate-x-1/2 rotate-6 rounded-[42px] border ${
            darkMode ? "border-sky-900/40 bg-slate-900/60" : "border-sky-100 bg-white"
          } shadow-[0_40px_120px_-60px_rgba(15,23,42,0.55)]`}
        >
          <div
            className="absolute inset-4 rounded-[32px] opacity-60"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(59,130,246,0.25) 1px, transparent 0)",
              backgroundSize: "36px 36px",
            }}
          />
          <div
            className="absolute inset-0 rounded-[42px]"
            style={{
              background:
                "conic-gradient(from 110deg at 50% 50%, rgba(59,130,246,0.09), transparent 40%, rgba(59,130,246,0.14), transparent 70%)",
            }}
          />
        </div>
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 pb-16">
        <OnboardingTour
          open={tourOpen}
          steps={tourSteps}
          onClose={() => {
            setTourOpen(false);
            try {
              localStorage.setItem("codem-tutorial-community-v1", "1");
            } catch {
              // ignore
            }
          }}
        />

        <header className={`${darkMode ? "bg-slate-950/90" : "bg-slate-50/95"} sticky top-0 z-30 py-6 backdrop-blur`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition">
              <div className="logo-font text-xl font-extrabold tracking-tight">Codemm</div>
              <span className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                Community
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                href="/"
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  darkMode
                    ? "border-slate-800 bg-slate-900/60 text-slate-200 hover:bg-slate-800"
                    : "border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-100"
                }`}
              >
                Create
              </Link>
              <button
                type="button"
                onClick={toggleDarkMode}
                className={`flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-base transition ${
                  darkMode ? "text-slate-200 hover:text-white" : "text-slate-600 hover:text-slate-900"
                }`}
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </header>

        <main className="mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Community activities</h1>
              <p className={`mt-1 text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                Browse activities other devs published and try them instantly.
              </p>
            </div>

            <div className="w-full sm:w-[360px]">
              <label className="sr-only" htmlFor="community-search">
                Search
              </label>
              <input
                id="community-search"
                data-tour="community-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, tag, author…"
                className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
                  darkMode
                    ? "border-slate-800 bg-slate-900/70 text-slate-100 placeholder:text-slate-500 focus:border-sky-700"
                    : "border-slate-200 bg-white/85 text-slate-900 placeholder:text-slate-400 focus:border-sky-400"
                }`}
              />
            </div>
          </div>

          {toast && (
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                darkMode ? "border-slate-800 bg-slate-900/50 text-slate-200" : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              {toast}
            </div>
          )}

          {error && (
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                darkMode ? "border-rose-900/40 bg-rose-900/20 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-900"
              }`}
            >
              {error}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {filtered.map((a, idx) => (
              <div
                key={a.id}
                data-tour={idx === 0 ? "community-card" : undefined}
                className={`rounded-3xl border p-5 transition ${
                  darkMode ? "border-slate-800 bg-slate-950/40 hover:bg-slate-950/70" : "border-slate-200 bg-white/85 hover:bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                      {a.author.displayName} • {formatRelativeDate(a.communityPublishedAt)}
                    </div>
                    <div className="mt-1 text-lg font-extrabold tracking-tight">{a.title}</div>
                    <div className={`mt-1 text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                      {a.communitySummary ?? "No summary provided."}
                    </div>
                  </div>
                  <div
                    className={`rounded-2xl px-3 py-2 text-xs font-semibold ${
                      darkMode ? "bg-slate-900 text-slate-200" : "bg-slate-100 text-slate-700"
                    }`}
                    title="Problem count"
                  >
                    {a.problemCount} problems
                  </div>
                </div>

                {a.communityTags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {a.communityTags.slice(0, 8).map((t) => (
                      <span
                        key={t}
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          darkMode ? "bg-sky-900/30 text-sky-200" : "bg-sky-50 text-sky-700"
                        }`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    data-tour={idx === 0 ? "community-open" : undefined}
                    href={`/activity/${a.id}`}
                    className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    onClick={() => copyActivityLink(a.id)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      darkMode
                        ? "border-slate-800 bg-slate-900/60 text-slate-200 hover:bg-slate-800"
                        : "border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Copy link
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && !loading && (
            <div className={`mt-10 text-center text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
              No community activities yet.
            </div>
          )}

          <div className="mt-8 flex items-center justify-center">
            {nextOffset != null ? (
              <button
                type="button"
                onClick={loadMore}
                disabled={loading}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
                  darkMode ? "bg-slate-900 text-slate-100 hover:bg-slate-800" : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                {loading ? "Loading…" : "Load more"}
              </button>
            ) : (
              <div className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>You’re all caught up.</div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
