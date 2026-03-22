"use client";

import { useRouter } from "next/navigation";
import StatusBadge from "./StatusBadge";

export interface Lead {
  id: number;
  ig_username: string;
  igsid?: string | null;
  full_name: string | null;
  profile_pic?: string | null;
  status: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  event_count?: number;
  last_message?: string | null;
}

interface LeadCardProps {
  lead: Lead;
  isDragging?: boolean;
}

export default function LeadCard({ lead, isDragging }: LeadCardProps) {
  const router = useRouter();
  const timeAgo = getTimeAgo(lead.updated_at);
  const igUrl = `https://instagram.com/${lead.ig_username}`;
  const showIgLink = lead.ig_username && !/^\d+$/.test(lead.ig_username);

  return (
    <div
      className="card p-3.5 cursor-pointer animate-slide-in"
      style={{
        opacity: isDragging ? 0.6 : 1,
        transform: isDragging ? "rotate(2deg) scale(1.02)" : "none",
        transition: "all 0.15s ease",
      }}
      onClick={() => router.push(`/leads/${lead.id}`)}
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Avatar — links to Instagram, stops card navigation */}
          <a
            href={showIgLink ? igUrl : undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0"
            title={showIgLink ? `Open @${lead.ig_username} on Instagram` : undefined}
          >
            {lead.profile_pic ? (
              <img
                src={lead.profile_pic}
                alt={lead.ig_username}
                className="w-8 h-8 rounded-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                  const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                  if (sibling) sibling.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[0.75rem] font-semibold"
              style={{
                background: "var(--accent-light)",
                color: "var(--accent)",
                display: lead.profile_pic ? "none" : "flex",
              }}
            >
              {lead.ig_username.charAt(0).toUpperCase()}
            </div>
          </a>

          <div className="min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <p
                className="text-[0.8125rem] font-semibold truncate"
                style={{ color: "var(--foreground)" }}
              >
                @{lead.ig_username}
              </p>
              {showIgLink && (
                <a
                  href={igUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex-shrink-0 opacity-40 hover:opacity-80 transition-opacity"
                  title="Open on Instagram"
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
              <p className="text-xs truncate" style={{ color: "var(--muted)" }}>
                {lead.full_name}
              </p>
            )}
          </div>
        </div>

        {/* Message count badge */}
        {(lead.event_count ?? 0) > 0 && (
          <span
            className="flex-shrink-0 text-[0.6875rem] font-medium px-1.5 py-0.5 rounded-md"
            style={{
              backgroundColor: "var(--accent-light)",
              color: "var(--accent)",
            }}
          >
            {lead.event_count}
          </span>
        )}
      </div>

      {/* Last message / notes preview */}
      {(lead.last_message || lead.notes) && (
        <p
          className="text-xs line-clamp-2 mb-2.5 leading-relaxed"
          style={{ color: "var(--foreground-secondary)" }}
        >
          {lead.last_message ?? lead.notes}
        </p>
      )}

      <div className="flex items-center justify-between">
        <StatusBadge status={lead.status} />
        <span className="text-[0.6875rem]" style={{ color: "var(--muted)" }}>
          {timeAgo}
        </span>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
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
