"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import LeadCard, { type Lead } from "./LeadCard";
import { STATUS_CONFIG } from "./StatusBadge";

const COLUMNS = ["contacted", "replied", "interested", "closed", "lost"] as const;

const COLUMN_COLORS: Record<string, string> = {
  contacted: "#f59e0b",
  replied: "#3b82f6",
  interested: "#8b5cf6",
  closed: "#10b981",
  lost: "#ef4444",
};

interface KanbanBoardProps {
  initialLeads: Lead[];
}

function SortableLeadCard({
  lead,
  onIgnore,
  onDelete,
}: {
  lead: Lead;
  onIgnore: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id, data: { lead } });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      <LeadCard lead={lead} isDragging={isDragging} onIgnore={onIgnore} onDelete={onDelete} />
    </div>
  );
}

function KanbanColumn({
  status,
  leads,
  onIgnore,
  onDelete,
}: {
  status: string;
  leads: Lead[];
  onIgnore: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const color = COLUMN_COLORS[status] ?? "#f47458";
  const config = STATUS_CONFIG[status];

  return (
      <div className="flex flex-col min-w-[210px] flex-1" style={{ minHeight: 0 }}>
      {/* Column header — sticky within column */}
      <div className="flex items-center justify-between mb-3 px-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <h3 className="text-[0.75rem] font-bold uppercase tracking-[0.04em]" style={{ color: "var(--foreground-secondary)" }}>
            {config?.label ?? status}
          </h3>
        </div>
        <span
          className="text-[0.6875rem] font-medium px-2 py-0.5 rounded-md"
          style={{ backgroundColor: "rgba(0,0,0,0.04)", color: "var(--muted)" }}
        >
          {leads.length}
        </span>
      </div>

      {/* Droppable zone — scrolls independently */}
      <div
        ref={setNodeRef}
        className={`kanban-column flex flex-col gap-3 rounded-lg ${isOver ? "drag-over" : ""}`}
        style={{
          backgroundColor: isOver ? "var(--accent-light)" : "transparent",
          border: `1.5px dashed ${isOver ? "var(--accent)" : "transparent"}`,
          transition: "all 0.2s ease",
          minHeight: 200,
          maxHeight: "calc(100vh - 220px)",
          overflowY: "auto",
          paddingBottom: "24px",
        }}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <SortableLeadCard key={lead.id} lead={lead} onIgnore={onIgnore} onDelete={onDelete} />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div
            className="flex items-center justify-center h-16 rounded-lg text-xs"
            style={{ color: "var(--muted)", border: "1.5px dashed var(--border)", background: "rgba(0,0,0,0.01)" }}
          >
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({ initialLeads }: KanbanBoardProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIgUsername, setNewIgUsername] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [search, setSearch] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [ignoredCount, setIgnoredCount] = useState(0);

  const isDraggingRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Refresh helper — used by both immediate fetch and polling
  const refresh = useCallback(async () => {
    if (isDraggingRef.current) return;
    try {
      const [leadsRes, ignoredRes] = await Promise.all([
        fetch("/api/leads"),
        fetch("/api/leads?ignored=1"),
      ]);
      if (leadsRes.ok) setLeads(await leadsRes.json());
      if (ignoredRes.ok) {
        const ignored: Lead[] = await ignoredRes.json();
        setIgnoredCount(ignored.length);
      }
    } catch {
      // silently ignore network errors
    }
  }, []);

  // Fetch immediately on mount so ignored leads never flash on screen
  useEffect(() => { refresh(); }, [refresh]);

  // Then poll every 4 s for real-time updates
  useEffect(() => {
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [refresh]);

  const activeLead = leads.find((l) => l.id === activeId);

  // Filter by search query
  const query = search.trim().toLowerCase();
  const filteredLeads = query
    ? leads.filter(
        (l) =>
          l.ig_username.toLowerCase().includes(query) ||
          l.full_name?.toLowerCase().includes(query)
      )
    : leads;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    isDraggingRef.current = true;
    setActiveId(event.active.id as number);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      isDraggingRef.current = false;
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const leadId = active.id as number;
      const newStatus = over.id as string;

      if (!COLUMNS.includes(newStatus as typeof COLUMNS[number])) return;

      const lead = leads.find((l) => l.id === leadId);
      if (!lead || lead.status === newStatus) return;

      // Optimistic update
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));

      try {
        const res = await fetch(`/api/leads/${leadId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
          setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: lead.status } : l)));
        }
      } catch {
        setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: lead.status } : l)));
      }
    },
    [leads]
  );

  const handleAddLead = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!newIgUsername.trim()) return;
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ig_username: newIgUsername.trim().replace(/^@/, ""),
          full_name: newFullName.trim() || undefined,
        }),
      });
      if (res.ok) {
        const lead = await res.json();
        setLeads((prev) => [lead, ...prev]);
        setNewIgUsername("");
        setNewFullName("");
        setShowAddForm(false);
      }
    } catch (err) {
      console.error("Failed to add lead:", err);
    }
  };

  const handleClearDB = async () => {
    setClearing(true);
    try {
      await fetch("/api/admin/clear", { method: "POST" });
      setLeads([]);
      setShowClearConfirm(false);
    } catch (err) {
      console.error("Failed to clear DB:", err);
    } finally {
      setClearing(false);
    }
  };

  const handleIgnore = useCallback(async (id: number) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setIgnoredCount((c) => c + 1);
    await fetch(`/api/leads/${id}/ignore`, { method: "POST" });
  }, []);

  const handleDeleteLead = useCallback(async (id: number) => {
    if (!confirm("Permanently delete this lead and all its data?")) return;
    setLeads((prev) => prev.filter((l) => l.id !== id));
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="mr-auto">
          <h1 className="text-[1.5rem] font-bold tracking-[-0.02em]" style={{ color: "var(--foreground)" }}>
            Pipeline
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[0.8125rem]" style={{ color: "var(--muted)" }}>
              {leads.length} lead{leads.length !== 1 ? "s" : ""}
              {query ? ` · ${filteredLeads.length} match` : ""}
            </p>
            {ignoredCount > 0 && (
              <Link
                href="/ignored"
                className="text-[0.75rem] font-medium px-2 py-0.5 rounded-md transition-colors"
                style={{
                  background: "rgba(0,0,0,0.04)",
                  color: "var(--muted)",
                }}
              >
                {ignoredCount} ignored
              </Link>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ color: "var(--muted)" }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads…"
            className="input w-44 text-[0.8125rem]"
            style={{ paddingLeft: "34px", paddingTop: "7px", paddingBottom: "7px" }}
          />
        </div>

        <button
          onClick={() => setShowClearConfirm(true)}
          className="btn-ghost text-[0.8125rem]"
          style={{ color: "var(--status-lost)" }}
          title="Wipe all leads from the database"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
          </svg>
          Clear DB
        </button>

        <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Lead
        </button>
      </div>

      {/* Add Lead Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddLead}
          className="card p-4 mb-5 flex flex-wrap gap-3 items-end animate-slide-in"
        >
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--foreground-secondary)" }}>
              Instagram Username
            </label>
            <input
              type="text"
              value={newIgUsername}
              onChange={(e) => setNewIgUsername(e.target.value)}
              placeholder="@username"
              className="input"
              required
              autoFocus
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--foreground-secondary)" }}>
              Full Name
            </label>
            <input
              type="text"
              value={newFullName}
              onChange={(e) => setNewFullName(e.target.value)}
              placeholder="Optional"
              className="input"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Add</button>
            <button type="button" onClick={() => setShowAddForm(false)} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}

      {/* Kanban Columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
          {COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              leads={filteredLeads.filter((l) => l.status === status)}
              onIgnore={handleIgnore}
              onDelete={handleDeleteLead}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead ? <LeadCard lead={activeLead} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {/* Clear DB Confirmation Modal */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="card-elevated p-6 max-w-sm w-full mx-4 animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
              style={{ background: "#fef2f2" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h2 className="text-[1rem] font-bold mb-1" style={{ color: "var(--foreground)" }}>
              Clear all data?
            </h2>
            <p className="text-sm mb-5" style={{ color: "var(--foreground-secondary)" }}>
              This will permanently delete all leads, messages, and reminders. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="btn-ghost"
                disabled={clearing}
              >
                Cancel
              </button>
              <button
                onClick={handleClearDB}
                disabled={clearing}
                className="btn-primary"
                style={{ background: "#ef4444" }}
              >
                {clearing ? "Clearing…" : "Yes, clear everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
