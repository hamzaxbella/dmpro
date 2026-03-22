"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface IgnoredLead {
  id: number;
  ig_username: string;
  full_name: string | null;
  profile_pic: string | null;
  igsid: string | null;
  status: string;
  updated_at: string;
}

export default function IgnoredPage() {
  const [leads, setLeads] = useState<IgnoredLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [unignoringId, setUnignoringId] = useState<number | null>(null);

  const fetchIgnored = useCallback(async () => {
    const res = await fetch("/api/leads?ignored=1");
    if (res.ok) setLeads(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchIgnored(); }, [fetchIgnored]);

  const handleUnignore = async (id: number) => {
    setUnignoringId(id);
    await fetch(`/api/leads/${id}/ignore`, { method: "DELETE" });
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setUnignoringId(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Permanently delete this lead?")) return;
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
    setLeads((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/board"
              className="text-[0.8125rem] font-medium inline-flex items-center gap-1.5"
              style={{ color: "var(--muted)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Board
            </Link>
          </div>
          <h1 className="text-[1.5rem] font-bold tracking-[-0.02em]" style={{ color: "var(--foreground)" }}>
            Ignored Accounts
          </h1>
          <p className="text-[0.8125rem] mt-0.5" style={{ color: "var(--muted)" }}>
            {leads.length} account{leads.length !== 1 ? "s" : ""} silenced — messages from these people are ignored
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="spinner" />
        </div>
      ) : leads.length === 0 ? (
        <div className="card p-14 text-center">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--accent-light)" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>No ignored accounts</p>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Use the Ignore button on any lead to hide them from your inbox and pipeline.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => {
            const igUrl = `https://instagram.com/${lead.ig_username}`;
            const showLink = !/^\d+$/.test(lead.ig_username);

            return (
              <div key={lead.id} className="card p-4 flex items-center gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {lead.profile_pic ? (
                    <img
                      src={lead.profile_pic}
                      alt={lead.ig_username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                      style={{ background: "rgba(0,0,0,0.05)", color: "var(--foreground-secondary)" }}
                    >
                      {lead.ig_username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[0.875rem] font-semibold truncate" style={{ color: "var(--foreground)" }}>
                      @{lead.ig_username}
                    </span>
                    {showLink && (
                      <a
                        href={igUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="opacity-40 hover:opacity-80 transition-opacity flex-shrink-0"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    )}
                  </div>
                  {lead.full_name && (
                    <p className="text-xs truncate" style={{ color: "var(--muted)" }}>{lead.full_name}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleUnignore(lead.id)}
                    disabled={unignoringId === lead.id}
                    className="btn-ghost text-xs"
                    style={{ color: "var(--accent)" }}
                    title="Move back to pipeline"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    {unignoringId === lead.id ? "Restoring…" : "Restore"}
                  </button>
                  <button
                    onClick={() => handleDelete(lead.id)}
                    className="btn-ghost text-xs"
                    style={{ color: "var(--status-lost)" }}
                    title="Permanently delete"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
