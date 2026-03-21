"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  contacted: "#f59e0b",
  replied: "#3b82f6",
  interested: "#8b5cf6",
  closed: "#10b981",
  lost: "#ef4444",
};

interface FunnelRow {
  status: string;
  count: number;
}

interface FunnelChartProps {
  data: FunnelRow[];
}

export default function FunnelChart({ data }: FunnelChartProps) {
  const ordered = ["contacted", "replied", "interested", "closed", "lost"];
  const sortedData = ordered.map(
    (s) => data.find((d) => d.status === s) ?? { status: s, count: 0 }
  );

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={sortedData} layout="vertical" barCategoryGap="25%">
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="rgba(0,0,0,0.05)"
          />
          <XAxis
            type="number"
            tick={{ fill: "#9494a8", fontSize: 11 }}
            axisLine={{ stroke: "rgba(0,0,0,0.08)" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="status"
            width={85}
            tick={{ fill: "#64648c", fontSize: 12 }}
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
            cursor={{ fill: "rgba(0,0,0,0.02)" }}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]}>
            {sortedData.map((entry) => (
              <Cell
                key={entry.status}
                fill={STATUS_COLORS[entry.status] ?? "#f47458"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
