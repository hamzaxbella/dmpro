"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import type { InboxItem } from "@/app/api/inbox/route";

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const now = new Date();
  const date = new Date(dateStr + "Z");
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInbox = async () => {
    const res = await fetch("/api/inbox");
    if (res.ok) {
      setItems(await res.json());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInbox();
    const interval = setInterval(fetchInbox, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[1.5rem] font-bold tracking-[-0.02em]" style={{ color: "var(--foreground)" }}>
            Inbox
          </h1>
          <p className="text-[0.8125rem] mt-0.5" style={{ color: "var(--muted)" }}>
            {items.length} conversation{items.length !== 1 ? "s" : ""} · auto-refreshing
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="spinner" />
        </div>
      ) : items.length === 0 ? (
        <div
          className="card p-12 text-center"
          style={{ color: "var(--muted)" }}
        >
          <div className="text-3xl mb-3">💬</div>
          <p className="text-sm font-medium" style={{ color: "var(--foreground-secondary)" }}>
            No conversations yet
          </p>
          <p className="text-xs mt-1">
            Messages from Instagram will appear here automatically
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {items.map((item, index) => (
            <Link
              key={item.id}
              href={`/leads/${item.id}`}
              className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-black/[0.02]"
              style={{
                borderBottom: index < items.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                style={{
                  background: "var(--accent-light)",
                  color: "var(--accent)",
                }}
              >
                {item.ig_username.charAt(0).toUpperCase()}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-[0.875rem] font-semibold truncate" style={{ color: "var(--foreground)" }}>
                    @{item.ig_username}
                  </span>
                  <span className="text-[0.6875rem] flex-shrink-0" style={{ color: "var(--muted)" }}>
                    {timeAgo(item.last_event_at ?? item.updated_at)}
                  </span>
                </div>

                {item.full_name && (
                  <p className="text-xs truncate mb-0.5" style={{ color: "var(--muted)" }}>
                    {item.full_name}
                  </p>
                )}

                <div className="flex items-center gap-1.5">
                  {item.last_direction && (
                    <span
                      className="text-xs font-bold flex-shrink-0"
                      style={{
                        color: item.last_direction === "inbound" ? "#059669" : "#2563eb",
                      }}
                    >
                      {item.last_direction === "inbound" ? "↓" : "↑"}
                    </span>
                  )}
                  <p
                    className="text-xs truncate"
                    style={{ color: item.last_message ? "var(--foreground-secondary)" : "var(--muted)" }}
                  >
                    {item.last_message ?? "No messages yet"}
                  </p>
                </div>
              </div>

              {/* Right side */}
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <StatusBadge status={item.status} />
                {item.event_count > 0 && (
                  <span
                    className="text-[0.625rem] font-medium px-1.5 py-0.5 rounded-full"
                    style={{
                      background: "rgba(0,0,0,0.06)",
                      color: "var(--muted)",
                    }}
                  >
                    {item.event_count} msg{item.event_count !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
