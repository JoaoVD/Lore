"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { apiFetch }     from "@/lib/apiFetch"
import { PageShell }    from "@/components/dashboard/PageShell"
import { EmptyState }   from "@/components/dashboard/EmptyState"
import { ProjectCard }  from "@/components/dashboard/ProjectCard"
import type { DashboardProject } from "@/types"

const GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
  gap: "10px",
}

export default function ProjetosPage() {
  const router  = useRouter()
  const supabase = createClient()

  const [_token,   setToken]    = useState("")
  const [projects, setProjects] = useState<DashboardProject[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace("/login"); return }
      setToken(session.access_token)
      try {
        const data = await apiFetch<{ projects: DashboardProject[] }>(
          "/projects/dashboard", session.access_token
        )
        setProjects(data.projects ?? [])
      } catch {
        // fallback: lista simples
        try {
          const data = await apiFetch<DashboardProject[]>("/projects", session.access_token)
          setProjects(data.map(p => ({ ...p, document_count: 0 })))
        } catch { /* silencioso */ }
      } finally {
        setLoading(false)
      }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function openNewProject() {
    window.dispatchEvent(new CustomEvent("open-new-project"))
  }

  const count = projects.length
  const subtitle = loading
    ? "Carregando..."
    : `${count} projeto${count !== 1 ? "s" : ""} cadastrado${count !== 1 ? "s" : ""}`

  return (
    <PageShell
      title="Projetos"
      subtitle={subtitle}
      action={
        <button
          onClick={openNewProject}
          style={{
            background: "#0F6E56", color: "#fff", border: "none",
            padding: "8px 16px", borderRadius: "7px", fontSize: "13px",
            fontWeight: 500, cursor: "pointer",
          }}
        >
          + Novo projeto
        </button>
      }
    >
      {loading ? (
        <div style={GRID}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              background: "#fff", border: "0.5px solid #d8d6d0",
              borderRadius: "10px", height: "100px", opacity: 0.4,
            }} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon="⚖️"
          title="Nenhum projeto ainda"
          description="Crie um projeto para cada cliente ou área e organize documentos, prazos e templates."
          action={
            <button
              onClick={openNewProject}
              style={{
                background: "#0F6E56", color: "#fff", border: "none",
                padding: "8px 16px", borderRadius: "7px", fontSize: "13px",
                fontWeight: 500, cursor: "pointer",
              }}
            >
              Criar primeiro projeto
            </button>
          }
        />
      ) : (
        <div style={GRID}>
          {projects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              type={(p.type as "docs" | "estoq" | "juridico") ?? "docs"}
            />
          ))}
        </div>
      )}
    </PageShell>
  )
}
