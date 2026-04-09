import Link from "next/link"

interface Deadline {
  id: string
  title: string
  deadline_date: string
  days_remaining: number
  project_name?: string
  category?: string
}

interface Props {
  deadline: Deadline
  projectId: string
}

export function DeadlineRow({ deadline, projectId }: Props) {
  const d = deadline.days_remaining

  const urgency =
    d <= 0
      ? { dot: "#E24B4A", bg: "#FCEBEB", color: "#791F1F", label: "Hoje" }
      : d <= 2
      ? { dot: "#BA7517", bg: "#FEF3C7", color: "#92400E", label: `${d} dia${d > 1 ? "s" : ""}` }
      : { dot: "#0F6E56", bg: "#E1F5EE", color: "#085041", label: `${d} dias` }

  return (
    <Link href={`/project/${projectId}/legal?tab=prazos`} style={{ textDecoration: "none" }}>
      <div
        style={{
          background: "#fff",
          border: "0.5px solid #d8d6d0",
          borderRadius: "10px",
          padding: "13px 16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "7px",
          cursor: "pointer",
          transition: "border-color .15s",
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = "#b0ada6")}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = "#d8d6d0")}
      >
        <div style={{
          width: "7px", height: "7px", borderRadius: "50%",
          background: urgency.dot, flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: "13px", fontWeight: 500, color: "#1a1a1a",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            marginBottom: "2px",
          }}>
            {deadline.title}
          </div>
          <div style={{ fontSize: "11px", color: "#888" }}>
            {deadline.project_name}
            {deadline.category && ` · ${deadline.category}`}
          </div>
        </div>
        <div style={{
          fontSize: "10px", fontWeight: 500,
          padding: "3px 9px", borderRadius: "99px",
          background: urgency.bg, color: urgency.color,
          whiteSpace: "nowrap", flexShrink: 0,
        }}>
          {urgency.label}
        </div>
      </div>
    </Link>
  )
}
