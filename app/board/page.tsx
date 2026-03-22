import { db } from "@/lib/db";
import KanbanBoardNoSSR from "@/components/KanbanBoardNoSSR";
import type { Lead } from "@/components/LeadCard";

export const dynamic = "force-dynamic";

export default function BoardPage() {
  const leads = db
    .prepare(`
      SELECT l.*,
        (SELECT COUNT(*) FROM events WHERE lead_id = l.id) as event_count,
        (SELECT body FROM events WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM leads l
      WHERE l.ignored = 0
      ORDER BY l.updated_at DESC
    `)
    .all() as Lead[];

  return (
    <div style={{ height: "calc(100vh - 56px - 4rem)" }} className="flex flex-col">
      <KanbanBoardNoSSR initialLeads={leads} />
    </div>
  );
}
