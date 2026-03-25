'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import LoreLogo from '@/components/LoreLogo'
import type { Project, ProjectMember, MemberRole, GoogleDriveIntegration, DriveFolder } from '@/types'

// ── API ───────────────────────────────────────────────────────────────────────

const PROJECTS_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000') +
  '/api/projects'

async function apiFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${PROJECTS_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    if (res.status === 204) return undefined as T
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Erro ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateApiKey(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return 'lmai_' + Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

function getStoredKey(projectId: string): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(`lumi_api_key_${projectId}`) ?? ''
}

function storeKey(projectId: string, key: string) {
  localStorage.setItem(`lumi_api_key_${projectId}`, key)
}

function getEmbedOrigin(): string {
  if (typeof window === 'undefined') return 'https://app.lumiAI.com'
  return window.location.origin
}

function getInitials(email: string): string {
  return email.slice(0, 2).toUpperCase()
}

// ── Copy Button ───────────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-dark transition-colors px-2.5 py-1.5 rounded-lg hover:bg-brand-light"
    >
      {copied ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Copiado!
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {label}
        </>
      )}
    </button>
  )
}

// ── Section Wrapper ───────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  danger,
  children,
}: {
  title: string
  subtitle?: string
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-6">
      <div className="sm:w-56 shrink-0">
        <h2 className={`text-sm font-bold ${danger ? 'text-[#A32D2D]' : 'text-ink'}`}>{title}</h2>
        {subtitle && (
          <p className="text-xs text-muted mt-1 leading-relaxed">{subtitle}</p>
        )}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────

function Divider() {
  return <div className="h-px bg-stone/30" />
}

// ── Role Badge ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
}

const ROLE_CLASSES: Record<MemberRole, string> = {
  owner: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  editor: 'bg-blue-100 text-blue-700 border border-blue-200',
  viewer: 'bg-stone/20 text-muted border border-stone/40',
}

