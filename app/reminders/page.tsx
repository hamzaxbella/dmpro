"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";

interface Reminder {
  id: number;
  lead_id: number;
  due_at: string;
  note: string | null;
  sent: number;
  ig_username: string;
  profile_pic: string | null;
}

interface StaleLead {
  id: number;
  ig_username: string;
  full_name: string | null;
  profile_pic: string | null;
  status: string;
  updated_at: string;
  days_stale: number;
}

interface Settings {
  contacted_days: number;
  replied_days: number;
  interested_days: number;
}

const DEFAULT_SETTINGS: Settings = {
  contacted_days: 3,
  replied_days: 5,
  interested_days: 7,
};

const STATUS_LABELS: Record<string, string> = {
  contacted: "Contacted, no reply",
  replied: "Replied, no follow-up",
  interested: "Interested, not closed",
};

type Tab = "stale" | "scheduled";

export default function RemindersPage() {
  const [tab, setTab] = useState<Tab>("stale");
  const [stale, setStale] = useState<StaleLead[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [draftSettings, setDraftSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [loadingStale, setLoadingStale] = useState(true);
  const [loadingScheduled, setLoadingScheduled] = useState(true);

  // Schedule reminder form
  const [scheduleFor, setScheduleFor] = useState<StaleLead | null>(null);
  const [schedDate, setSchedDate] = useState("");
  const [schedNote, setSchedNote] = useState("");

  const fetchStale = useCallback(async () => {
    setLoadingStale(true);
    const res = await fetch("/api/reminders?filter=stale");
    if (res.ok) setStale(await res.json());
    setLoadingStale(false);
  }, []);

  const fetchScheduled = useCallback(async () => {
    setLoadingScheduled(true);
    const res = await fetch("/api/reminders");
    if (res.ok) setReminders(await res.json());
    setLoadingScheduled(false);
  }, []);

  const fetchSettings = useCallback(async () => {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const data: Settings = await res.json();
      setSettings(data);
      setDraftSettings(data);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchStale();
    fetchScheduled();
  }, [fetchSettings, fetchStale, fetchScheduled]);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draftSettings),
    });
    if (res.ok) {
      const data: Settings = await res.json();
      setSettings(data);
      setDraftSettings(data);
      setShowSettings(false);
      fetchStale(); // re-evaluate with new thresholds
    }
    setSavingSettings(false);
  };

  const handleSchedule = async (lead: StaleLead, dueAt: string, note: string) => {
    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lead_id: lead.id,
        due_at: new Date(dueAt).toISOString().replace("T", " ").slice(0, 19),
        note: note || undefined,
      }),
    });
    if (res.ok) {
      setScheduleFor(null);
      setSchedDate("");
      setSchedNote("");
      fetchScheduled();
    }
  };

  const handleDismissReminder = async (id: number) => {
    await fetch(`/api/reminders/${id}`, { method: "DELETE" });
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const handleMarkDone = async (id: number) => {
    await fetch(`/api/reminders/${id}`, { method: "PATCH" });
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, sent: 1 } : r)));
  };

  const now = new Date();
  const overdueCount = reminders.filter((r) => !r.sent && new Date(r.due_at + "Z") < now).length;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[1.5rem] font-bold tracking-[-0.02em]" style={{ color: "var(--foreground)" }}>
            Reminders
          </h1>
          <p className="text-[0.8125rem] mt-0.5" style={{ color: "var(--muted)" }}>
            {stale.length > 0
              ? `${stale.length} lead${stale.length !== 1 ? "s" : ""} need follow-up`
              : "All leads are on track"}
            {overdueCount > 0 && ` · ${overdueCount} overdue reminder${overdueCount !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="btn-ghost"
          style={{ color: showSettings ? "var(--accent)" : undefined }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Configure
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="card p-5 mb-6 animate-slide-in">
          <h2 className="text-[0.875rem] font-semibold mb-4" style={{ color: "var(--foreground)" }}>
            Follow-up thresholds
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
            Alert when a lead has been in a status for longer than these many days without activity.
          </p>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {(["contacted", "replied", "interested"] as const).map((status) => {
              const key = `${status}_days` as keyof Settings;
              return (
                <div key={status}>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--foreground-secondary)" }}>
                    {STATUS_LABELS[status]}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={draftSettings[key]}
                      onChange={(e) =>
                        setDraftSettings((prev) => ({ ...prev, [key]: parseInt(e.target.value) || 1 }))
                      }
                      className="input pr-10"
                    />
                    <span
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
                      style={{ color: "var(--muted)" }}
                    >
                      days
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setDraftSettings(settings); setShowSettings(false); }}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button onClick={handleSaveSettings} className="btn-primary" disabled={savingSettings}>
              {savingSettings ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {([
          { key: "stale", label: `Stale Leads${stale.length > 0 ? ` (${stale.length})` : ""}` },
          { key: "scheduled", label: `Scheduled${reminders.filter(r => !r.sent).length > 0 ? ` (${reminders.filter(r => !r.sent).length})` : ""}` },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-1.5 rounded-lg text-[0.8125rem] font-medium transition-all duration-150"
            style={{
              background: tab === t.key ? "var(--accent-light)" : "transparent",
              color: tab === t.key ? "var(--accent)" : "var(--muted)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Stale Leads Tab ── */}
      {tab === "stale" && (
        <>
          {loadingStale ? (
            <div className="flex items-center justify-center h-32"><div className="spinner" /></div>
          ) : stale.length === 0 ? (
            <div className="card p-14 text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "var(--status-closed-bg)" }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>All caught up!</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                No leads have gone silent based on your current thresholds
                ({settings.contacted_days}d contacted · {settings.replied_days}d replied · {settings.interested_days}d interested).
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {stale.map((lead) => (
                <div key={lead.id} className="card p-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    {lead.profile_pic ? (
                      <img src={lead.profile_pic} alt={lead.ig_username} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                        style={{ background: "var(--accent-light)", color: "var(--accent)" }}
                      >
                        {lead.ig_username.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="text-[0.875rem] font-semibold hover:underline"
                          style={{ color: "var(--foreground)" }}
                        >
                          @{lead.ig_username}
                        </Link>
                        <StatusBadge status={lead.status} />
                        <span
                          className="text-[0.6875rem] font-semibold px-2 py-0.5 rounded-md"
                          style={{ background: "var(--status-lost-bg)", color: "#dc2626" }}
                        >
                          {lead.days_stale}d silent
                        </span>
                      </div>
                      {lead.full_name && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{lead.full_name}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {scheduleFor?.id === lead.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="datetime-local"
                            value={schedDate}
                            onChange={(e) => setSchedDate(e.target.value)}
                            className="input text-xs py-1.5"
                            style={{ width: 180 }}
                          />
                          <input
                            type="text"
                            value={schedNote}
                            onChange={(e) => setSchedNote(e.target.value)}
                            placeholder="Note (optional)"
                            className="input text-xs py-1.5"
                            style={{ width: 140 }}
                          />
                          <button
                            onClick={() => schedDate && handleSchedule(lead, schedDate, schedNote)}
                            className="btn-primary text-xs py-1.5 px-3"
                            disabled={!schedDate}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => { setScheduleFor(null); setSchedDate(""); setSchedNote(""); }}
                            className="btn-ghost text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setScheduleFor(lead)}
                          className="btn-ghost text-xs"
                          style={{ color: "var(--accent)" }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2" /><path d="M5 3L2 6" /><path d="M22 6l-3-3" />
                          </svg>
                          Schedule reminder
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Scheduled Tab ── */}
      {tab === "scheduled" && (
        <>
          {loadingScheduled ? (
            <div className="flex items-center justify-center h-32"><div className="spinner" /></div>
          ) : reminders.length === 0 ? (
            <div className="card p-14 text-center">
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                No scheduled reminders yet. Use the Stale Leads tab to schedule them.
              </p>
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
                    className="card p-4"
                    style={{
                      borderColor: isPast ? "rgba(239,68,68,0.3)" : isSent ? "rgba(16,185,129,0.2)" : "var(--border)",
                      opacity: isSent ? 0.6 : 1,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Status icon */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: isSent ? "var(--status-closed-bg)" : isPast ? "var(--status-lost-bg)" : "var(--accent-light)",
                          color: isSent ? "#059669" : isPast ? "#dc2626" : "var(--accent)",
                        }}
                      >
                        {isSent ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : isPast ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2" /></svg>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/leads/${r.lead_id}`}
                            className="text-[0.875rem] font-semibold hover:underline"
                            style={{ color: "var(--accent)" }}
                          >
                            @{r.ig_username}
                          </Link>
                          {isPast && !isSent && (
                            <span className="status-badge" style={{ color: "#dc2626", background: "var(--status-lost-bg)", fontSize: "0.625rem" }}>
                              Overdue
                            </span>
                          )}
                          {isSent && (
                            <span className="status-badge" style={{ color: "#059669", background: "var(--status-closed-bg)", fontSize: "0.625rem" }}>
                              Done
                            </span>
                          )}
                        </div>
                        {r.note && (
                          <p className="text-xs mt-0.5" style={{ color: "var(--foreground-secondary)" }}>{r.note}</p>
                        )}
                        <p className="text-[0.6875rem] mt-0.5" style={{ color: "var(--muted)" }}>
                          {dueDate.toLocaleDateString()} at {dueDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>

                      {!isSent && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleMarkDone(r.id)}
                            className="btn-ghost text-xs"
                            style={{ color: "#059669" }}
                          >
                            Mark done
                          </button>
                          <button
                            onClick={() => handleDismissReminder(r.id)}
                            className="btn-ghost text-xs"
                            style={{ color: "var(--muted)" }}
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
