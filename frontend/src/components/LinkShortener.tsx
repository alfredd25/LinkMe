import { useState } from "react";
import { shortenUrl } from "../api/client";
import type { ShortenedUrl } from "../types";

interface Props {
  onShortened: () => void;
}

export default function LinkShortener({ onShortened }: Props) {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<ShortenedUrl | null>(null);
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
      // Construct the proper redirect URL via the url-service proxy
      const displayUrl = `${window.location.origin}/api/urls/${data.short_code}`;
      setResult({ ...data, short_url: displayUrl });
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
      {/* Glow accent */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-brand-500/20 blur-3xl" />

      <h2 className="relative mb-2 text-xl font-bold text-white">Shorten a Link</h2>
      <p className="relative mb-6 text-sm text-slate-400">Paste any long URL and get a clean, trackable short link.</p>

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

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

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
