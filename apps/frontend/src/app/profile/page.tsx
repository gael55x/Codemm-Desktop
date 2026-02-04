"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useThemeMode } from "@/lib/useThemeMode";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

interface UserStats {
  totalSubmissions: number;
  successfulSubmissions: number;
  activitiesAttempted: number;
  problemsAttempted: number;
  avgExecutionTime: number;
  successRate: number;
}

interface Activity {
  id: string;
  title: string;
  prompt: string;
  problemCount: number;
  createdAt: string;
}

interface Submission {
  id: number;
  activity_id: string;
  problem_id: string;
  success: boolean;
  passed_tests: number;
  total_tests: number;
  submitted_at: string;
}

interface ProfileData {
  user: {
    id: number;
    username: string;
    email: string;
    displayName: string;
    createdAt: string;
  };
  stats: UserStats;
  activities: Activity[];
  recentSubmissions: Submission[];
}

export default function ProfilePage() {
  const router = useRouter();
  const { darkMode, toggleDarkMode } = useThemeMode();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("codem-token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    async function fetchProfile() {
      try {
        const res = await fetch(`${BACKEND_URL}/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("codem-token");
          localStorage.removeItem("codem-user");
          router.push("/auth/login");
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to fetch profile");
        }

        const data = await res.json();
        setProfile(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("codem-token");
    localStorage.removeItem("codem-user");
    router.push("/");
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  if (loading) {
    return (
      <div className={`flex min-h-screen items-center justify-center transition-colors ${darkMode ? "bg-slate-900" : "bg-white"}`}>
        <div className={`${darkMode ? "text-slate-300" : "text-slate-600"}`}>Loading profile...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={`flex min-h-screen items-center justify-center transition-colors ${darkMode ? "bg-slate-900" : "bg-white"}`}>
        <div className={`rounded-2xl border p-6 shadow-sm ${darkMode ? "border-slate-700 bg-slate-900/40" : "border-slate-200 bg-white"}`}>
          <p className={`${darkMode ? "text-rose-200" : "text-rose-700"}`}>{error || "Failed to load profile"}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-600"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? "bg-slate-900" : "bg-white"}`}>
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <header className={`mb-8 flex items-center justify-between border-b pb-6 ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
          <div>
            <h1 className={`text-3xl font-semibold tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>Codemm</h1>
            <p className={`mt-1 text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Profile • {profile.user.displayName}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleDarkMode}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                darkMode
                  ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <Link
              href="/"
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                darkMode
                  ? "border-slate-700 bg-slate-900/40 text-slate-100 hover:bg-slate-800"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Home
            </Link>
            <button
              onClick={handleLogout}
              className={`rounded-full px-4 py-2 text-sm font-medium text-white transition ${
                darkMode ? "bg-slate-700 hover:bg-slate-600" : "bg-slate-800 hover:bg-slate-700"
              }`}
            >
              Logout
            </button>
            <button
              onClick={() => router.push("/settings/llm")}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                darkMode
                  ? "border-slate-700 bg-slate-900/40 text-slate-100 hover:bg-slate-800"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              LLM API Key
            </button>
          </div>
        </header>

        {/* Summary */}
        <div className={`mb-8 rounded-2xl border p-6 ${
          darkMode ? "border-slate-700 bg-slate-900/40" : "border-slate-200 bg-white"
        }`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                darkMode ? "bg-slate-800 text-slate-100" : "bg-slate-100 text-slate-800"
              }`}>
                <span className="text-sm font-semibold">
                  {(profile.user.displayName || profile.user.username || "C").slice(0, 1).toUpperCase()}
                </span>
              </div>
              <div>
                <div className={`text-lg font-semibold ${darkMode ? "text-white" : "text-slate-900"}`}>
                  {profile.user.displayName}
                </div>
                <div className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  {profile.user.email}
                </div>
              </div>
            </div>
            <div className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              Member since {formatDate(profile.user.createdAt)}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className={`rounded-2xl border p-6 ${darkMode ? "border-slate-700 bg-slate-900/40" : "border-slate-200 bg-white"}`}>
            <p className={`text-sm font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Total Submissions</p>
            <p className={`mt-2 text-3xl font-semibold ${darkMode ? "text-white" : "text-slate-900"}`}>
              {profile.stats.totalSubmissions}
            </p>
          </div>
          <div className={`rounded-2xl border p-6 ${darkMode ? "border-slate-700 bg-slate-900/40" : "border-slate-200 bg-white"}`}>
            <p className={`text-sm font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Success Rate</p>
            <p className={`mt-2 text-3xl font-semibold ${darkMode ? "text-emerald-300" : "text-emerald-600"}`}>
              {profile.stats.successRate}%
            </p>
          </div>
          <div className={`rounded-2xl border p-6 ${darkMode ? "border-slate-700 bg-slate-900/40" : "border-slate-200 bg-white"}`}>
            <p className={`text-sm font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Activities</p>
            <p className={`mt-2 text-3xl font-semibold ${darkMode ? "text-white" : "text-slate-900"}`}>
              {profile.stats.activitiesAttempted}
            </p>
          </div>
          <div className={`rounded-2xl border p-6 ${darkMode ? "border-slate-700 bg-slate-900/40" : "border-slate-200 bg-white"}`}>
            <p className={`text-sm font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Problems Solved</p>
            <p className={`mt-2 text-3xl font-semibold ${darkMode ? "text-white" : "text-slate-900"}`}>
              {profile.stats.problemsAttempted}
            </p>
          </div>
        </div>

        {/* Activities and Recent Submissions */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Activities */}
          <div className={`rounded-2xl border p-6 ${darkMode ? "border-slate-700 bg-slate-900/40" : "border-slate-200 bg-white"}`}>
            <h2 className={`mb-4 text-lg font-semibold ${darkMode ? "text-white" : "text-slate-900"}`}>
              Your Activities
            </h2>
            {profile.activities.length === 0 ? (
              <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                No activities yet. Create your first one!
              </p>
            ) : (
              <div className="space-y-3">
                {profile.activities.slice(0, 5).map((activity) => (
                  <Link
                    key={activity.id}
                    href={`/activity/${activity.id}`}
                    className={`block rounded-xl border p-4 transition ${
                      darkMode
                        ? "border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/40"
                        : "border-slate-200 hover:border-blue-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className={`font-medium ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                          {activity.title}
                        </h3>
                        <p className={`mt-1 text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                          {activity.problemCount || 0} problems • Created{" "}
                          {formatDate(activity.createdAt)}
                        </p>
                      </div>
                      <svg
                        className={`h-5 w-5 ${darkMode ? "text-slate-500" : "text-slate-400"}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Submissions */}
          <div className={`rounded-2xl border p-6 ${darkMode ? "border-slate-700 bg-slate-900/40" : "border-slate-200 bg-white"}`}>
            <h2 className={`mb-4 text-lg font-semibold ${darkMode ? "text-white" : "text-slate-900"}`}>
              Recent Submissions
            </h2>
            {profile.recentSubmissions.length === 0 ? (
              <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                No submissions yet. Start solving problems!
              </p>
            ) : (
              <div className="space-y-3">
                {profile.recentSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className={`flex items-center justify-between rounded-xl border p-4 ${
                      darkMode ? "border-slate-700" : "border-slate-200"
                    }`}
                  >
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                        {submission.problem_id}
                      </p>
                      <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        {submission.passed_tests}/{submission.total_tests} tests passed
                        • {formatDate(submission.submitted_at)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        submission.success
                          ? darkMode
                            ? "bg-emerald-900/30 text-emerald-200"
                            : "bg-emerald-50 text-emerald-700"
                          : darkMode
                            ? "bg-rose-900/30 text-rose-200"
                            : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {submission.success ? "Passed" : "Failed"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User Info */}
        <div className={`mt-6 rounded-2xl border p-6 ${darkMode ? "border-slate-700 bg-slate-900/40" : "border-slate-200 bg-white"}`}>
          <h2 className={`mb-4 text-lg font-semibold ${darkMode ? "text-white" : "text-slate-900"}`}>
            Account Information
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className={`text-sm font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Username</dt>
              <dd className={`mt-1 text-sm ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{profile.user.username}</dd>
            </div>
            <div>
              <dt className={`text-sm font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Email</dt>
              <dd className={`mt-1 text-sm ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{profile.user.email}</dd>
            </div>
            <div>
              <dt className={`text-sm font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Member Since</dt>
              <dd className={`mt-1 text-sm ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                {formatDate(profile.user.createdAt)}
              </dd>
            </div>
            <div>
              <dt className={`text-sm font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>User ID</dt>
              <dd className={`mt-1 text-sm ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{profile.user.id}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
