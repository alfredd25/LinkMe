import { useState, useCallback } from "react";
import { getAnalytics, shortenUrl } from "./api/client";
import AuthModal from "./components/AuthModal";
import LinkTable from "./components/LinkTable";
import AnalyticsChart from "./components/AnalyticsChart";
import { copyToClipboard } from "./utils/clipboard";
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

  const handleShortened = useCallback(() => {}, []);

  const handleInspect = async (code: string) => {
    try {
      const data = await getAnalytics(code);
      setAnalytics(data);
    } catch {}
  };

  const addUrlLocally = useCallback((url: UrlRow) => {
    setUrls((prev) => [url, ...prev]);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-slate-900 text-white">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight text-slate-900">LinkMe</span>
          </div>

          <div className="flex items-center gap-2">
            {email ? (
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-sm border border-slate-200 bg-slate-100 text-xs font-medium text-slate-700">
                  {email[0].toUpperCase()}
                </div>
                <span className="hidden text-xs text-slate-600 sm:block">{email}</span>
                <button
                  onClick={handleLogout}
                  className="rounded-sm border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100 cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="rounded-sm bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800 cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Simple link shortening
          </h1>
          <p className="text-sm text-slate-500">
            Create clean, short links and track engagement in real time.
          </p>
        </div>

        <LinkShortenerWithTracking onShortened={handleShortened} addUrl={addUrlLocally} />

        <LinkTable urls={urls} onInspect={handleInspect} loading={urlsLoading} />

        {analytics && <AnalyticsChart data={analytics} onClose={() => setAnalytics(null)} />}
      </main>

      {showAuth && <AuthModal onAuth={handleAuth} onClose={() => setShowAuth(false)} />}
    </div>
  );
}

function LinkShortenerWithTracking({ onShortened, addUrl }: { onShortened: () => void; addUrl: (u: UrlRow) => void }) {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<{ short_code: string; short_url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    let trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
      trimmedUrl = `https://${trimmedUrl}`;
    }

    setLoading(true);
    setResult(null);
    try {
      const data = await shortenUrl(trimmedUrl);
      const displayUrl = `${window.location.origin}/api/urls/${data.short_code}`;
      setResult({ ...data, short_url: displayUrl });
      setUrl("");
      try {
        const id =
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        addUrl({
          id,
          short_code: data.short_code,
          long_url: trimmedUrl,
          created_at: new Date().toISOString(),
          total_clicks: 0,
        });
        onShortened();
      } catch {}
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    const ok = await copyToClipboard(result.short_url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
      <form onSubmit={handleShorten} noValidate className="flex flex-col sm:flex-row gap-2.5">
        <input
          type="text"
          autoComplete="off"
          spellCheck="false"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a long URL to shorten..."
          className="flex-1 rounded-sm border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="shrink-0 rounded-sm bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
        >
          {loading ? "Shortening…" : "Shorten URL"}
        </button>
      </form>

      {result && (
        <div className="mt-3.5 flex items-center justify-between gap-3 rounded-sm border border-slate-200 bg-slate-50 px-3.5 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <svg className="h-4 w-4 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
            </svg>
            <span className="truncate text-sm font-medium text-slate-800">{result.short_url}</span>
          </div>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-sm border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100 cursor-pointer"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}
