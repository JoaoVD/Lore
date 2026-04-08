"use client"
import Link from "next/link"
import { ProjectCard } from "./ProjectCard"

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

interface Props {
  icon: string
  title: string
  projects: CardProject[]
  onNew?: () => void
  type: "docs" | "estoq" | "juridico"
  loading: boolean
  newHref: string
  newLabel: string
}

export function DashboardSection({ icon, title, projects, type, loading, newHref, newLabel, onNew }: Props) {
  return (
    <div style={{ marginBottom: "28px" }}>
      {/* Header da seção */}
      <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "10px" }}>
        <span style={{ fontSize: "13px" }}>{icon}</span>
        <span style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}>{title}</span>
        <span style={{
          fontSize: "11px", color: "#888", background: "#e8e6e0",
          padding: "1px 7px", borderRadius: "99px"
        }}>{projects.length}</span>
        {projects.length > 5 && (
          <Link href={`/app/${type}`} style={{ marginLeft: "auto", fontSize: "12px", color: "#0F6E56", textDecoration: "none" }}>
            Ver todos →
          </Link>
        )}
      </div>

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "9px"
      }}>
        {loading
          ? [1, 2].map(i => <SkeletonCard key={i} />)
          : projects.slice(0, 5).map(p => <ProjectCard key={p.id} project={p} type={type} />)
        }
        {/* Card novo */}
        <NewCard label={newLabel} href={newHref} onNew={onNew} />
      </div>
    </div>
  )
}

const newCardStyle: React.CSSProperties = {
  border: "1.5px dashed #d8d6d0", borderRadius: "12px",
  display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center",
  gap: "4px", minHeight: "96px", color: "#888",
  fontSize: "12px", cursor: "pointer", transition: "all .15s",
  background: "transparent", width: "100%",
}

function NewCard({ label, href, onNew }: { label: string; href: string; onNew?: () => void }) {
  const handlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      const el = e.currentTarget as HTMLElement
      el.style.borderColor = "#0F6E56"
      el.style.color = "#0F6E56"
      el.style.background = "#f5fdf9"
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      const el = e.currentTarget as HTMLElement
      el.style.borderColor = "#d8d6d0"
      el.style.color = "#888"
      el.style.background = "transparent"
    },
  }

  const inner = (
    <>
      <span style={{ fontSize: "18px", fontWeight: 300 }}>+</span>
      <span>{label}</span>
    </>
  )

  if (onNew) {
    return (
      <button onClick={onNew} style={{ ...newCardStyle, border: "1.5px dashed #d8d6d0" }} {...handlers}>
        {inner}
      </button>
    )
  }

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div style={newCardStyle} {...handlers}>{inner}</div>
    </Link>
  )
}

function SkeletonCard() {
  return (
    <div style={{
      background: "#fff", border: "0.5px solid #d8d6d0",
      borderRadius: "12px", padding: "14px 15px", minHeight: "96px",
      opacity: 0.5
    }}>
      <div style={{ width: "30px", height: "30px", background: "#e8e6e0", borderRadius: "8px", marginBottom: "9px" }} />
      <div style={{ width: "70%", height: "12px", background: "#e8e6e0", borderRadius: "4px" }} />
    </div>
  )
}
