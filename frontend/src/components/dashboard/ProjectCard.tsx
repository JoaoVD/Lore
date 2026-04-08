import Link from "next/link"

const typeConfig = {
  docs:     { bg: "#E1F5EE", href: (id: string) => `/dashboard/${id}` },
  estoq:    { bg: "#E6F1FB", href: (id: string) => `/dashboard/${id}` },
  juridico: { bg: "#EEEDFE", href: (id: string) => `/project/${id}/legal` },
}

const typeIcons = { docs: "📄", estoq: "📦", juridico: "⚖️" }

interface CardProject {
  id: string
  name: string
  type?: string
  document_count?: number
  question_count?: number
  api_connected?: boolean
  api_name?: string
  urgent_deadlines?: number
  template_count?: number
  deadline_count?: number
}

export function ProjectCard({ project, type }: { project: CardProject; type: "docs" | "estoq" | "juridico" }) {
  const cfg = typeConfig[type]

  const statusPill = () => {
    if (type === "juridico" && (project.urgent_deadlines ?? 0) > 0)
      return { label: `⚠️ ${project.urgent_deadlines} urgente${(project.urgent_deadlines ?? 0) > 1 ? "s" : ""}`, bg: "#FCEBEB", color: "#791F1F" }
    if (type === "estoq" && project.api_connected)
      return { label: "● API Online", bg: "#E6F1FB", color: "#0C447C" }
    return { label: "● Ativo", bg: "#E1F5EE", color: "#085041" }
  }

  const pill = statusPill()
  const icon = typeIcons[type]

  const meta = () => {
    if (type === "docs")     return [`📎 ${project.document_count ?? 0} docs`, `💬 ${project.question_count ?? 0} perguntas`]
    if (type === "estoq")    return [`🔗 ${project.api_name ?? "Sem API"}`, `💬 ${project.question_count ?? 0} consultas`]
    if (type === "juridico") return [`📋 ${project.template_count ?? 0} templates`, `⏰ ${project.deadline_count ?? 0} prazos`]
    return []
  }

  return (
    <Link href={cfg.href(project.id)} style={{ textDecoration: "none" }}>
      <div
        style={{
          background: "#fff", border: "0.5px solid #d8d6d0",
          borderRadius: "12px", padding: "14px 15px", cursor: "pointer",
          transition: "border-color .15s"
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#b0ada6"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#d8d6d0"}
      >
        {/* Top */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "9px" }}>
          <div style={{
            width: "30px", height: "30px", borderRadius: "8px",
            background: cfg.bg, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "14px", flexShrink: 0
          }}>{icon}</div>
          <span style={{
            fontSize: "10px", fontWeight: 500, padding: "2px 7px",
            borderRadius: "99px", background: pill.bg, color: pill.color,
            whiteSpace: "nowrap"
          }}>{pill.label}</span>
        </div>

        {/* Nome */}
        <div style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a", marginBottom: "9px" }}>
          {project.name}
        </div>

        {/* Meta */}
        <div style={{
          display: "flex", gap: "10px", fontSize: "11px", color: "#888",
          borderTop: "0.5px solid #eeecea", paddingTop: "8px",
          flexWrap: "wrap"
        }}>
          {meta().map((m, i) => <span key={i}>{m}</span>)}
        </div>
      </div>
    </Link>
  )
}
