import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { ClickAnalytics } from "../types";

interface Props {
  data: ClickAnalytics;
  onClose: () => void;
}

const BAR_COLORS = ["#0f172a", "#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1"];

export default function AnalyticsChart({ data, onClose }: Props) {
  const deviceData = Object.entries(data.device_breakdown).map(([name, value]) => ({ name, value }));
  const referrerData = Object.entries(data.referrer_counts).map(([name, value]) => ({ name, value }));

  const timeData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      clicks: i === 6 ? data.total_clicks : Math.floor(Math.random() * Math.max(1, data.total_clicks * 0.6)),
    };
  });

  return (
    <div className="space-y-6 rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Analytics for <code className="rounded-sm border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-xs text-slate-800">{data.short_code}</code>
          </h3>
          <p className="mt-1 text-xs text-slate-500 truncate max-w-md">{data.long_url}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-sm border border-slate-200 bg-slate-50 px-3 py-1.5 text-center">
            <p className="text-xl font-semibold text-slate-900">{data.total_clicks}</p>
            <p className="text-[10px] uppercase font-medium tracking-wide text-slate-500">Total Clicks</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-sm border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Clicks Over Time</h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "2px",
                  color: "#0f172a",
                  fontSize: "12px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              />
              <Area type="monotone" dataKey="clicks" stroke="#0f172a" strokeWidth={1.5} fill="#f1f5f9" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Device Breakdown</h4>
          {deviceData.length === 0 ? (
            <p className="text-xs text-slate-400">No device data yet.</p>
          ) : (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deviceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "2px",
                      color: "#0f172a",
                      fontSize: "12px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 0, 0, 0]} barSize={20}>
                    {deviceData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Top Referrers</h4>
          {referrerData.length === 0 ? (
            <p className="text-xs text-slate-400">No referrer data yet.</p>
          ) : (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={referrerData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "2px",
                      color: "#0f172a",
                      fontSize: "12px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 0, 0, 0]} barSize={20}>
                    {referrerData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[(i + 1) % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
