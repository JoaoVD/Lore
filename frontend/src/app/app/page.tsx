"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { apiFetch }     from "@/lib/apiFetch"
import { TrialBanner }  from "@/components/dashboard/TrialBanner"
import { DeadlineRow }  from "@/components/dashboard/DeadlineRow"
import { ProjectCard }  from "@/components/dashboard/ProjectCard"
import { TemplateCard } from "@/components/dashboard/TemplateCard"
import { ToastContainer, useToast } from "@/components/ui/Toast"
import Button  from "@/components/ui/Button"
import Input   from "@/components/ui/Input"
import type { DashboardProject, Project } from "@/types"

// ── New Project Modal ─────────────────────────────────────────────────────────

function NewProjectModal({
  open, defaultType = "juridico", onClose, onCreated, token,
}: {
  open: boolean
  defaultType?: "docs" | "estoq" | "juridico"
  onClose: () => void
  onCreated: (p: Project) => void
  token: string
}) {
  const [name,    setName]    = useState("")
  const [type,    setType]    = useState<"docs" | "estoq" | "juridico">(defaultType)
  const [loading, setLoading] = useState(false)
  const [errors,  setErrors]  = useState<{ name?: string }>({})
  const { toasts, toast, close } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) { setName(""); setType(defaultType); setErrors({}) }
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [open, defaultType])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    if (open) document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  const PRODUCTS = [
    { id: "juridico" as const, name: "Lore Jurídico", icon: "⚖️", bg: "#E1F5EE", color: "#0F6E56" },
    { id: "docs"     as const, name: "Lore Docs",     icon: "📄", bg: "#E6F1FB", color: "#378ADD" },
    { id: "estoq"    as const, name: "Lore Estoq",    icon: "📦", bg: "#EEEDFE", color: "#7F77DD" },
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setErrors({ name: "Informe o nome do projeto." }); return }
    setLoading(true)
    try {
      const project = await apiFetch<Project>("/projects", token, {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), type }),
      })
      onCreated(project)
      onClose()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erro ao criar projeto.", "error")
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,.4)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />
      <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
        <div style={{
          width: "100%", maxWidth: "420px", background: "#fff",
          borderRadius: "16px", boxShadow: "0 20px 60px rgba(0,0,0,.15)",
          border: "0.5px solid #d8d6d0",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 14px", borderBottom: "0.5px solid #e8e6e0" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#1a1a1a" }}>Novo projeto</h2>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "18px", lineHeight: 1 }}>×</button>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", color: "#3a3a3a", fontWeight: 500 }}>Produto</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {PRODUCTS.map(p => (
                  <button
                    key={p.id} type="button" onClick={() => setType(p.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "10px 12px", borderRadius: "10px", textAlign: "left",
                      border: type === p.id ? `1.5px solid ${p.color}` : "1.5px solid #e8e6e0",
                      background: type === p.id ? p.bg : "#fff",
                      cursor: "pointer", transition: "all .1s",
                    }}
                  >
                    <span style={{ fontSize: "16px" }}>{p.icon}</span>
                    <span style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}>{p.name}</span>
                    {type === p.id && <span style={{ marginLeft: "auto", fontSize: "12px", color: p.color }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
            <Input
              ref={inputRef}
              id="project-name"
              label="Nome do projeto"
              placeholder="Ex: Contratos 2024"
              value={name}
              onChange={e => { setName(e.target.value); if (errors.name) setErrors({}) }}
              error={errors.name}
              maxLength={120}
            />
            <div style={{ display: "flex", gap: "10px", paddingTop: "4px" }}>
              <Button type="button" variant="ghost" fullWidth onClick={onClose}>Cancelar</Button>
              <Button type="submit" loading={loading} fullWidth>Criar projeto</Button>
            </div>
          </form>
        </div>
      </div>
      <ToastContainer toasts={toasts} onClose={close} />
    </>
  )
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function SectionHead({ title, link, href }: { title: string; link?: string; href?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
      <span style={{
        fontSize: "11px", fontWeight: 500, color: "#888",
        textTransform: "uppercase", letterSpacing: ".08em",
      }}>
        {title}
      </span>
      {link && href && (
        <a href={href} style={{ fontSize: "12px", color: "#0F6E56", textDecoration: "none" }}>
          {link}
        </a>
      )}
    </div>
  )
}

function Divider() {
  return <div style={{ borderTop: "0.5px solid #d8d6d0", margin: "24px 0" }} />
}

function NewCard({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "1.5px dashed #d8d6d0", borderRadius: "10px", background: "transparent",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: "4px", minHeight: "90px",
        color: "#888", fontSize: "12px", cursor: "pointer",
        transition: "all .15s", width: "100%",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = "#0F6E56"; el.style.color = "#0F6E56"; el.style.background = "#f5fdf9"
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = "#d8d6d0"; el.style.color = "#888"; el.style.background = "transparent"
      }}
    >
      <span style={{ fontSize: "18px", fontWeight: 300 }}>+</span>
      <span>{label}</span>
    </button>
  )
}

