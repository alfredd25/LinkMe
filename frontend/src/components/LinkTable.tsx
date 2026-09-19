import type { UrlRow } from "../types";

interface Props {
  urls: UrlRow[];
  onInspect: (code: string) => void;
  loading: boolean;
}

export default function LinkTable({ urls, onInspect, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-surface-light p-12">
        <svg className="h-6 w-6 animate-spin text-brand-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
    );
  }

  if (urls.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-surface-light p-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-500/10">
          <svg className="h-7 w-7 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-7.218a4.5 4.5 0 00-6.364 0l-4.5 4.5a4.5 4.5 0 006.364 6.364l1.757-1.757" />
          </svg>
        </div>
        <p className="text-slate-400">No links yet. Shorten your first URL above!</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface-light">
      <div className="border-b border-white/5 px-6 py-4">
        <h3 className="text-lg font-semibold text-white">Your Links</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-slate-500">
              <th className="px-6 py-3 font-medium">Short Code</th>
              <th className="px-6 py-3 font-medium">Destination</th>
              <th className="px-6 py-3 font-medium">Created</th>
              <th className="px-6 py-3 font-medium text-right">Clicks</th>
              <th className="px-6 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {urls.map((u) => (
              <tr key={u.short_code} className="transition-colors hover:bg-white/[0.02]">
                <td className="px-6 py-4">
                  <code className="rounded-md bg-brand-500/10 px-2 py-1 text-xs font-semibold text-brand-300">{u.short_code}</code>
                </td>
                <td className="max-w-xs truncate px-6 py-4 text-slate-300" title={u.long_url}>
                  {u.long_url}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right font-semibold text-white">{u.total_clicks}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => onInspect(u.short_code)}
                    className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:bg-brand-500/10 hover:text-brand-300 cursor-pointer"
                  >
                    Inspect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
