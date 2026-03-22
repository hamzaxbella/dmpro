"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"; // reaching the skies
import FunnelChart from "@/components/charts/FunnelChart";

interface FunnelRow {
  status: string;
  count: number;
}

interface VolumeRow {
  date: string;
  total: number;
  outbound: number;
  inbound: number;
}

interface AnalyticsData {
  totalLeads: number;
  replyRate: number;
  conversionRate: number;
  avgResponseHours: number | null;
  funnel: FunnelRow[];
  volume: VolumeRow[];
  range: string;
}

const METRICS = [
  { key: "totalLeads", label: "Total Leads", format: (v: number) => v.toString(), sub: "All time" },
  { key: "replyRate", label: "Reply Rate", format: (v: number) => `${(v * 100).toFixed(1)}%`, sub: "Leads who replied" },
  { key: "conversionRate", label: "Conversion", format: (v: number) => `${(v * 100).toFixed(1)}%`, sub: "Reached Closed" },
  { key: "avgResponseHours", label: "Avg Response", format: (v: number | null) => v != null ? `${v.toFixed(1)}h` : "—", sub: "First reply time" },
] as const;

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [range, setRange] = useState("30d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?range=${range}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [range]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[1.5rem] font-bold tracking-[-0.02em]" style={{ color: "var(--foreground)" }}>
            Analytics
          </h1>
          <p className="text-[0.8125rem] mt-0.5" style={{ color: "var(--muted)" }}>
            Pipeline performance overview
          </p>
        </div>

        {/* Range selector */}
        <div
          className="flex rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
        >
          {["7d", "30d", "90d", "all"].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-3.5 py-1.5 text-xs font-medium transition-all duration-150"
              style={{
                background: range === r ? "var(--accent)" : "transparent",
                color: range === r ? "#fff" : "var(--muted)",
              }}
            >
              {r === "all" ? "All" : r}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {METRICS.map((m) => {
          const value = data[m.key as keyof AnalyticsData];
          return (
            <div key={m.key} className="metric-card">
              <p className="text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>
                {m.label}
              </p>
              <p className="text-[1.625rem] font-bold tracking-[-0.02em]" style={{ color: "var(--foreground)" }}>
                {m.format(value as number)}
              </p>
              <p className="text-[0.6875rem] mt-1" style={{ color: "var(--muted)" }}>
                {m.sub}
              </p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel */}
        <div className="card-elevated p-6">
          <h3 className="text-[0.875rem] font-semibold mb-5" style={{ color: "var(--foreground)" }}>
            Pipeline Funnel
          </h3>
          <FunnelChart data={data.funnel} />
        </div>

        {/* Volume Chart */}
        <div className="card-elevated p-6">
          <h3 className="text-[0.875rem] font-semibold mb-5" style={{ color: "var(--foreground)" }}>
            DM Volume
          </h3>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <AreaChart data={data.volume}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,0,0,0.05)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#9494a8", fontSize: 11 }}
                  axisLine={{ stroke: "rgba(0,0,0,0.08)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#9494a8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #e8e8ef",
                    borderRadius: 10,
                    color: "#1a1a2e",
                    fontSize: 13,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  cursor={{ stroke: "rgba(0,0,0,0.06)" }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "#64648c" }}
                />
                <Area
                  type="monotone"
                  dataKey="outbound"
                  name="Outbound"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="rgba(59,130,246,0.12)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="inbound"
                  name="Inbound"
                  stackId="1"
                  stroke="#10b981"
                  fill="rgba(16,185,129,0.12)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