const GRID3: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
  gap: "10px",
}

// ── Dashboard Page ────────────────────────────────────────────────────────────

interface DashboardData {
  projects: DashboardProject[]
  metrics: { total_projects: number; urgent_deadlines: number; active_today: number }
}

interface Deadline {
  id: string
  title: string
  deadline_date: string
  days_remaining: number
  project_name?: string
  category?: string
  projectId: string
}

interface DiamondTemplate {
  id: string
  name: string
  area: string
  subtype?: string
  is_diamond?: boolean
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Bom dia"
  if (h < 18) return "Boa tarde"
  return "Boa noite"
}

function getFormattedDate() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })
}

export default function Dashboard() {
  const router = useRouter()
  const supabase = createClient()
  const { toasts, toast, close } = useToast()

  const [token,     setToken]     = useState("")
  const [firstName, setFirstName] = useState("")
  const [projects,  setProjects]  = useState<DashboardProject[]>([])
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [templates, setTemplates] = useState<DiamondTemplate[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)

  const loadDashboard = useCallback(async (tok: string) => {
    const data = await apiFetch<DashboardData>("/projects/dashboard", tok)
    setProjects(data.projects)
    // Extrai prazos urgentes de todos os projetos jurídicos
    const dl: Deadline[] = (data.projects ?? [])
      .flatMap((p) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((p as any).urgent_deadlines_list ?? []).map((d: Deadline) => ({
          ...d,
          project_name: p.name,
          projectId: p.id,
        }))
      )
      .slice(0, 3)
    setDeadlines(dl)
  }, [])

  useEffect(() => {
    // Ouve o evento do TopBar "+" para abrir o modal
    const handler = () => setShowModal(true)
    window.addEventListener("open-new-project", handler)
    return () => window.removeEventListener("open-new-project", handler)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace("/login"); return }
      setToken(session.access_token)

      const meta = session.user.user_metadata
      const full = meta?.full_name || meta?.name || session.user.email?.split("@")[0] || "Usuário"
      setFirstName(full.split(" ")[0])

      // Dashboard + templates em paralelo
      await Promise.all([
        loadDashboard(session.access_token).catch(async () => {
          try {
            const data = await apiFetch<Project[]>("/projects", session.access_token)
            setProjects(data.map(p => ({ ...p, document_count: 0 })))
          } catch (err: unknown) {
            toast(err instanceof Error ? err.message : "Falha ao carregar projetos.", "error")
          }
        }),
        apiFetch<{ templates: DiamondTemplate[] }>("/legal/templates", session.access_token)
          .then(tmpl => setTemplates(tmpl.templates?.filter(t => t.is_diamond).slice(0, 3) ?? []))
          .catch(() => {}),
      ])

      setLoading(false)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleProjectCreated(project: Project) {
    const dp: DashboardProject = { ...project, document_count: 0 }
    setProjects(prev => [dp, ...prev])
    toast(`Projeto "${project.name}" criado!`, "success")
    setTimeout(() => {
      if (project.type === "juridico") router.push(`/project/${project.id}/legal`)
      else router.push(`/app`)
    }, 600)
  }

  const legalProjects = projects.filter(p => p.type === "juridico")

  const skeletonCard = (
    <div style={{
      background: "#fff", border: "0.5px solid #d8d6d0",
      borderRadius: "10px", height: "100px", opacity: 0.4,
      animation: "pulse 1.5s ease-in-out infinite",
    }} />
  )

  return (
    <>
      <style>{`@keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.2} }`}</style>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "36px 40px" }}>

        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{
            fontSize: "24px", fontWeight: 500, color: "#1a1a1a",
            fontFamily: "Georgia, serif", margin: 0, marginBottom: "3px",
          }}>
            {getGreeting()}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p style={{ fontSize: "12px", color: "#888", textTransform: "capitalize", margin: 0 }}>
            {getFormattedDate()}
          </p>
        </div>

        {/* Trial banner */}
        <TrialBanner product="juridico" />

        {/* Prazos urgentes */}
        {(loading || deadlines.length > 0) && (
          <>
            <div style={{ marginBottom: "24px" }}>
              <SectionHead title="Prazos urgentes" link="Ver todos" href="/app/prazos" />
              {loading
                ? [1, 2].map(i => <div key={i} style={{
                    background: "#fff", border: "0.5px solid #d8d6d0",
                    borderRadius: "10px", height: "56px", opacity: 0.4, marginBottom: "7px",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }} />)
                : deadlines.map(d => (
                    <DeadlineRow key={d.id} deadline={d} projectId={d.projectId} />
                  ))
              }
            </div>
            <Divider />
          </>
        )}

        {/* Projetos jurídicos */}
        <div style={{ marginBottom: "24px" }}>
          <SectionHead title="Projetos" link="Ver todos" href="/app/projetos" />
          <div style={GRID3}>
            {loading
              ? [1, 2].map(i => <div key={i}>{skeletonCard}</div>)
              : legalProjects.slice(0, 2).map(p => (
                  <ProjectCard key={p.id} project={p} type="juridico" />
                ))
            }
            <NewCard label="Novo projeto" onClick={() => setShowModal(true)} />
          </div>
        </div>

        {/* Templates Padrão Diamante */}
        {(loading || templates.length > 0) && (
          <>
            <Divider />
            <div style={{ marginBottom: "24px" }}>
              <SectionHead title="Templates" link="Ver biblioteca" href="/app/templates" />
              <div style={GRID3}>
                {loading
                  ? [1, 2, 3].map(i => <div key={i}>{skeletonCard}</div>)
                  : templates.map(t => <TemplateCard key={t.id} template={t} />)
                }
              </div>
            </div>
          </>
        )}

        {/* Empty state — sem projetos nem deadlines nem templates */}
        {!loading && projects.length === 0 && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: "16px", padding: "48px 0", textAlign: "center",
          }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "14px",
              background: "#E1F5EE", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "26px",
            }}>⚖️</div>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: 500, color: "#1a1a1a", margin: 0 }}>
                Nenhum projeto ainda
              </h2>
              <p style={{ fontSize: "13px", color: "#888", marginTop: "6px" }}>
                Crie seu primeiro projeto jurídico e comece a usar o Lore.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              style={{
                background: "#0F6E56", color: "#fff", border: "none",
                padding: "10px 20px", borderRadius: "8px", fontSize: "13px",
                fontWeight: 500, cursor: "pointer",
              }}
            >
              + Criar primeiro projeto
            </button>
          </div>
        )}
      </div>

      <NewProjectModal
        open={showModal}
        defaultType="juridico"
        onClose={() => setShowModal(false)}
        onCreated={handleProjectCreated}
        token={token}
      />
      <ToastContainer toasts={toasts} onClose={close} />
    </>
  )
}
