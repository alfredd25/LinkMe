import { useState } from "react";
import { shortenUrl } from "../api/client";
import type { ShortenedUrl } from "../types";
import { copyToClipboard } from "../utils/clipboard";

interface Props {
  onShortened: () => void;
}

export default function LinkShortener({ onShortened }: Props) {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<ShortenedUrl | null>(null);
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
      <h2 className="mb-1 text-base font-semibold text-slate-900">Shorten a Link</h2>
      <p className="mb-4 text-xs text-slate-500">Paste any URL to generate a clean, short link.</p>

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
