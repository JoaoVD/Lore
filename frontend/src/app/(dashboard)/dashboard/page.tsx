'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import LoreLogo from '@/components/LoreLogo'
import ReviewModal, { reviewStorageKey } from '@/components/ui/ReviewModal'
import type { Project } from '@/types'

// ── API helper ───────────────────────────────────────────────────────────────

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
    .replace(/[\u0300-\u036f]/g, '')  // remove acentos
    .replace(/[^a-z0-9\s-]/g, '')    // remove caracteres especiais
    .trim()
    .replace(/\s+/g, '-')             // espaços viram hífens
    .replace(/-+/g, '-')              // evita hífens duplos
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getInitials(name?: string) {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
      <div className="relative">
        <div className="h-24 w-24 rounded-3xl bg-brand-light flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0F6E56"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            <line x1="12" y1="11" x2="12" y2="17" />
            <line x1="9" y1="14" x2="15" y2="14" />
          </svg>
        </div>
        <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-brand flex items-center justify-center shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
      </div>
      <div>
        <h2 className="text-xl font-bold text-ink" style={{ fontFamily: 'var(--font-serif)' }}>
          Nenhum projeto ainda
        </h2>
        <p className="text-sm text-muted mt-1 max-w-xs leading-relaxed">
          Crie seu primeiro projeto e comece a fazer perguntas inteligentes sobre seus documentos.
        </p>
      </div>
      <Button size="lg" onClick={onNew}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Criar primeiro projeto
      </Button>
    </div>
  )
}

// ── Project Card ──────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  docCount,
  onDelete,
}: {
  project: Project
  docCount: number | undefined
  onDelete: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <Card
      padding="none"
      shadow
      className="group flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      {/* Brand accent bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-brand to-brand-mid" />

      <div className="flex flex-col gap-3 p-5 flex-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="h-10 w-10 rounded-xl bg-brand-light flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>

          {/* Kebab menu */}
          <div ref={menuRef} className="relative">
            <button
              onClick={(e) => { e.preventDefault(); setMenuOpen((p) => !p) }}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-stone hover:text-ink hover:bg-parchment transition-colors opacity-0 group-hover:opacity-100"
              aria-label="Opções"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-10 w-40 bg-surface border border-stone/50 rounded-xl shadow-lg py-1 text-sm">
                <button
                  onClick={() => { setMenuOpen(false); onDelete(project.id) }}
                  className="w-full text-left px-4 py-2 text-red-500 hover:bg-red-50 transition-colors"
                >
                  Excluir projeto
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Name & description */}
        <div className="flex-1">
          <h3 className="font-semibold text-ink text-base leading-snug line-clamp-1">
            {project.name}
          </h3>
          {project.description ? (
            <p className="text-sm text-muted mt-1 leading-relaxed line-clamp-2">
              {project.description}
            </p>
          ) : (
            <p className="text-sm text-stone mt-1 italic">Sem descrição</p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-stone pt-1 border-t border-stone/20">
          <span className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            {docCount === undefined ? (
              <span className="h-3 w-6 bg-stone/30 rounded animate-pulse inline-block" />
            ) : (
              `${docCount} doc${docCount !== 1 ? 's' : ''}`
            )}
          </span>
          <span className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {formatDate(project.created_at)}
          </span>
        </div>
      </div>

      {/* Open button */}
      <div className="px-5 pb-5">
        <Link href={`/dashboard/${slugify(project.name)}--${project.id}`}>
          <Button variant="outline" fullWidth size="sm">
            Abrir projeto
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </Button>
        </Link>
      </div>
    </Card>
  )
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
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ name?: string }>({})
  const { toasts, toast, close } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setDescription('')
      setErrors({})
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const e2: typeof errors = {}
    if (!name.trim()) e2.name = 'Informe o nome do projeto.'
    if (Object.keys(e2).length) { setErrors(e2); return }

    setLoading(true)
    try {
      const project = await apiFetch<Project>('/projects', token, {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal
        aria-label="Novo projeto"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-[420px] bg-surface rounded-2xl shadow-2xl border border-stone/50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stone/30">
            <div>
              <h2 className="text-lg font-bold text-ink">Novo projeto</h2>
              <p className="text-sm text-muted mt-0.5">Configure o projeto para começar</p>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-stone hover:text-ink hover:bg-parchment transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            <Input
              ref={inputRef}
              id="project-name"
              label="Nome do projeto"
              placeholder="Ex: Contratos 2024"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (errors.name) setErrors({})
              }}
              error={errors.name}
              maxLength={120}
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="project-desc" className="text-sm font-medium text-ink-soft">
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
              <p className="text-xs text-muted text-right">{description.length}/500</p>
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="ghost" fullWidth onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" loading={loading} fullWidth>
                Criar projeto
              </Button>
            </div>
          </form>
        </div>
      </div>

      <ToastContainer toasts={toasts} onClose={close} />
    </>
  )
}

// ── Delete Confirm Modal ───────────────────────────────────────────────────────

