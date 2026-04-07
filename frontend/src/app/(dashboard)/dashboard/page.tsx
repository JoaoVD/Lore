'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import LoreLogo from '@/components/LoreLogo'
import ReviewModal, { reviewStorageKey } from '@/components/ui/ReviewModal'
import { Features } from '@/lib/features'
import { DashboardSection } from '@/components/dashboard/DashboardSection'
import { MetricCard, DocsProjectCard, EstoqProjectCard, LegalProjectCard } from '@/components/dashboard/ProjectCards'
import type { DashboardProject, Project } from '@/types'

// ── API helper ────────────────────────────────────────────────────────────────

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000') + '/api'

async function apiFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const detail = body.detail
    if (res.status === 402 && typeof detail === 'object' && detail !== null) {
      window.dispatchEvent(new CustomEvent('upgrade-required', { detail }))
    }
    throw new Error(
      typeof detail === 'object' && detail?.message ? detail.message : (detail ?? `Erro ${res.status}`)
    )
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function getInitials(name?: string) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getFormattedDate() {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ── New Project Modal ─────────────────────────────────────────────────────────

function NewProjectModal({
  open,
  defaultType,
  onClose,
  onCreated,
  token,
}: {
  open: boolean
  defaultType?: 'docs' | 'estoq' | 'juridico'
  onClose: () => void
  onCreated: (project: Project) => void
  token: string
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'docs' | 'estoq' | 'juridico'>(defaultType ?? 'docs')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ name?: string }>({})
  const { toasts, toast, close } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setDescription('')
      setType(defaultType ?? 'docs')
      setErrors({})
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, defaultType])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const PRODUCTS = [
    {
      id: 'docs' as const,
      name: 'Lore Docs',
      icon: '📄',
      description: 'Documentos internos consultáveis via chat',
      color: '#0F6E56',
      bgColor: '#E1F5EE',
    },
    {
      id: 'estoq' as const,
      name: 'Lore Estoq',
      icon: '📦',
      description: 'Estoque e preços em linguagem natural',
      color: '#1E3A5F',
      bgColor: '#E8EFF7',
    },
    {
      id: 'juridico' as const,
      name: 'Lore Jurídico',
      icon: '⚖️',
      description: 'Templates jurídicos, prazos e documentos',
      color: '#5B21B6',
      bgColor: '#EDE9FE',
    },
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const e2: typeof errors = {}
    if (!name.trim()) e2.name = 'Informe o nome do projeto.'
    if (Object.keys(e2).length) { setErrors(e2); return }

    setLoading(true)
    try {
      const project = await apiFetch<Project>('/projects', token, {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, type }),
      })
      onCreated(project)
      onClose()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Erro ao criar projeto.', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal aria-label="Novo projeto" className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-[460px] bg-surface rounded-2xl shadow-2xl border border-stone/50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stone/30">
            <div>
              <h2 className="text-lg font-bold text-ink">Novo projeto</h2>
              <p className="text-sm text-muted mt-0.5">Escolha o produto e configure o projeto</p>
            </div>
            <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg text-stone hover:text-ink hover:bg-parchment transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            {/* Product selector — always shows all 3 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-ink/70">Produto</label>
              <div className="flex flex-col gap-2">
                {PRODUCTS.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setType(product.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      type === product.id
                        ? 'shadow-sm'
                        : 'border-stone/30 hover:border-stone/50 bg-white'
                    }`}
                    style={type === product.id ? {
                      borderColor: product.color,
                      backgroundColor: product.bgColor,
                    } : {}}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: product.bgColor }}
                    >
                      {product.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink">{product.name}</p>
                      <p className="text-xs text-ink/50">{product.description}</p>
                    </div>
                    {type === product.id && (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs shrink-0"
                        style={{ backgroundColor: product.color }}
                      >
                        ✓
                      </div>
                    )}
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

            <div className="flex flex-col gap-1.5">
              <label htmlFor="project-desc" className="text-sm font-medium text-ink/70">
                Descrição <span className="text-muted font-normal">(opcional)</span>
              </label>
              <textarea
                id="project-desc"
                placeholder="Breve descrição do que será armazenado..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full rounded-xl border border-stone hover:border-brand/50 bg-surface px-4 py-3 text-sm text-ink placeholder:text-stone resize-none focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all duration-150"
              />
            </div>

            <div className="flex gap-3 pt-1">
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

// ── Delete Modal ───────────────────────────────────────────────────────────────

function DeleteModal({
  projectName, loading, onConfirm, onClose,
}: {
  projectName: string; loading: boolean; onConfirm: () => void; onClose: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-[380px] bg-surface rounded-2xl shadow-2xl border border-stone/50 p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="h-11 w-11 rounded-xl bg-red-50 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </div>
            <h3 className="font-bold text-ink text-base">Excluir projeto?</h3>
            <p className="text-sm text-muted leading-relaxed">
              O projeto <span className="font-semibold text-ink">&quot;{projectName}&quot;</span> e todos os seus documentos serão excluídos permanentemente.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={onClose} disabled={loading}>Cancelar</Button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? <><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Excluindo...</> : 'Sim, excluir'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

export function ProjectGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-stone/30 h-36 animate-pulse" />
      ))}
    </div>
  )
}

// ── Dashboard Page ────────────────────────────────────────────────────────────

interface DashboardData {
  projects: DashboardProject[]
  metrics: { total_projects: number; urgent_deadlines: number; active_today: number }
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toasts, toast, close } = useToast()

  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [token, setToken] = useState('')
  const [projects, setProjects] = useState<DashboardProject[]>([])
  const [metrics, setMetrics] = useState({ total_projects: 0, urgent_deadlines: 0, active_today: 0 })
  const [loading, setLoading] = useState(true)

  const [newModalType, setNewModalType] = useState<'docs' | 'estoq' | 'juridico'>('docs')
  const [showNewModal, setShowNewModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DashboardProject | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewUserId, setReviewUserId] = useState('')

  const loadDashboard = useCallback(async (accessToken: string) => {
    const data = await apiFetch<DashboardData>('/projects/dashboard', accessToken)
    setProjects(data.projects)
    setMetrics(data.metrics)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      setToken(session.access_token)
      setUserEmail(session.user.email ?? '')
      setUserName(
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        session.user.email?.split('@')[0] ||
        'Usuário'
      )

      const uid = session.user.id
      const daysSince = (Date.now() - new Date(session.user.created_at).getTime()) / 86400000
      if (daysSince >= 14 && !localStorage.getItem(reviewStorageKey(uid))) {
        setReviewUserId(uid)
        setTimeout(() => setShowReviewModal(true), 1500)
      }

      try {
        await loadDashboard(session.access_token)
      } catch (err: unknown) {
        // Fallback to simple project list if dashboard endpoint not available yet
        try {
          const data = await apiFetch<Project[]>('/projects', session.access_token)
          setProjects(data.map((p) => ({ ...p, document_count: 0 })))
          setMetrics({ total_projects: data.length, urgent_deadlines: 0, active_today: 0 })
        } catch {
          toast(err instanceof Error ? err.message : 'Falha ao carregar projetos.', 'error')
        }
      } finally {
        setLoading(false)
      }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  function handleProjectCreated(project: Project) {
    const dp: DashboardProject = { ...project, document_count: 0 }
    setProjects((prev) => [dp, ...prev])
    setMetrics((m) => ({ ...m, total_projects: m.total_projects + 1 }))
    toast(`Projeto "${project.name}" criado!`, 'success')
    // Redirect to the correct page for the project type
    setTimeout(() => {
      if (project.type === 'juridico') {
        router.push(`/project/${project.id}/legal`)
      } else {
        router.push(`/dashboard/${slugify(project.name)}--${project.id}`)
      }
    }, 600)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await apiFetch(`/projects/${deleteTarget.id}`, token, { method: 'DELETE' })
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      setMetrics((m) => ({ ...m, total_projects: Math.max(0, m.total_projects - 1) }))
      toast(`Projeto "${deleteTarget.name}" excluído.`, 'info')
      setDeleteTarget(null)
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir projeto.', 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  function openNew(type: 'docs' | 'estoq' | 'juridico') {
    setNewModalType(type)
    setShowNewModal(true)
  }

  // Group by type — projects without type default to 'docs'
  const docProjects   = projects.filter((p) => !p.type || p.type === 'docs')
  const estoqProjects = projects.filter((p) => p.type === 'estoq')
  const legalProjects = projects.filter((p) => p.type === 'juridico')

  const firstName = userName.split(' ')[0] || 'Usuário'

  return (
    <>
      <div className="min-h-screen bg-parchment">

        {/* Header */}
        <header className="sticky top-0 z-30 bg-surface border-b border-stone shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            <Link href="/dashboard" className="shrink-0">
              <LoreLogo layout="inline" size="h-8 w-8" wordmarkSize="text-lg" />
            </Link>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-brand-light flex items-center justify-center text-xs font-bold text-brand">
                  {getInitials(userName)}
                </div>
                <div className="leading-none">
                  <p className="text-sm font-semibold text-ink">{userName}</p>
                  <p className="text-xs text-ink/40">{userEmail}</p>
                </div>
              </div>
              <div className="sm:hidden h-8 w-8 rounded-full bg-brand-light flex items-center justify-center text-xs font-bold text-brand">
                {getInitials(userName)}
              </div>

              <Link href="/ajuda" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium text-ink/50 hover:text-ink hover:bg-parchment transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span className="hidden sm:inline">Ajuda</span>
              </Link>

              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

          {/* Welcome row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-ink" style={{ fontFamily: 'var(--font-serif)' }}>
                {getGreeting()}, {firstName} 👋
              </h1>
              <p className="text-sm text-ink/50 mt-0.5 capitalize">{getFormattedDate()}</p>
            </div>
            {!loading && (
              <Button onClick={() => openNew('docs')} size="md">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Novo projeto
              </Button>
            )}
          </div>

          {loading ? (
            <>
              {/* Metric skeleton */}
              <div className="grid grid-cols-3 gap-4 mb-10">
                {[1, 2, 3].map((i) => <div key={i} className="bg-stone/20 rounded-2xl h-24 animate-pulse" />)}
              </div>
              <ProjectGridSkeleton />
            </>
          ) : (
            <>
              {/* Metric cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                <MetricCard value={metrics.total_projects} label="Projetos ativos" color="green" />
                <MetricCard
                  value={metrics.urgent_deadlines}
                  label="Prazos urgentes"
                  color={metrics.urgent_deadlines > 0 ? 'red' : 'green'}
                />
                <MetricCard value={metrics.active_today} label="Ativos hoje" color="blue" />
              </div>

              {/* Lore Docs — always visible */}
              <DashboardSection
                icon="📄"
                title="Lore Docs"
                count={docProjects.length}
                projects={docProjects}
                newLabel="Novo projeto Docs"
                onNew={() => openNew('docs')}
                renderCard={(p) => (
                  <DocsProjectCard
                    key={p.id}
                    project={p}
                    onDelete={(id) => setDeleteTarget(projects.find((proj) => proj.id === id) ?? null)}
                  />
                )}
              />

              {/* Lore Estoq — feature flag */}
              {Features.ESTOQ && (
                <DashboardSection
                  icon="📦"
                  title="Lore Estoq"
                  count={estoqProjects.length}
                  projects={estoqProjects}
                  newLabel="Nova integração Estoq"
                  onNew={() => openNew('estoq')}
                  renderCard={(p) => (
                    <EstoqProjectCard
                      key={p.id}
                      project={p}
                      onDelete={(id) => setDeleteTarget(projects.find((proj) => proj.id === id) ?? null)}
                    />
                  )}
                />
              )}

              {/* Lore Jurídico — feature flag */}
              {Features.JURIDICO && (
                <DashboardSection
                  icon="⚖️"
                  title="Lore Jurídico"
                  count={legalProjects.length}
                  projects={legalProjects}
                  newLabel="Novo projeto Jurídico"
                  onNew={() => openNew('juridico')}
                  renderCard={(p) => (
                    <LegalProjectCard
                      key={p.id}
                      project={p}
                      onDelete={(id) => setDeleteTarget(projects.find((proj) => proj.id === id) ?? null)}
                    />
                  )}
                />
              )}

              {/* Empty state — all sections empty */}
              {projects.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
                  <div className="h-20 w-20 rounded-3xl bg-brand-light flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      <line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-ink" style={{ fontFamily: 'var(--font-serif)' }}>
                      Nenhum projeto ainda
                    </h2>
                    <p className="text-sm text-ink/50 mt-1 max-w-xs leading-relaxed">
                      Crie seu primeiro projeto e comece a fazer perguntas inteligentes sobre seus documentos.
                    </p>
                  </div>
                  <Button size="lg" onClick={() => openNew('docs')}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Criar primeiro projeto
                  </Button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      <NewProjectModal
        open={showNewModal}
        defaultType={newModalType}
        onClose={() => setShowNewModal(false)}
        onCreated={handleProjectCreated}
        token={token}
      />

      {deleteTarget && (
        <DeleteModal
          projectName={deleteTarget.name}
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {showReviewModal && reviewUserId && (
        <ReviewModal userId={reviewUserId} onClose={() => setShowReviewModal(false)} />
      )}

      <ToastContainer toasts={toasts} onClose={close} />
    </>
  )
}
