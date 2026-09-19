import { useState, useCallback } from "react";
import { getAnalytics } from "./api/client";
import AuthModal from "./components/AuthModal";
import LinkTable from "./components/LinkTable";
import AnalyticsChart from "./components/AnalyticsChart";
import type { UrlRow, ClickAnalytics } from "./types";

export default function App() {
  const [email, setEmail] = useState<string | null>(() => localStorage.getItem("user_email"));
  const [showAuth, setShowAuth] = useState(false);
  const [urls, setUrls] = useState<UrlRow[]>([]);
  const [urlsLoading] = useState(false);
  const [analytics, setAnalytics] = useState<ClickAnalytics | null>(null);

  const handleAuth = (userEmail: string) => {
    localStorage.setItem("user_email", userEmail);
    setEmail(userEmail);
    setShowAuth(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_email");
    setEmail(null);
    setUrls([]);
    setAnalytics(null);
  };

  const handleShortened = useCallback(() => {
    // Since there's no GET /my-urls endpoint yet, we could refresh from analytics
    // For now, urls are tracked locally from shorten responses
  }, []);

  const handleInspect = async (code: string) => {
    try {
      const data = await getAnalytics(code);
      setAnalytics(data);
    } catch {
      // Silently ignore for now
    }
  };

  // Track shortened URLs locally (append on each shorten)
  const addUrlLocally = useCallback((url: UrlRow) => {
    setUrls((prev) => [url, ...prev]);
  }, []);

  return (
    <div className="min-h-screen">
      {/* ── Navigation ────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 border-b border-white/5 bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/20">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white">ShrinkLink</span>
          </div>

          {/* Status + Auth */}
          <div className="flex items-center gap-4">
            {/* Status badges */}
            <div className="hidden items-center gap-2 sm:flex">
              <StatusBadge label="API" />
              <StatusBadge label="Redis" />
              <StatusBadge label="DB" />
            </div>

            {email ? (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/20 text-sm font-semibold text-brand-300">
                  {email[0].toUpperCase()}
                </div>
                <span className="hidden text-sm text-slate-300 sm:block">{email}</span>
                <button
                  onClick={handleLogout}
                  className="rounded-lg bg-white/5 px-3 py-1.5 text-sm text-slate-400 transition-all hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-brand-500 hover:shadow-lg hover:shadow-brand-500/25 cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Main Content ──────────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        {/* Hero area */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Shorten. Share.{" "}
            <span className="bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">Analyze.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
            Create short links in seconds and track every click with real-time analytics.
          </p>
        </div>

        {/* Shortener */}
        <LinkShortenerWithTracking onShortened={handleShortened} addUrl={addUrlLocally} />

        {/* Link Table */}
        <LinkTable urls={urls} onInspect={handleInspect} loading={urlsLoading} />

        {/* Analytics */}
        {analytics && <AnalyticsChart data={analytics} onClose={() => setAnalytics(null)} />}
      </main>

      {/* Auth Modal */}
      {showAuth && <AuthModal onAuth={handleAuth} onClose={() => setShowAuth(false)} />}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      {label}
    </span>
  );
}

/**
 * Wrapper around LinkShortener that also tracks URLs locally in App state.
 */
import { shortenUrl } from "./api/client";

function LinkShortenerWithTracking({ onShortened, addUrl }: { onShortened: () => void; addUrl: (u: UrlRow) => void }) {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<{ short_code: string; short_url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const data = await shortenUrl(url.trim());
      const displayUrl = `${window.location.origin}/api/urls/${data.short_code}`;
      setResult({ ...data, short_url: displayUrl });
      addUrl({
        id: crypto.randomUUID(),
        short_code: data.short_code,
        long_url: url.trim(),
        created_at: new Date().toISOString(),
        total_clicks: 0,
      });
      setUrl("");
      onShortened();
    } catch {
      setError("Failed to shorten URL. Please enter a valid URL.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.short_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-surface-light p-8">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-brand-500/20 blur-3xl" />
      <form onSubmit={handleShorten} className="relative flex gap-3">
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/my-very-long-url-that-needs-shrinking"
          className="flex-1 rounded-xl border border-white/10 bg-surface px-5 py-3.5 text-white placeholder-slate-500 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-xl bg-brand-600 px-7 py-3.5 font-semibold text-white transition-all hover:bg-brand-500 hover:shadow-lg hover:shadow-brand-500/25 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Shrinking…
            </span>
          ) : (
            "Shorten"
          )}
        </button>
      </form>
      {error && <p className="relative mt-3 text-sm text-red-400">{error}</p>}
      {result && (
        <div className="relative mt-5 flex items-center gap-3 rounded-xl border border-brand-500/20 bg-brand-500/5 px-5 py-3.5">
          <svg className="h-5 w-5 shrink-0 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
          </svg>
          <code className="flex-1 truncate text-sm font-medium text-brand-300">{result.short_url}</code>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-lg bg-brand-600/20 px-4 py-2 text-sm font-medium text-brand-300 transition-all hover:bg-brand-600/30 cursor-pointer"
          >
            {copied ? "✓ Copied!" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}
