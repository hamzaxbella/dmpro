const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  contacted:  { color: "#b47d10", bg: "var(--status-contacted-bg)", label: "Contacted" },
  replied:    { color: "#2563eb", bg: "var(--status-replied-bg)",   label: "Replied" },
  interested: { color: "#7c3aed", bg: "var(--status-interested-bg)", label: "Interested" },
  closed:     { color: "#059669", bg: "var(--status-closed-bg)",    label: "Closed" },
  lost:       { color: "#dc2626", bg: "var(--status-lost-bg)",      label: "Lost" },
};

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.contacted;
  const fontSize = size === "md" ? "0.75rem" : "0.6875rem";
  const padding = size === "md" ? "4px 12px" : "3px 10px";

  return (
    <span
      className="status-badge"
      style={{
        color: config.color,
        backgroundColor: config.bg,
        fontSize,
        padding,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          backgroundColor: config.color,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      {config.label}
    </span>
  );
}

export { STATUS_CONFIG };
