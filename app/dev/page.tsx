"use client";

import { useState } from "react";

interface Message {
  message: string;
  from: { name: string; id: string };
  created_time: string;
}

interface Conversation {
  id: string;
  participants?: { data: { name: string; id: string }[] };
  messages?: { data: Message[] };
}

interface CheckResult {
  connected: boolean;
  token_preview?: string;
  error?: string;
  error_code?: number;
  account?: { id: string; name: string; username?: string };
  scoped_id?: string;
  internal_ig_id?: string | null;
  conversations?: Conversation[];
  conversations_error?: string | null;
  debug?: {
    page1_count: number;
    page2_count: number;
    internal_id_count: number;
    has_next: boolean;
    internal_ig_id: string | null;
  };
}

export default function DevPage() {
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setResult(null);
    const res = await fetch('/api/dev/ig-check');
    setResult(await res.json());
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[1.5rem] font-bold tracking-[-0.02em]" style={{ color: "var(--foreground)" }}>
          Dev — Instagram Connection Check
        </h1>
        <p className="text-[0.8125rem] mt-1" style={{ color: "var(--muted)" }}>
          Tests the Meta Graph API connection and fetches your latest Instagram conversations.
        </p>
      </div>

      <button onClick={run} disabled={loading} className="btn-primary mb-6">
        {loading ? "Checking…" : "Run Connection Check"}
      </button>

      {result && (
        <div className="space-y-4">

          {/* Status */}
          <div className="card p-4 flex items-start gap-3">
            <span className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
              style={{ background: result.connected ? "#10b981" : "#ef4444" }} />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                {result.connected ? "Connected via graph.instagram.com" : "Not connected"}
              </p>
              {result.token_preview && (
                <p className="text-xs mt-0.5 font-mono" style={{ color: "var(--muted)" }}>
                  Token: {result.token_preview} ({result.token_length} chars)
                </p>
              )}
              {result.error && (
                <p className="text-xs mt-0.5" style={{ color: "#ef4444" }}>
                  {result.error_code ? `[${result.error_code}] ` : ''}{result.error}
                </p>
              )}
            </div>
          </div>

          {/* Account */}
          {result.account && (
            <div className="card p-4">
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--muted)" }}>ACCOUNT</p>
              <div className="space-y-1 text-sm" style={{ color: "var(--foreground)" }}>
                <div className="flex gap-2">
                  <span style={{ color: "var(--muted)" }}>ID</span>
                  <span className="font-mono">{result.account.id}</span>
                </div>
                <div className="flex gap-2">
                  <span style={{ color: "var(--muted)" }}>Name</span>
                  <span>{result.account.name}</span>
                </div>
                {result.account.username && (
                  <div className="flex gap-2">
                    <span style={{ color: "var(--muted)" }}>Username</span>
                    <span>@{result.account.username}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ID debug */}
          {result.connected && (
            <div className="card p-4">
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--muted)" }}>IDs</p>
              <div className="space-y-1 text-xs font-mono" style={{ color: "var(--foreground-secondary)" }}>
                <div className="flex gap-2"><span style={{ color: "var(--muted)" }}>Scoped ID (/me)</span><span>{result.scoped_id}</span></div>
                <div className="flex gap-2"><span style={{ color: "var(--muted)" }}>Internal IG ID</span><span>{result.internal_ig_id ?? "same"}</span></div>
              </div>
              {result.debug && (
                <div className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
                  page1: {result.debug.page1_count} · page2: {result.debug.page2_count} · via internal ID: {result.debug.internal_id_count}
                </div>
              )}
            </div>
          )}

          {/* Conversations */}
          {result.conversations_error && (
            <div className="card p-4">
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--muted)" }}>CONVERSATIONS ERROR</p>
              <p className="text-sm" style={{ color: "#ef4444" }}>{result.conversations_error}</p>
            </div>
          )}
          {result.conversations && result.conversations.length === 0 && (
            <div className="card p-4">
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--muted)" }}>CONVERSATIONS</p>
              <p className="text-sm" style={{ color: "var(--muted)" }}>No conversations found via any method.</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
