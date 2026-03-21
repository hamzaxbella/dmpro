"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Reminder {
  id: number;
  lead_id: number;
  due_at: string;
  note: string | null;
  sent: number;
  created_at: string;
  ig_username: string;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [note, setNote] = useState("");

  const fetchReminders = useCallback(async () => {
    const res = await fetch(`/api/reminders?filter=${filter}`);
    const data = await res.json();
    setReminders(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId || !dueAt) return;

    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lead_id: parseInt(leadId),
        due_at: new Date(dueAt).toISOString().replace("T", " ").slice(0, 19),
        note: note || undefined,
      }),
    });

    if (res.ok) {
      setShowForm(false);
      setLeadId("");
      setDueAt("");
      setNote("");
      fetchReminders();
    }
  };

  const now = new Date();

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[1.5rem] font-bold tracking-[-0.02em]" style={{ color: "var(--foreground)" }}>
            Reminders
          </h1>
          <p className="text-[0.8125rem] mt-0.5" style={{ color: "var(--muted)" }}>
            Scheduled follow-ups
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Reminder
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6">
        {[
          { key: "all", label: "All" },
          { key: "due", label: "Due Now" },
          { key: "upcoming", label: "Upcoming" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
            style={{
              background: filter === f.key ? "var(--accent-light)" : "transparent",
              color: filter === f.key ? "var(--accent)" : "var(--muted)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="card p-5 mb-6 flex flex-wrap gap-4 items-end animate-slide-in"
        >
          <div className="min-w-[120px]">
            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--foreground-secondary)" }}>
              Lead ID
            </label>
            <input
              type="number"
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="input"
              required
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--foreground-secondary)" }}>
              Due At
            </label>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="input"
              required
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--foreground-secondary)" }}>
              Note
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Follow up about pricing"
              className="input"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Reminder list */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="spinner" />
        </div>
      ) : reminders.length === 0 ? (
        <div
          className="card p-12 text-center text-sm"
          style={{ color: "var(--muted)" }}
        >
          No reminders found
        </div>
      ) : (
        <div className="space-y-2.5">
          {reminders.map((r) => {
            const dueDate = new Date(r.due_at + "Z");
            const isPast = dueDate < now && !r.sent;
            const isSent = r.sent === 1;

            return (
              <div
                key={r.id}
                className="card p-4 animate-slide-in"
                style={{
                  borderColor: isPast
                    ? "rgba(239,68,68,0.25)"
                    : isSent
                      ? "rgba(16,185,129,0.2)"
                      : "var(--border)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Status icon */}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                      style={{
                        background: isSent
                          ? "var(--status-closed-bg)"
                          : isPast
                            ? "var(--status-lost-bg)"
                            : "var(--accent-light)",
                        color: isSent
                          ? "#059669"
                          : isPast
                            ? "#dc2626"
                            : "var(--accent)",
                      }}
                    >
                      {isSent ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : isPast ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2" /><path d="M5 3L2 6" /><path d="M22 6l-3-3" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <Link
                          href={`/leads/${r.lead_id}`}
                          className="text-[0.8125rem] font-semibold hover:underline"
                          style={{ color: "var(--accent)" }}
                        >
                          @{r.ig_username}
                        </Link>
                        {isSent && (
                          <span
                            className="status-badge"
                            style={{
                              color: "#059669",
                              backgroundColor: "var(--status-closed-bg)",
                              fontSize: "0.625rem",
                            }}
                          >
                            Sent
                          </span>
                        )}
                        {isPast && !isSent && (
                          <span
                            className="status-badge"
                            style={{
                              color: "#dc2626",
                              backgroundColor: "var(--status-lost-bg)",
                              fontSize: "0.625rem",
                            }}
                          >
                            Overdue
                          </span>
                        )}
                      </div>
                      {r.note && (
                        <p className="text-sm" style={{ color: "var(--foreground-secondary)" }}>
                          {r.note}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                      {dueDate.toLocaleDateString()}
                    </p>
                    <p className="text-[0.6875rem]" style={{ color: "var(--muted)" }}>
                      {dueDate.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
