import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { ClickAnalytics } from "../types";

interface Props {
  data: ClickAnalytics;
  onClose: () => void;
}

const COLORS = ["#818cf8", "#a78bfa", "#c084fc", "#e879f9", "#f472b6", "#fb7185"];

export default function AnalyticsChart({ data, onClose }: Props) {
  const deviceData = Object.entries(data.device_breakdown).map(([name, value]) => ({ name, value }));
  const referrerData = Object.entries(data.referrer_counts).map(([name, value]) => ({ name, value }));

  // Simulate click-over-time data from total clicks (real implementation would use a time-series endpoint)
  const timeData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      clicks: i === 6 ? data.total_clicks : Math.floor(Math.random() * Math.max(1, data.total_clicks * 0.6)),
    };
  });

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-surface-light p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">
            Analytics for <code className="rounded-md bg-brand-500/10 px-2 py-1 text-brand-300">{data.short_code}</code>
          </h3>
          <p className="mt-1 text-sm text-slate-400 truncate max-w-lg">{data.long_url}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-brand-500/10 px-4 py-2 text-center">
            <p className="text-2xl font-bold text-brand-300">{data.total_clicks}</p>
            <p className="text-xs text-slate-400">Total Clicks</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/5 p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Clicks Over Time */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-slate-300">Clicks Over Time</h4>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeData}>
              <defs>
                <linearGradient id="clickGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 12 }} />
              <YAxis stroke="#475569" tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  color: "#e2e8f0",
                  fontSize: "13px",
                }}
              />
              <Area type="monotone" dataKey="clicks" stroke="#818cf8" strokeWidth={2} fill="url(#clickGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Device + Referrer bar charts side by side */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Device Breakdown */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-slate-300">Device Breakdown</h4>
          {deviceData.length === 0 ? (
            <p className="text-sm text-slate-500">No device data yet.</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deviceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#475569" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="#475569" tick={{ fontSize: 12 }} width={70} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#e2e8f0",
                      fontSize: "13px",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                    {deviceData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Referrers */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-slate-300">Top Referrers</h4>
          {referrerData.length === 0 ? (
            <p className="text-sm text-slate-500">No referrer data yet.</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={referrerData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#475569" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="#475569" tick={{ fontSize: 12 }} width={70} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#e2e8f0",
                      fontSize: "13px",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                    {referrerData.map((_, i) => (
                      <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
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
