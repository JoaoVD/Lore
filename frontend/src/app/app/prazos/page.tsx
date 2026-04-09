"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { apiFetch }     from "@/lib/apiFetch"
import { PageShell }    from "@/components/dashboard/PageShell"
import { EmptyState }   from "@/components/dashboard/EmptyState"
import { DeadlineRow }  from "@/components/dashboard/DeadlineRow"
import type { DashboardProject } from "@/types"

interface Deadline {
  id: string
  title: string
  deadline_date: string
  days_remaining: number
  status?: string
  category?: string
  project_name?: string
  projectId: string
}

type FilterKey = "todos" | "urgentes" | "proximos" | "futuros"

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "todos",    label: "Todos" },
  { key: "urgentes", label: "Urgentes" },
  { key: "proximos", label: "Próximos" },
  { key: "futuros",  label: "Futuros" },
]

export default function PrazosPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState<FilterKey>("todos")

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace("/login"); return }
      const token = session.access_token

      try {
        const dash = await apiFetch<{ projects: DashboardProject[] }>(
          "/projects/dashboard", token
        )
        const legalProjects = (dash.projects ?? []).filter(p => p.type === "juridico").slice(0, 8)

        const all: Deadline[] = []
        await Promise.allSettled(
          legalProjects.map(async p => {
            const data = await apiFetch<{ deadlines: Deadline[] }>(
              `/projects/${p.id}/legal/deadlines`, token
            )
            const today = new Date(); today.setHours(0, 0, 0, 0)
            all.push(...(data.deadlines ?? []).map(d => ({
              ...d,
              days_remaining: d.days_remaining ??
                Math.ceil((new Date(d.deadline_date).getTime() - today.getTime()) / 86400000),
              project_name: p.name,
              projectId:    p.id,
            })))
          })
        )
        all.sort((a, b) => a.days_remaining - b.days_remaining)
        setDeadlines(all)
      } catch { /* silencioso */ }
      finally { setLoading(false) }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const counts = {
    urgentes: deadlines.filter(d => d.days_remaining <= 3).length,
    proximos: deadlines.filter(d => d.days_remaining > 3 && d.days_remaining <= 14).length,
    futuros:  deadlines.filter(d => d.days_remaining > 14).length,
  }

  const total = (key: FilterKey) =>
    key === "todos" ? deadlines.length : counts[key as keyof typeof counts]

  const filtered = deadlines.filter(d => {
    if (filter === "urgentes") return d.days_remaining <= 3
    if (filter === "proximos") return d.days_remaining > 3 && d.days_remaining <= 14
    if (filter === "futuros")  return d.days_remaining > 14
    return true
  })

  return (
    <PageShell title="Prazos" subtitle="Prazos processuais de todos os projetos">
      {/* Filtros */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {FILTERS.map(btn => {
          const active = filter === btn.key
          const n = total(btn.key)
          return (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              style={{
                padding: "6px 14px", borderRadius: "7px", fontSize: "12px",
                fontWeight: active ? 500 : 400, cursor: "pointer",
                border: `0.5px solid ${active ? "#0F6E56" : "#d8d6d0"}`,
                background: active ? "#E1F5EE" : "#fff",
                color: active ? "#085041" : "#3a3a3a",
                display: "flex", alignItems: "center", gap: "6px",
              }}
            >
              {btn.label}
              {n > 0 && (
                <span style={{
                  background: active ? "#0F6E56" : "#e8e6e0",
                  color: active ? "#fff" : "#888",
                  borderRadius: "99px", padding: "1px 6px", fontSize: "10px",
                }}>{n}</span>
              )}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              background: "#fff", border: "0.5px solid #d8d6d0",
              borderRadius: "10px", height: "60px", opacity: 0.4,
            }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="⏰"
          title="Nenhum prazo encontrado"
          description="Os prazos são cadastrados dentro de cada projeto jurídico. Acesse um projeto para adicionar prazos processuais."
        />
      ) : (
        <div>
          {filtered.map(d => (
            <DeadlineRow key={d.id} deadline={d} projectId={d.projectId} />
          ))}
        </div>
      )}
    </PageShell>
  )
}