function DeleteModal({
  projectName,
  loading,
  onConfirm,
  onClose,
}: {
  projectName: string
  loading: boolean
  onConfirm: () => void
  onClose: () => void
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
              O projeto <span className="font-semibold text-ink">&quot;{projectName}&quot;</span> e todos os seus documentos serão excluídos permanentemente. Esta ação não pode ser desfeita.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Sim, excluir'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Dashboard Page ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toasts, toast, close } = useToast()

  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [token, setToken] = useState('')

  const [projects, setProjects] = useState<Project[]>([])
  const [docCounts, setDocCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const [showNewModal, setShowNewModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewUserId, setReviewUserId] = useState('')

  // ── Load session + projects ──────────────────────────────────────────────

  const loadProjects = useCallback(async (accessToken: string) => {
    const data = await apiFetch<Project[]>('/projects', accessToken)
    setProjects(data)
    return data
  }, [])

  const loadDocCounts = useCallback(async (projectIds: string[]) => {
    if (!projectIds.length) return
    const { data } = await supabase
      .from('documents')
      .select('project_id')
      .in('project_id', projectIds)

    const counts: Record<string, number> = {}
    projectIds.forEach((id) => { counts[id] = 0 })
      ; (data ?? []).forEach((row: { project_id: string }) => {
        counts[row.project_id] = (counts[row.project_id] ?? 0) + 1
      })
    setDocCounts(counts)
  }, [supabase])

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

      // Mostrar modal de avaliação após 14 dias de uso
      const uid = session.user.id
      const createdAt = new Date(session.user.created_at)
      const daysSince = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      const alreadyAnswered = localStorage.getItem(reviewStorageKey(uid))
      if (daysSince >= 14 && !alreadyAnswered) {
        setReviewUserId(uid)
        setTimeout(() => setShowReviewModal(true), 1500)
      }

      try {
        const data = await loadProjects(session.access_token)
        await loadDocCounts(data.map((p) => p.id))
      } catch (err: unknown) {
        toast(err instanceof Error ? err.message : 'Falha ao carregar projetos.', 'error')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  function handleProjectCreated(project: Project) {
    setProjects((prev) => [project, ...prev])
    setDocCounts((prev) => ({ ...prev, [project.id]: 0 }))
    toast(`Projeto "${project.name}" criado com sucesso!`, 'success')
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await apiFetch(`/projects/${deleteTarget.id}`, token, { method: 'DELETE' })
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      setDocCounts((prev) => {
        const next = { ...prev }
        delete next[deleteTarget.id]
        return next
      })
      toast(`Projeto "${deleteTarget.name}" excluído.`, 'info')
      setDeleteTarget(null)
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir projeto.', 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="min-h-screen bg-parchment">

        {/* Header */}
        <header className="sticky top-0 z-30 bg-surface border-b border-stone shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

            {/* Logo */}
            <Link href="/dashboard" className="shrink-0">
              <LoreLogo layout="inline" size="h-8 w-8" wordmarkSize="text-lg" />
            </Link>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* User info */}
              <div className="hidden sm:flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-brand-light flex items-center justify-center text-xs font-bold text-brand">
                  {getInitials(userName)}
                </div>
                <div className="leading-none">
                  <p className="text-sm font-semibold text-ink">{userName}</p>
                  <p className="text-xs text-muted">{userEmail}</p>
                </div>
              </div>

              {/* Mobile avatar */}
              <div className="sm:hidden h-8 w-8 rounded-full bg-brand-light flex items-center justify-center text-xs font-bold text-brand">
                {getInitials(userName)}
              </div>

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
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

          {/* Page title row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1
                className="text-2xl font-bold text-ink"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Meus projetos
              </h1>
              <p className="text-sm text-muted mt-0.5">
                {loading
                  ? 'Carregando seus projetos...'
                  : projects.length === 0
                    ? 'Você ainda não tem projetos'
                    : `${projects.length} projeto${projects.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            {!loading && (
              <Button onClick={() => setShowNewModal(true)} size="md">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Novo projeto
              </Button>
            )}
          </div>

          {/* Content */}
          {loading ? (
            <ProjectGridSkeleton />
          ) : projects.length === 0 ? (
            <EmptyState onNew={() => setShowNewModal(true)} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  docCount={docCounts[project.id]}
                  onDelete={(id) => setDeleteTarget(projects.find((p) => p.id === id) ?? null)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <NewProjectModal
        open={showNewModal}
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

// ── Inline Skeleton (also used by loading.tsx) ────────────────────────────────

export function ProjectGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-surface rounded-2xl border border-stone/50 shadow-sm overflow-hidden">
          <div className="h-1.5 w-full bg-stone/30" />
          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-stone/30 animate-pulse shrink-0" />
              <div className="flex-1 flex flex-col gap-2 mt-1">
                <div className="h-4 w-3/4 bg-stone/30 rounded-md animate-pulse" />
                <div className="h-3 w-full bg-stone/30 rounded-md animate-pulse" />
                <div className="h-3 w-2/3 bg-stone/30 rounded-md animate-pulse" />
              </div>
            </div>
            <div className="flex gap-3 pt-2 border-t border-stone/20">
              <div className="h-3 w-16 bg-stone/30 rounded animate-pulse" />
              <div className="h-3 w-20 bg-stone/30 rounded animate-pulse" />
            </div>
            <div className="h-9 w-full bg-stone/30 rounded-xl animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}
