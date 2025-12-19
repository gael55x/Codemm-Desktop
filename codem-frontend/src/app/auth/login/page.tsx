"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useThemeMode } from "@/lib/useThemeMode";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

const PASSWORD_MIN_LENGTH = 6;

export default function LoginPage() {
  const router = useRouter();
  const { darkMode, toggleDarkMode } = useThemeMode();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const isPasswordValid = password.length >= PASSWORD_MIN_LENGTH && !passwordError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid) {
      setPasswordError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Store token
      localStorage.setItem("codem-token", data.token);
      localStorage.setItem("codem-user", JSON.stringify(data.user));

      // Redirect to home
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  // eye icon to show/hide password
  const [showPassword, setShowPassword] = useState(false);
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  useEffect(() => {
    if (!password) {
      setPasswordError(null);
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setPasswordError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
      return;
    }
    setPasswordError(null);
  }, [password]);

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? "bg-slate-900" : "bg-white"}`}>
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-8">
        <header className={`mb-8 flex items-center justify-between border-b pb-6 ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
          <div>
            <h1 className={`text-3xl font-semibold tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
              Codemm
            </h1>
            <p className={`mt-1 text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              Log in to continue
            </p>
          </div>
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
        </header>

        <main className="flex flex-1 items-center justify-center">
          <div className={`w-full max-w-md rounded-2xl border p-8 shadow-sm ${
            darkMode ? "border-slate-700 bg-slate-900/40" : "border-slate-200 bg-white"
          }`}>
            <div className="mb-6 text-center">
              <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ${
                darkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"
              }`}>
                <span className="text-lg font-semibold">C</span>
              </div>
              <h2 className={`text-xl font-semibold ${darkMode ? "text-white" : "text-slate-900"}`}>
                Welcome back
              </h2>
              <p className={`mt-1 text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                Log in to your account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className={`block text-sm font-medium ${darkMode ? "text-slate-200" : "text-slate-700"}`}
                >
                  Username or Email
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className={`mt-1 w-full rounded-lg border px-4 py-2 text-sm outline-none transition focus:ring-1 ${
                    darkMode
                      ? "border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 focus:border-blue-400 focus:ring-blue-400"
                      : "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                  placeholder="Enter your username or email"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className={`block text-sm font-medium ${darkMode ? "text-slate-200" : "text-slate-700"}`}
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className={`mt-1 w-full rounded-lg border px-4 py-2 pr-10 text-sm outline-none transition focus:ring-1 ${
                      darkMode
                        ? "border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 focus:border-blue-400 focus:ring-blue-400"
                        : "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500"
                    }`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition ${
                      darkMode ? "text-slate-300 hover:text-slate-100" : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>
          
              {error && (
                <div className={`rounded-lg p-3 text-sm ${
                  darkMode ? "bg-rose-900/30 text-rose-200" : "bg-rose-50 text-rose-700"
                }`}>
                  {error}
                </div>
              )}

              {passwordError && (
                <div className={`rounded-lg p-3 text-sm ${
                  darkMode ? "bg-rose-900/30 text-rose-200" : "bg-rose-50 text-rose-700"
                }`}>
                  {passwordError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !isPasswordValid}
                className="w-full rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Logging in..." : "Log in"}
              </button>
            </form>

            <div className={`mt-6 text-center text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/register"
                className={`font-medium ${darkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
              >
                Sign up
              </Link>
            </div>

            <div className="mt-4 text-center">
              <Link
                href="/"
                className={`text-sm font-medium ${darkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700"}`}
              >
                ← Back to home
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
