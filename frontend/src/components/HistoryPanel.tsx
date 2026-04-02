'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
}

interface SessionMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: { file_name: string; page_number: number | null; score: number }[]
  created_at: string
}

interface HistoryPanelProps {
  projectId: string
  token: string
  onLoadSession?: (messages: SessionMessage[], sessionId: string) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000') + '/api/projects'

async function apiFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Erro ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

function groupByDate(sessions: ChatSession[]): Record<string, ChatSession[]> {
  const now = new Date()
  const today = now.toDateString()
  const yesterday = new Date(now.getTime() - 86400000).toDateString()
  const weekAgo = new Date(now.getTime() - 7 * 86400000)
  const monthAgo = new Date(now.getTime() - 30 * 86400000)

  const groups: Record<string, ChatSession[]> = {}

  for (const s of sessions) {
    const d = new Date(s.updated_at)
    let label: string
    if (d.toDateString() === today) label = 'Hoje'
    else if (d.toDateString() === yesterday) label = 'Ontem'
    else if (d >= weekAgo) label = 'Esta semana'
    else if (d >= monthAgo) label = 'Este mês'
    else label = 'Mais antigos'

    if (!groups[label]) groups[label] = []
    groups[label].push(s)
  }

  return groups
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// ── HistoryPanel ──────────────────────────────────────────────────────────────

export default function HistoryPanel({ projectId, token, onLoadSession }: HistoryPanelProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: string; session_id: string; content: string; created_at: string }[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [loadingSession, setLoadingSession] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Carrega lista de sessões
  const fetchSessions = useCallback(async () => {
    try {
      const data = await apiFetch<{ sessions: ChatSession[] }>(`/${projectId}/sessions?limit=50`, token)
      setSessions(data.sessions)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [projectId, token])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  // Busca com debounce
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)

    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults(null)
      return
    }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await apiFetch<{ results: { id: string; session_id: string; content: string; created_at: string }[] }>(
          `/${projectId}/sessions/search?q=${encodeURIComponent(searchQuery)}`,
          token,
        )
        setSearchResults(data.results)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 400)
  }, [searchQuery, projectId, token])

  // Abre uma sessão
  const openSession = useCallback(async (sessionId: string) => {
    if (!onLoadSession) return
    setLoadingSession(sessionId)
    try {
      const data = await apiFetch<{ session: ChatSession; messages: SessionMessage[] }>(
        `/${projectId}/sessions/${sessionId}`,
        token,
      )
      onLoadSession(data.messages, sessionId)
    } catch {
      // silently fail
    } finally {
      setLoadingSession(null)
    }
  }, [projectId, token, onLoadSession])

  // Deleta sessão
  const deleteSession = useCallback(async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    setDeletingId(sessionId)
    try {
      await apiFetch(`/${projectId}/sessions/${sessionId}`, token, { method: 'DELETE' })
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    } catch {
      // silently fail
    } finally {
      setDeletingId(null)
    }
  }, [projectId, token])

  const groups = groupByDate(sessions)
  const groupOrder = ['Hoje', 'Ontem', 'Esta semana', 'Este mês', 'Mais antigos']

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-stone/50 shrink-0">
        <h2 className="text-sm font-bold text-ink mb-3">Histórico</h2>
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
            xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Buscar em conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone/10 border border-stone/50 rounded-lg focus:outline-none focus:border-brand/40 text-ink placeholder:text-muted"
          />
          {searching && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Search results */}
        {searchResults !== null ? (
          searchResults.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-muted">Nenhum resultado para &ldquo;{searchQuery}&rdquo;</p>
            </div>
          ) : (
            <div className="px-2">
              <p className="px-2 py-1.5 text-xs text-muted font-medium">{searchResults.length} resultado(s)</p>
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  onClick={() => r.session_id && openSession(r.session_id)}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-stone/10 transition-colors group mb-0.5"
                >
                  <p className="text-xs text-ink leading-relaxed line-clamp-2">{r.content}</p>
                  <p className="text-xs text-muted mt-1">{formatTime(r.created_at)}</p>
                </button>
              ))}
            </div>
          )
        ) : loading ? (
          <div className="flex flex-col gap-1 px-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-3 py-2.5 rounded-xl">
                <div className="h-3 w-3/4 bg-stone/30 rounded animate-pulse mb-1.5" />
                <div className="h-2.5 w-1/3 bg-stone/20 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C8C6BC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-xs text-muted">Nenhuma conversa ainda</p>
          </div>
        ) : (
          groupOrder
            .filter((g) => groups[g]?.length)
            .map((groupLabel) => (
              <div key={groupLabel} className="mb-1">
                <p className="px-5 py-1 text-xs font-semibold text-muted">{groupLabel}</p>
                {groups[groupLabel].map((session) => (
                  <button
                    key={session.id}
                    onClick={() => openSession(session.id)}
                    disabled={!!loadingSession || !!deletingId}
                    className={`
                      w-full text-left px-3 py-2.5 rounded-xl hover:bg-stone/10 transition-colors group mx-2
                      ${loadingSession === session.id ? 'opacity-60' : ''}
                      ${deletingId === session.id ? 'opacity-40 pointer-events-none' : ''}
                    `}
                    style={{ width: 'calc(100% - 1rem)' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-ink leading-snug line-clamp-2 flex-1">
                        {session.title || 'Conversa sem título'}
                      </p>
                      <button
                        onClick={(e) => deleteSession(e, session.id)}
                        title="Deletar conversa"
                        className="h-5 w-5 shrink-0 flex items-center justify-center rounded text-stone hover:text-[#A32D2D] opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted">{session.message_count} msg</span>
                      <span className="text-xs text-muted">·</span>
                      <span className="text-xs text-muted">{formatTime(session.updated_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            ))
        )}
      </div>
    </div>
  )
}
