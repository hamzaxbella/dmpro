"use client";

/**
 * Thin client wrapper that loads KanbanBoard only on the client.
 * Required because @dnd-kit generates aria IDs that differ between
 * server and client renders, causing hydration mismatches.
 */
import dynamic from "next/dynamic";
import type { Lead } from "./LeadCard";

const KanbanBoard = dynamic(() => import("./KanbanBoard"), { ssr: false });

export default function KanbanBoardNoSSR({ initialLeads }: { initialLeads: Lead[] }) {
  return <KanbanBoard initialLeads={initialLeads} />;
}
