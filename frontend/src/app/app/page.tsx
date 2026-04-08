"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Features } from "@/lib/features"
import { TrialBanner } from "@/components/dashboard/TrialBanner"
import { DashboardSection } from "@/components/dashboard/DashboardSection"
import Button from "@/components/ui/Button"
import Input from "@/components/ui/Input"
import { ToastContainer, useToast } from "@/components/ui/Toast"
import type { DashboardProject, Project } from "@/types"

// ── API helper ────────────────────────────────────────────────────────────────

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000") + "/api"

async function apiFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const detail = body.detail
    if (res.status === 402 && typeof detail === "object" && detail !== null) {
      window.dispatchEvent(new CustomEvent("upgrade-required", { detail }))
    }
    throw new Error(
      typeof detail === "object" && detail?.message ? detail.message : (detail ?? `Erro ${res.status}`)
    )
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

// ── New Project Modal ─────────────────────────────────────────────────────────

function NewProjectModal({
  open,
  onClose,
  onCreated,
  token,
}: {
  open: boolean
  onClose: () => void
  onCreated: (project: Project) => void
  token: string
}) {
  const [name, setName] = useState("")
  const [type, setType] = useState<"docs" | "estoq" | "juridico">("docs")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ name?: string }>({})
  const { toasts, toast, close } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName(""); setType("docs"); setErrors({})
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    if (open) document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  const PRODUCTS = [
    { id: "docs" as const, name: "Lore Docs", icon: "📄", bg: "#E1F5EE", color: "#0F6E56" },
    { id: "estoq" as const, name: "Lore Estoq", icon: "📦", bg: "#E6F1FB", color: "#378ADD" },
    { id: "juridico" as const, name: "Lore Jurídico", icon: "⚖️", bg: "#EEEDFE", color: "#7F77DD" },
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
      <div style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,.4)", backdropFilter: "blur(2px)" }} onClick={onClose} />
      <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
        <div style={{
          width: "100%", maxWidth: "420px", background: "#fff",
          borderRadius: "16px", boxShadow: "0 20px 60px rgba(0,0,0,.15)",
          border: "0.5px solid #d8d6d0"
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
                      cursor: "pointer", transition: "all .1s"
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
              onChange={(e) => { setName(e.target.value); if (errors.name) setErrors({}) }}
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

// ── Dashboard Page ────────────────────────────────────────────────────────────

interface DashboardData {
  projects: DashboardProject[]
  metrics: { total_projects: number; urgent_deadlines: number; active_today: number }
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

  const [token, setToken] = useState("")
  const [firstName, setFirstName] = useState("")
  const [projects, setProjects] = useState<DashboardProject[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)

  const loadDashboard = useCallback(async (accessToken: string) => {
    const data = await apiFetch<DashboardData>("/projects/dashboard", accessToken)
    setProjects(data.projects)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace("/login"); return }

      setToken(session.access_token)
      const fullName =
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        session.user.email?.split("@")[0] ||
        "Usuário"
      setFirstName(fullName.split(" ")[0])

      try {
        await loadDashboard(session.access_token)
      } catch {
        try {
          const data = await apiFetch<Project[]>("/projects", session.access_token)
          setProjects(data.map(p => ({ ...p, document_count: 0 })))
        } catch (err: unknown) {
          toast(err instanceof Error ? err.message : "Falha ao carregar projetos.", "error")
        }
      } finally {
        setLoading(false)
      }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleProjectCreated(project: Project) {
    const dp: DashboardProject = { ...project, document_count: 0 }
    setProjects(prev => [dp, ...prev])
    toast(`Projeto "${project.name}" criado!`, "success")
    setTimeout(() => {
      if (project.type === "juridico") {
        router.push(`/project/${project.id}/legal`)
      } else {
        router.push(`/dashboard/${slugify(project.name)}--${project.id}`)
      }
    }, 600)
  }

  const docProjects    = projects.filter(p => !p.type || p.type === "docs")
  const estoqProjects  = projects.filter(p => p.type === "estoq")
  const legalProjects  = projects.filter(p => p.type === "juridico")

  return (
    <>
      <div style={{ padding: "28px 32px", maxWidth: "900px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "22px" }}>
          <div>
            <h1 style={{ fontSize: "19px", fontWeight: 500, color: "#1a1a1a", margin: 0 }}>
              {getGreeting()}{firstName ? `, ${firstName}` : ""} 👋
            </h1>
            <p style={{ fontSize: "12px", color: "#888", marginTop: "3px", textTransform: "capitalize" }}>
              {getFormattedDate()}
            </p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            style={{
              background: "#0F6E56", color: "#fff", border: "none",
              padding: "8px 16px", borderRadius: "8px", fontSize: "13px",
              fontWeight: 500, cursor: "pointer"
            }}
          >
            + Novo projeto
          </button>
        </div>

        {/* Trial banner */}
        <TrialBanner product="docs" />

        {/* Seção Lore Docs */}
        <DashboardSection
          icon="📄"
          title="Lore Docs"
          projects={docProjects}
          type="docs"
          loading={loading}
          newHref="#"
          newLabel="Novo projeto Docs"
        />

        {/* Seção Lore Estoq */}
        {Features.ESTOQ && (
          <DashboardSection
            icon="📦"
            title="Lore Estoq"
            projects={estoqProjects}
            type="estoq"
            loading={loading}
            newHref="#"
            newLabel="Nova integração"
          />
        )}

        {/* Seção Lore Jurídico */}
        {Features.JURIDICO && (
          <DashboardSection
            icon="⚖️"
            title="Lore Jurídico"
            projects={legalProjects}
            type="juridico"
            loading={loading}
            newHref="#"
            newLabel="Novo projeto Jurídico"
          />
        )}

        {/* Empty state */}
        {!loading && projects.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", padding: "64px 0", textAlign: "center" }}>
            <div style={{ width: "60px", height: "60px", borderRadius: "16px", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>
              📄
            </div>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: 500, color: "#1a1a1a", margin: 0 }}>Nenhum projeto ainda</h2>
              <p style={{ fontSize: "13px", color: "#888", marginTop: "6px" }}>
                Crie seu primeiro projeto e comece a consultar seus documentos.
              </p>
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              style={{
                background: "#0F6E56", color: "#fff", border: "none",
                padding: "10px 20px", borderRadius: "8px", fontSize: "13px",
                fontWeight: 500, cursor: "pointer"
              }}
            >
              + Criar primeiro projeto
            </button>
          </div>
        )}
      </div>

      <NewProjectModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={handleProjectCreated}
        token={token}
      />

      <ToastContainer toasts={toasts} onClose={close} />
    </>
  )
}
