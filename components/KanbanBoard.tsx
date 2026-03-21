"use client";

import { useState, useCallback } from "react";
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

function SortableLeadCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id, data: { lead } });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
    >
      <LeadCard lead={lead} isDragging={isDragging} />
    </div>
  );
}

function KanbanColumn({
  status,
  leads,
}: {
  status: string;
  leads: Lead[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const color = COLUMN_COLORS[status] ?? "#f47458";
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex flex-col min-w-[260px] max-w-[300px] flex-1">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          <h3 className="text-[0.8125rem] font-semibold" style={{ color: "var(--foreground)" }}>
            {config?.label ?? status}
          </h3>
        </div>
        <span
          className="text-[0.6875rem] font-medium px-2 py-0.5 rounded-md"
          style={{
            backgroundColor: "rgba(0,0,0,0.04)",
            color: "var(--muted)",
          }}
        >
          {leads.length}
        </span>
      </div>

      {/* Droppable zone */}
      <div
        ref={setNodeRef}
        className={`kanban-column flex flex-col gap-2 p-2 rounded-xl ${isOver ? "drag-over" : ""}`}
        style={{
          backgroundColor: isOver ? "var(--accent-light)" : "rgba(0,0,0,0.015)",
          border: `1.5px dashed ${isOver ? "var(--accent)" : "transparent"}`,
          transition: "all 0.2s ease",
          minHeight: 320,
        }}
      >
        <SortableContext
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {leads.map((lead) => (
            <SortableLeadCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div
            className="flex items-center justify-center h-20 rounded-lg text-xs"
            style={{
              color: "var(--muted)",
              border: "1.5px dashed var(--border)",
              background: "rgba(0,0,0,0.01)",
            }}
          >
            Drop leads here
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const activeLead = leads.find((l) => l.id === activeId);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const leadId = active.id as number;
      const newStatus = over.id as string;

      if (!COLUMNS.includes(newStatus as typeof COLUMNS[number])) return;

      const lead = leads.find((l) => l.id === leadId);
      if (!lead || lead.status === newStatus) return;

      // Optimistic update
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
      );

      try {
        const res = await fetch(`/api/leads/${leadId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
          setLeads((prev) =>
            prev.map((l) =>
              l.id === leadId ? { ...l, status: lead.status } : l
            )
          );
        }
      } catch {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId ? { ...l, status: lead.status } : l
          )
        );
      }
    },
    [leads]
  );

  const handleAddLead = async (e: React.FormEvent) => {
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

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[1.5rem] font-bold tracking-[-0.02em]" style={{ color: "var(--foreground)" }}>
            Pipeline
          </h1>
          <p className="text-[0.8125rem] mt-0.5" style={{ color: "var(--muted)" }}>
            {leads.length} lead{leads.length !== 1 ? "s" : ""} in pipeline
          </p>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Lead
        </button>
      </div>

      {/* Add Lead Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddLead}
          className="card p-5 mb-6 flex flex-wrap gap-4 items-end animate-slide-in"
        >
          <div className="flex-1 min-w-[200px]">
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
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--foreground-secondary)" }}>
              Full Name
            </label>
            <input
              type="text"
              value={newFullName}
              onChange={(e) => setNewFullName(e.target.value)}
              placeholder="John Doe"
              className="input"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Add</button>
            <button type="button" onClick={() => setShowAddForm(false)} className="btn-ghost">
              Cancel
            </button>
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
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              leads={leads.filter((l) => l.status === status)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead ? <LeadCard lead={activeLead} isDragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
