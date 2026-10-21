import type { UrlRow } from "../types";

interface Props {
  urls: UrlRow[];
  onInspect: (code: string) => void;
  loading: boolean;
}

export default function LinkTable({ urls, onInspect, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-sm border border-slate-200 bg-white p-10">
        <svg className="h-5 w-5 animate-spin text-slate-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
    );
  }

  if (urls.length === 0) {
    return (
      <div className="rounded-sm border border-slate-200 bg-white p-10 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-sm bg-slate-100 text-slate-500">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-7.218a4.5 4.5 0 00-6.364 0l-4.5 4.5a4.5 4.5 0 006.364 6.364l1.757-1.757" />
          </svg>
        </div>
        <p className="text-xs text-slate-500">No links yet. Shorten a URL to see it here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Your Links</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <th className="px-5 py-2.5 font-medium">Short Code</th>
              <th className="px-5 py-2.5 font-medium">Destination</th>
              <th className="px-5 py-2.5 font-medium">Created</th>
              <th className="px-5 py-2.5 font-medium text-right">Clicks</th>
              <th className="px-5 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {urls.map((u) => (
              <tr key={u.short_code} className="transition-colors hover:bg-slate-50/70">
                <td className="px-5 py-3">
                  <code className="rounded-sm border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono font-medium text-slate-800">
                    {u.short_code}
                  </code>
                </td>
                <td className="max-w-xs truncate px-5 py-3 text-slate-700 text-xs" title={u.long_url}>
                  {u.long_url}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-3 text-right font-medium text-slate-900 text-xs">{u.total_clicks}</td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => onInspect(u.short_code)}
                    className="rounded-sm border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 cursor-pointer"
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
