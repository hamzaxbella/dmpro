"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";

interface Event {
  id: number;
  lead_id: number;
  direction: string;
  body: string | null;
  ig_message_id: string | null;
  created_at: string;
}

interface LeadDetail {
  id: number;
  ig_username: string;
  full_name: string | null;
  profile_pic: string | null;
  igsid: string | null;
  status: string;
  notes: string | null;
  ignored: number;
  created_at: string;
  updated_at: string;
  events: Event[];
}

interface Params {
  id: string;
}

export default function LeadDetailPage({ params }: { params: Promise<Params> }) {
  const router = useRouter();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState("");
  const [fullName, setFullName] = useState("");
  const [resolvedId, setResolvedId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setResolvedId(p.id));
  }, [params]);

  const fetchLead = useCallback(async () => {
    if (!resolvedId) return;
    const res = await fetch(`/api/leads/${resolvedId}`);
    if (res.ok) {
      const data = await res.json();
      setLead(data);
      setNotes(data.notes ?? "");
      setFullName(data.full_name ?? "");
    }
    setLoading(false);
  }, [resolvedId]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  const handleSave = async () => {
    if (!resolvedId) return;
    await fetch(`/api/leads/${resolvedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes, full_name: fullName }),
    });
    setEditing(false);
    fetchLead();
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!resolvedId) return;
    await fetch(`/api/leads/${resolvedId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchLead();
  };

  const handleIgnore = async () => {
    if (!resolvedId || !lead) return;
    if (!confirm(`Ignore @${lead.ig_username}? They'll be removed from your inbox and pipeline.`)) return;
    await fetch(`/api/leads/${resolvedId}/ignore`, { method: "POST" });
    router.push("/board");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-16">
        <p className="text-lg" style={{ color: "var(--muted)" }}>
          Lead not found
        </p>
        <Link href="/board" className="text-sm mt-2 inline-block" style={{ color: "var(--accent)" }}>
          ← Back to pipeline
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <Link
        href="/board"
        className="text-[0.8125rem] mb-5 inline-flex items-center gap-1.5 font-medium"
        style={{ color: "var(--muted)" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to pipeline
      </Link>

      {/* Lead Header Card */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <a
              href={`https://instagram.com/${lead.ig_username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
              title="Open on Instagram"
            >
              {lead.profile_pic ? (
                <img src={lead.profile_pic} alt={lead.ig_username} className="w-12 h-12 rounded-xl object-cover" />
              ) : (
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-semibold"
                  style={{ background: "var(--accent-light)", color: "var(--accent)" }}
                >
                  {lead.ig_username.charAt(0).toUpperCase()}
                </div>
              )}
            </a>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-[-0.01em]" style={{ color: "var(--foreground)" }}>
                  @{lead.ig_username}
                </h1>
                {!/^\d+$/.test(lead.ig_username) && (
                  <a
                    href={`https://instagram.com/${lead.ig_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-40 hover:opacity-80 transition-opacity"
                    title="Open on Instagram"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                )}
              </div>
              {!editing ? (
                <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
                  {lead.full_name || "No name set"}
                </p>
              ) : (
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input mt-1"
                  style={{ maxWidth: 220 }}
                  placeholder="Full name"
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => (editing ? handleSave() : setEditing(true))}
              className={editing ? "btn-primary" : "btn-ghost"}
            >
              {editing ? "Save" : "Edit"}
            </button>
            <button
              onClick={handleIgnore}
              className="btn-ghost text-[0.8125rem]"
              style={{ color: "var(--muted)" }}
              title="Add to ignore list — removes from inbox and pipeline"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              Ignore
            </button>
          </div>
        </div>

        {/* Status selector */}
        <div className="flex items-center gap-2 mt-5 flex-wrap">
          {["contacted", "replied", "interested", "closed", "lost"].map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              className="transition-opacity duration-150"
              style={{
                opacity: lead.status === s ? 1 : 0.35,
              }}
            >
              <StatusBadge status={s} size="md" />
            </button>
          ))}
        </div>

        {/* Notes */}
        <div className="mt-5 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
          <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--foreground-secondary)" }}>
            Notes
          </label>
          {editing ? (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="input"
              style={{ resize: "vertical" }}
              placeholder="Add notes about this lead..."
            />
          ) : (
            <p className="text-sm leading-relaxed" style={{ color: lead.notes ? "var(--foreground-secondary)" : "var(--muted)" }}>
              {lead.notes || "No notes yet"}
            </p>
          )}
        </div>

        <div className="flex gap-4 mt-4 text-[0.6875rem]" style={{ color: "var(--muted)" }}>
          <span>Created {new Date(lead.created_at + "Z").toLocaleDateString()}</span>
          <span>·</span>
          <span>Updated {new Date(lead.updated_at + "Z").toLocaleDateString()}</span>
        </div>
      </div>

      {/* Event Timeline */}
      <div>
        <h2 className="text-[1rem] font-semibold mb-4" style={{ color: "var(--foreground)" }}>
          Timeline
        </h2>

        {lead.events.length === 0 ? (
          <div
            className="card p-10 text-center text-sm"
            style={{ color: "var(--muted)" }}
          >
            No events yet
          </div>
        ) : (
          <div className="space-y-2.5">
            {lead.events.map((event) => (
              <div
                key={event.id}
                className="card p-4 flex items-start gap-3 animate-slide-in"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 mt-0.5"
                  style={{
                    background:
                      event.direction === "inbound"
                        ? "var(--status-closed-bg)"
                        : "var(--status-replied-bg)",
                    color:
                      event.direction === "inbound" ? "#059669" : "#2563eb",
                  }}
                >
                  {event.direction === "inbound" ? "↓" : "↑"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[0.8125rem] font-semibold capitalize" style={{ color: "var(--foreground)" }}>
                      {event.direction}
                    </span>
                    <span className="text-[0.6875rem]" style={{ color: "var(--muted)" }}>
                      {new Date(event.created_at + "Z").toLocaleString()}
                    </span>
                  </div>
                  {event.body && (
                    <p className="text-sm" style={{ color: "var(--foreground-secondary)" }}>
                      {event.body}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
