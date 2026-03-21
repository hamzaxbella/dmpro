import { db } from "@/lib/db";
import KanbanBoard from "@/components/KanbanBoard";
import type { Lead } from "@/components/LeadCard";

export const dynamic = "force-dynamic";

export default function BoardPage() {
  const leads = db
    .prepare("SELECT * FROM leads ORDER BY updated_at DESC")
    .all() as Lead[];

  return <KanbanBoard initialLeads={leads} />;
}