function RoleBadge({ role }: { role: MemberRole }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_CLASSES[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  )
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteModal({
  projectName,
  onConfirm,
  onClose,
  loading,
}: {
  projectName: string
  onConfirm: () => void
  onClose: () => void
  loading: boolean
}) {
  const [typed, setTyped] = useState('')
  const confirmText = projectName

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-[420px] bg-surface rounded-2xl shadow-2xl border border-stone p-6 flex flex-col gap-5">

          <div className="flex flex-col gap-2">
            <div className="h-11 w-11 rounded-xl bg-[#F7C1C1]/30 border border-[#F7C1C1] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A32D2D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-ink">Excluir projeto permanentemente</h3>
            <p className="text-sm text-muted leading-relaxed">
              Esta ação excluirá todos os documentos, vetores e histórico de chat. Não poderá ser desfeita.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs text-ink-soft">
              Digite <span className="font-mono font-semibold text-ink bg-parchment px-1.5 py-0.5 rounded">{confirmText}</span> para confirmar:
            </p>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={confirmText}
              autoFocus
              className="w-full h-10 rounded-xl border border-stone hover:border-stone/70 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#F7C1C1] focus:border-[#A32D2D] transition-all"
            />
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={onConfirm}
              disabled={typed !== confirmText || loading}
              loading={loading}
            >
              {!loading && 'Excluir projeto'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Regenerate Confirm Modal ──────────────────────────────────────────────────

function RegenerateModal({
  onConfirm,
  onClose,
}: {
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-[380px] bg-surface rounded-2xl shadow-2xl border border-stone p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </div>
            <h3 className="font-bold text-ink text-base">Regenerar API key?</h3>
            <p className="text-sm text-muted leading-relaxed">
              A chave atual será invalidada imediatamente. Todos os widgets que usam esta chave pararão de funcionar até serem atualizados.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={onClose}>Cancelar</Button>
            <Button fullWidth onClick={onConfirm}>Regenerar</Button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Members Section ───────────────────────────────────────────────────────────

function MembersSection({
  projectId,
  token,
  isOwner,
  toast,
}: {
  projectId: string
  token: string
  isOwner: boolean
  toast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void
}) {
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer')
  const [inviting, setInviting] = useState(false)

  // Per-member role update state
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)
  const [removingMember, setRemovingMember] = useState<string | null>(null)

  const loadMembers = useCallback(async () => {
    try {
      const data = await apiFetch<ProjectMember[]>(`/${projectId}/members`, token)
      setMembers(data ?? [])
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao carregar membros.', 'error')
    } finally {
      setLoadingMembers(false)
    }
  }, [projectId, token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadMembers() }, [loadMembers])

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      await apiFetch(`/${projectId}/members`, token, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      setInviteEmail('')
      toast('Membro adicionado com sucesso!', 'success')
      await loadMembers()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao convidar membro.', 'error')
    } finally {
      setInviting(false)
    }
  }

  async function handleRoleChange(memberId: string, newRole: 'editor' | 'viewer') {
    setUpdatingRole(memberId)
    try {
      await apiFetch(`/${projectId}/members/${memberId}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      })
      setMembers((prev) =>
        prev.map((m) => m.user_id === memberId ? { ...m, role: newRole } : m)
      )
      toast('Role atualizada.', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao atualizar role.', 'error')
    } finally {
      setUpdatingRole(null)
    }
  }

  async function handleRemove(memberId: string) {
    setRemovingMember(memberId)
    try {
      await apiFetch(`/${projectId}/members/${memberId}`, token, { method: 'DELETE' })
      setMembers((prev) => prev.filter((m) => m.user_id !== memberId))
      toast('Membro removido.', 'info')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao remover membro.', 'error')
    } finally {
      setRemovingMember(null)
    }
  }

  return (
    <Card padding="none">
      {/* Member list */}
      <div className="divide-y divide-stone/30">
        {loadingMembers ? (
          <div className="px-5 py-4 flex flex-col gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 rounded-xl bg-stone/20 animate-pulse" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-muted">Nenhum membro encontrado.</div>
        ) : (
          members.map((m) => (
            <div key={m.user_id} className="px-5 py-3.5 flex items-center gap-3">
              {/* Avatar */}
              <div className="h-9 w-9 rounded-full bg-brand-light flex items-center justify-center shrink-0 overflow-hidden">
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt={m.email} className="h-9 w-9 object-cover" />
                ) : (
                  <span className="text-xs font-bold text-brand">{getInitials(m.email)}</span>
                )}
              </div>

              {/* Email + name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{m.full_name ?? m.email}</p>
                {m.full_name && (
                  <p className="text-xs text-muted truncate">{m.email}</p>
                )}
              </div>

              {/* Role: badge for owner, dropdown for others when isOwner */}
              {m.role === 'owner' || !isOwner ? (
                <RoleBadge role={m.role} />
              ) : (
                <select
                  value={m.role}
                  disabled={updatingRole === m.user_id}
                  onChange={(e) => handleRoleChange(m.user_id, e.target.value as 'editor' | 'viewer')}
                  className="text-xs border border-stone rounded-lg px-2 py-1 bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              )}

              {/* Remove button (owner only, not for the owner themselves) */}
              {isOwner && m.role !== 'owner' && (
                <button
                  onClick={() => handleRemove(m.user_id)}
                  disabled={removingMember === m.user_id}
                  title="Remover membro"
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:text-[#A32D2D] hover:bg-[#F7C1C1]/20 transition-colors disabled:opacity-40 shrink-0"
                >
                  {removingMember === m.user_id ? (
                    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Invite form (owner only) */}
      {isOwner && (
        <div className="px-5 py-4 border-t border-stone/40 bg-parchment/50 rounded-b-2xl">
          <p className="text-xs font-semibold text-ink mb-3">Convidar por e-mail</p>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <input
              type="email"
              placeholder="email@exemplo.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              className="flex-1 min-w-0 h-9 rounded-xl border border-stone bg-surface px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
              className="h-9 rounded-xl border border-stone bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20 shrink-0"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <Button
              size="sm"
              onClick={handleInvite}
              loading={inviting}
              disabled={!inviteEmail.trim()}
            >
              Convidar
            </Button>
          </div>
          <div className="mt-2.5 flex flex-col gap-1 text-xs text-muted">
            <span><strong className="text-blue-600">Editor</strong> — pode fazer upload e deletar arquivos</span>
            <span><strong className="text-stone-500">Viewer</strong> — pode apenas visualizar e conversar via chat</span>
          </div>
        </div>
      )}
    </Card>
  )
}

// ── Google Drive Integrations Section ────────────────────────────────────────

function GoogleDriveIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
    </svg>
  )
}

function formatSyncTime(iso: string | null): string {
  if (!iso) return 'Nunca sincronizado'
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function IntegrationsSection({
  projectId,
  token,
  isOwner,
  toast,
  onGdriveConnected,
}: {
  projectId: string
  token: string
  isOwner: boolean
  toast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void
  onGdriveConnected: boolean   // true when redirected back from OAuth
}) {
  const [integration, setIntegration]   = useState<GoogleDriveIntegration | null | undefined>(undefined)
  const [folders, setFolders]           = useState<DriveFolder[]>([])
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<DriveFolder | null>(null)
  const [savingFolder, setSavingFolder] = useState(false)
  const [connecting, setConnecting]     = useState(false)
  const [syncing, setSyncing]           = useState(false)
  const [removing, setRemoving]         = useState(false)

  // Load integration status
  const loadIntegration = useCallback(async () => {
    try {
      const data = await apiFetch<GoogleDriveIntegration | null>(
        `/${projectId}/integrations/google-drive`, token
      )
      setIntegration(data)
      if (data?.folder_id) {
        setSelectedFolder({ id: data.folder_id, name: data.folder_name ?? '' })
      }
    } catch {
      setIntegration(null)
    }
  }, [projectId, token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (token && isOwner) loadIntegration()
  }, [token, isOwner, loadIntegration])

  // If just returned from OAuth, reload and show toast
  useEffect(() => {
    if (onGdriveConnected && token && isOwner) {
      loadIntegration().then(() => toast('Google Drive conectado com sucesso!', 'success'))
    }
  }, [onGdriveConnected]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load folders when integration is loaded (if connected)
  useEffect(() => {
    if (!integration?.connected || folders.length > 0) return
    setLoadingFolders(true)
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
    fetch(`${apiBase}/api/integrations/google-drive/folders`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json())
      .then(setFolders)
      .catch(() => {})
      .finally(() => setLoadingFolders(false))
  }, [integration?.connected]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleConnect() {
    setConnecting(true)
    try {
      const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000')
      const res = await fetch(
        `${apiBase}/api/integrations/google/authorize?project_id=${projectId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail ?? 'Erro ao obter URL de autorização')
      }
      const data = await res.json()
      if (!data.auth_url) throw new Error('URL de autorização inválida')
      window.location.href = data.auth_url
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao iniciar conexão.', 'error')
      setConnecting(false)
    }
  }

  async function handleSaveFolder() {
    if (!selectedFolder) return
    setSavingFolder(true)
    try {
      const updated = await apiFetch<GoogleDriveIntegration>(
        `/${projectId}/integrations/google-drive`, token, {
          method: 'POST',
          body: JSON.stringify({ folder_id: selectedFolder.id, folder_name: selectedFolder.name }),
        }
      )
      setIntegration(updated)
      toast('Pasta vinculada com sucesso!', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar pasta.', 'error')
    } finally {
      setSavingFolder(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      await apiFetch(`/${projectId}/integrations/google-drive/sync`, token, { method: 'POST' })
      toast('Sincronização iniciada! Os documentos aparecerão em breve.', 'info')
      // Poll para atualizar o timestamp
      setTimeout(async () => {
        await loadIntegration()
        setSyncing(false)
      }, 4000)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao sincronizar.', 'error')
      setSyncing(false)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    try {
      await apiFetch(`/${projectId}/integrations/google-drive`, token, { method: 'DELETE' })
      setIntegration(null)
      setFolders([])
      setSelectedFolder(null)
      toast('Integração removida.', 'info')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao remover integração.', 'error')
    } finally {
      setRemoving(false)
    }
  }

  // Non-owner sees a read-only status (no API call needed for basic view)
  if (!isOwner) {
    return (
      <Card padding="lg">
        <div className="flex items-center gap-3 text-sm text-muted">
          <GoogleDriveIcon size={18} />
          {integration?.connected
            ? <span>Google Drive conectado</span>
            : <span>Nenhuma integração ativa.</span>
          }
        </div>
      </Card>
    )
  }

  // Loading state (owner only)
  if (integration === undefined) {
    return (
      <Card padding="lg">
        <div className="h-10 rounded-xl bg-stone/20 animate-pulse" />
      </Card>
    )
  }

  // ── Not connected ──
  if (!integration?.connected) {
    return (
      <Card padding="lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-stone/10 border border-stone/30 flex items-center justify-center shrink-0">
              <GoogleDriveIcon size={22} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Google Drive</p>
              <p className="text-xs text-muted mt-0.5">Não conectado</p>
            </div>
          </div>
          <Button onClick={handleConnect} loading={connecting} size="sm">
            <GoogleDriveIcon size={15} />
            Conectar Google Drive
          </Button>
        </div>
      </Card>
    )
  }

  // ── Connected ──
  const folderChanged = selectedFolder?.id !== integration.folder_id

  return (
    <Card padding="none">
      {/* Header: connected account */}
      <div className="px-5 py-4 flex items-center gap-3 border-b border-stone/30">
        <div className="h-10 w-10 rounded-xl bg-stone/10 border border-stone/30 flex items-center justify-center shrink-0">
          <GoogleDriveIcon size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink">Google Drive</p>
          <p className="text-xs text-muted truncate">Google Drive conectado</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Conectado
        </span>
      </div>

      {/* Folder selector */}
      <div className="px-5 py-4 border-b border-stone/30">
        <p className="text-xs font-semibold text-ink mb-2">Pasta vinculada ao projeto</p>
        {loadingFolders ? (
          <div className="h-9 rounded-xl bg-stone/20 animate-pulse" />
        ) : folders.length === 0 ? (
          <p className="text-xs text-muted">Nenhuma pasta encontrada no Drive.</p>
        ) : (
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <select
              value={selectedFolder?.id ?? ''}
              onChange={(e) => {
                const f = folders.find((x) => x.id === e.target.value) ?? null
                setSelectedFolder(f)
              }}
              className="flex-1 h-9 rounded-xl border border-stone bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="">— Selecione uma pasta —</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={handleSaveFolder}
              loading={savingFolder}
              disabled={!selectedFolder || !folderChanged}
            >
              Salvar pasta
            </Button>
          </div>
        )}
      </div>

      {/* Sync controls */}
      <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-ink">Última sincronização</p>
          <p className="text-xs text-muted mt-0.5">{formatSyncTime(integration.last_synced_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSync}
            loading={syncing}
            disabled={!integration.folder_id}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Sincronizar agora
          </Button>
          <button
            onClick={handleRemove}
            disabled={removing}
            title="Remover integração"
            className="h-9 w-9 flex items-center justify-center rounded-xl border border-stone text-muted hover:text-[#A32D2D] hover:border-[#F7C1C1] hover:bg-[#F7C1C1]/20 transition-colors disabled:opacity-40"
          >
            {removing ? (
              <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {!integration.folder_id && (
        <div className="px-5 pb-4">
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            Selecione e salve uma pasta para habilitar a sincronização.
          </p>
        </div>
      )}
    </Card>
  )
}

// ── Settings Page (inner — uses useSearchParams) ──────────────────────────────

function SettingsPageInner() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = params.id as string
  const supabase = createClient()
  const { toasts, toast, close } = useToast()

  const gdriveConnected = searchParams.get('gdrive_connected') === '1'
  const gdriveError     = searchParams.get('gdrive_error')

  const [token, setToken] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  // General form
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [nameError, setNameError] = useState('')

  // API key
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)

  // Delete
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // ── Show gdrive error if redirected back with error ───────────────────────

  useEffect(() => {
    if (gdriveError) toast('Erro ao conectar o Google Drive. Tente novamente.', 'error')
  }, [gdriveError]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      setToken(session.access_token)
      setCurrentUserId(session.user.id)

      try {
        const projects = await apiFetch<Project[]>('', session.access_token)
        const proj = projects.find((p) => p.id === projectId)
        if (!proj) { router.replace('/dashboard'); return }

        setProject(proj)
        setName(proj.name)
        setDescription(proj.description ?? '')

        // Load or generate API key
        const stored = getStoredKey(projectId)
        if (stored) {
          setApiKey(stored)
        } else {
          const newKey = generateApiKey()
          storeKey(projectId, newKey)
          setApiKey(newKey)
        }
      } catch (err: unknown) {
        toast(err instanceof Error ? err.message : 'Erro ao carregar projeto.', 'error')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isOwner = Boolean(project && currentUserId && project.user_id === currentUserId)

  // ── Save general ──────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!name.trim()) { setNameError('O nome não pode estar vazio.'); return }
    setNameError('')
    setSaving(true)

    try {
      // Update via Supabase client directly (no PATCH endpoint in FastAPI yet)
      const { error } = await supabase
        .from('projects')
        .update({ name: name.trim(), description: description.trim() || null })
        .eq('id', projectId)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')

      if (error) throw new Error(error.message)

      setProject((p) => p ? { ...p, name: name.trim(), description: description.trim() || null } : p)
      toast('Projeto atualizado com sucesso!', 'success')
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar.', 'error')
    } finally {
      setSaving(false)
    }
  }, [name, description, projectId, supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Regenerate API key ────────────────────────────────────────────────────

  function handleRegenerate() {
    const newKey = generateApiKey()
    storeKey(projectId, newKey)
    setApiKey(newKey)
    setShowKey(true)
    setShowRegenerateModal(false)
    toast('Nova API key gerada. Atualize seu código de embed.', 'warning')
  }

  // ── Delete project ────────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    setDeleteLoading(true)
    try {
      await apiFetch(`/${projectId}`, token, { method: 'DELETE' })
      localStorage.removeItem(`lumi_api_key_${projectId}`)
      toast('Projeto excluído.', 'info')
      router.replace('/dashboard')
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir.', 'error')
      setDeleteLoading(false)
      setShowDeleteModal(false)
    }
  }, [token, projectId, router]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Embed code ────────────────────────────────────────────────────────────

  const origin = getEmbedOrigin()
  const widgetUrl = `${origin}/project/${projectId}/widget?api_key=${apiKey}&title=${encodeURIComponent(name || project?.name || '')}`
  const embedCode = `<!-- Lumi AI Chat Widget -->
<iframe
  src="${widgetUrl}"
  width="400"
  height="600"
  frameborder="0"
  style="border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.12);"
  allow="clipboard-write"
  title="Lumi AI Chat">
</iframe>`

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="min-h-screen bg-parchment">

        {/* Header */}
        <header className="sticky top-0 z-30 bg-surface border-b border-stone shadow-sm">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
            <Link
              href={`/dashboard/${projectId}`}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-stone/20 transition-colors shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
              </svg>
            </Link>

            <Link href="/dashboard" className="shrink-0">
              <LoreLogo layout="inline" size="h-7 w-7" showWordmark={false} />
            </Link>

            <div className="h-5 w-px bg-stone shrink-0" />

            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold text-ink truncate">
                {loading ? 'Carregando…' : (project?.name ?? 'Projeto')}
              </h1>
              <p className="text-xs text-muted">Configurações</p>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          {loading ? (
            <div className="flex flex-col gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 rounded-2xl bg-surface border border-stone/50 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-10">

              {/* ── General ── */}
              <Section title="Informações gerais" subtitle="Nome e descrição visíveis no dashboard.">
                <Card padding="lg">
                  <div className="flex flex-col gap-4">
                    <Input
                      id="proj-name"
                      label="Nome do projeto"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setNameError('') }}
                      error={nameError}
                      maxLength={120}
                      disabled={!isOwner}
                    />

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="proj-desc" className="text-sm font-medium text-ink">
                        Descrição <span className="text-muted font-normal">(opcional)</span>
                      </label>
                      <textarea
                        id="proj-desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={500}
                        rows={3}
                        disabled={!isOwner}
                        className="w-full rounded-xl border border-stone hover:border-stone/70 bg-surface px-4 py-3 text-sm text-ink placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="Breve descrição do projeto…"
                      />
                      <p className="text-xs text-muted text-right">{description.length}/500</p>
                    </div>

                    {isOwner && (
                      <div className="flex justify-end">
                        <Button onClick={handleSave} loading={saving} disabled={name === project?.name && (description || '') === (project?.description ?? '')}>
                          Salvar alterações
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </Section>

              <Divider />

              {/* ── Members ── */}
              <Section
                title="Membros e Permissões"
                subtitle="Gerencie quem tem acesso a este projeto e seus níveis de permissão."
              >
                {token && (
                  <MembersSection
                    projectId={projectId}
                    token={token}
                    isOwner={isOwner}
                    toast={toast}
                  />
                )}
              </Section>

              <Divider />

              {/* ── Integrations ── */}
              <Section
                title="Integrações"
                subtitle="Conecte fontes externas para sincronizar documentos automaticamente."
              >
                {token && (
                  <IntegrationsSection
                    projectId={projectId}
                    token={token}
                    isOwner={isOwner}
                    toast={toast}
                    onGdriveConnected={gdriveConnected}
                  />
                )}
              </Section>

              <Divider />

              {/* ── Embed ── */}
              <Section
                title="Widget de embed"
                subtitle="Incorpore o chat nos seus sites com um <iframe>."
              >
                <Card padding="none">
                  {/* Preview info */}
                  <div className="px-5 pt-5 pb-4 border-b border-stone/40">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-brand-light flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="9" x2="15" y2="9" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="15" x2="11" y2="15" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink">Código de incorporação</p>
                        <p className="text-xs text-muted mt-0.5 leading-relaxed">
                          Tamanho padrão: 400×600 px. Personalize com <code className="bg-stone/20 px-1 rounded text-xs">width</code> e <code className="bg-stone/20 px-1 rounded text-xs">height</code>.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Code block */}
                  <div className="px-5 py-4 bg-parchment border-t border-stone relative rounded-b-2xl overflow-hidden">
                    <pre className="text-xs text-ink font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
                      {embedCode}
                    </pre>
                    <div className="absolute top-3 right-3">
                      <CopyButton text={embedCode} label="Copiar código" />
                    </div>
                  </div>

                  {/* Widget URL */}
                  <div className="px-5 py-4 border-t border-stone/40 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted shrink-0">URL direta:</span>
                    <span className="flex-1 text-xs font-mono text-ink truncate bg-parchment rounded-lg px-2 py-1">
                      {widgetUrl}
                    </span>
                    <CopyButton text={widgetUrl} label="Copiar URL" />
                  </div>
                </Card>
              </Section>

              <Divider />

              {/* ── API Key ── */}
              <Section
                title="API Key do projeto"
                subtitle="Usada para autenticar o widget. Mantenha em segredo."
              >
                <Card padding="lg">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-ink">Chave secreta</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                          <input
                            type={showKey ? 'text' : 'password'}
                            value={apiKey}
                            readOnly
                            className="w-full h-11 rounded-xl border border-stone bg-surface px-4 pr-10 text-sm font-mono text-ink focus:outline-none select-all cursor-pointer"
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                          />
                          <button
                            type="button"
                            onClick={() => setShowKey((p) => !p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink-soft transition-colors"
                          >
                            {showKey ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <CopyButton text={apiKey} />
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <p className="text-xs text-amber-700 leading-relaxed">
                        <strong>Atenção:</strong> Não exponha esta chave em código front-end público. O embed via iframe é seguro pois a chave é transmitida server-to-server. Requer endpoint <code className="bg-amber-100 px-1 rounded font-mono">/api/projects/{'{id}'}/chat</code> com suporte a <code className="bg-amber-100 px-1 rounded font-mono">X-API-Key</code>.
                      </p>
                    </div>

                    {isOwner && (
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          onClick={() => setShowRegenerateModal(true)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                          </svg>
                          Regenerar API key
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </Section>

              <Divider />

              {/* ── Danger Zone (owner only) ── */}
              {isOwner && (
                <Section
                  title="Zona de perigo"
                  subtitle="Ações irreversíveis. Proceda com cautela."
                  danger
                >
                  <div className="border border-[#F7C1C1] rounded-xl p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[#A32D2D]">Excluir este projeto</p>
                        <p className="text-xs text-muted mt-0.5 leading-relaxed">
                          Remove o projeto, todos os documentos, vetores no Qdrant e histórico de chat. Esta ação não pode ser desfeita.
                        </p>
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setShowDeleteModal(true)}
                      >
                        Excluir projeto
                      </Button>
                    </div>
                  </div>
                </Section>
              )}

            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {showRegenerateModal && (
        <RegenerateModal
          onConfirm={handleRegenerate}
          onClose={() => setShowRegenerateModal(false)}
        />
      )}

      {showDeleteModal && project && (
        <DeleteModal
          projectName={project.name}
          onConfirm={handleDelete}
          onClose={() => setShowDeleteModal(false)}
          loading={deleteLoading}
        />
      )}

      <ToastContainer toasts={toasts} onClose={close} />
    </>
  )
}

// ── Export wrapped in Suspense (required for useSearchParams in App Router) ───

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsPageInner />
    </Suspense>
  )
}
