'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import { ProjectHeader } from '@/components/project/ProjectHeader'
import type { DashboardProject } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: unknown[]
  created_at: string
}

// ── API ───────────────────────────────────────────────────────────────────────

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
    throw new Error(body.detail ?? `Erro ${res.status}`)
  }
  return res.json()
}

// ── Suggestions ───────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Tem cimento CP-II disponível?',
  'Qual o preço da tinta acrílica 18L?',
  'Quantas unidades de rejunte branco?',
  'Lista os produtos com estoque abaixo de 10 unidades',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora mesmo'
  if (min < 60) return `há ${min} minuto${min !== 1 ? 's' : ''}`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} hora${h !== 1 ? 's' : ''}`
  const d = Math.floor(h / 24)
  return `há ${d} dia${d !== 1 ? 's' : ''}`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function truncate(text: string, max = 60) {
  return text.length <= max ? text : text.slice(0, max) + '…'
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function EstoqPage() {
  const params = useParams()
  const router = useRouter()
  const rawSlug = params.id as string
  const projectId = rawSlug.length > 36 ? rawSlug.slice(-36) : rawSlug
  const supabase = createClient()
  const { toasts, toast, close } = useToast()

  const [token, setToken] = useState('')
  const [project, setProject] = useState<DashboardProject | null>(null)
  const [loading, setLoading] = useState(true)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [chatLoading, setChatLoading] = useState(false)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      setToken(session.access_token)

      // Try dashboard endpoint for enriched data (api_connected, api_name)
      try {
        const data = await apiFetch<{ projects: DashboardProject[] }>('/projects/dashboard', session.access_token)
        const proj = data.projects.find(p => p.id === projectId)
        if (!proj) { router.replace('/dashboard'); return }
        setProject(proj)
      } catch {
        // Fallback to basic list
        try {
          const list = await apiFetch<DashboardProject[]>('/projects', session.access_token)
          const proj = list.find(p => p.id === projectId)
          if (!proj) { router.replace('/dashboard'); return }
          setProject(proj)
        } catch {
          router.replace('/dashboard')
          return
        }
      } finally {
        setLoading(false)
      }

      // Load chat history
      try {
        const history = await apiFetch<ChatMessage[]>(`/projects/${projectId}/history?limit=50`, session.access_token)
        setMessages(history)
      } catch {
        // empty history is fine
      } finally {
        setHistoryLoading(false)
      }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatLoading])

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || chatLoading) return
    setInput('')
    setChatLoading(true)

    const temp: ChatMessage = {
      id: `tmp-${Date.now()}`, role: 'user', content: msg, sources: [], created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, temp])

    try {
      const res = await apiFetch<{ user_message: ChatMessage; assistant_message: ChatMessage }>(
        `/projects/${projectId}/chat`, token,
        { method: 'POST', body: JSON.stringify({ message: msg }) }
      )
      setMessages(prev => [...prev.filter(m => m.id !== temp.id), res.user_message, res.assistant_message])
    } catch (err: unknown) {
      setMessages(prev => prev.filter(m => m.id !== temp.id))
      toast(err instanceof Error ? err.message : 'Erro ao enviar mensagem.', 'error')
    } finally {
      setChatLoading(false)
    }
  }, [input, chatLoading, token, projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Build recent queries from message pairs
  const recentQueries = messages
    .reduce<{ question: string; answer: string; time: string }[]>((acc, msg, i) => {
      if (msg.role === 'user' && messages[i + 1]?.role === 'assistant') {
        acc.push({
          question: msg.content,
          answer: truncate(messages[i + 1].content),
          time: formatTime(msg.created_at),
        })
      }
      return acc
    }, [])
    .slice(-5)
    .reverse()

  const lastQuery = messages.filter(m => m.role === 'user').at(-1)

  if (loading) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center">
        <span className="h-8 w-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-parchment flex flex-col">
        <ProjectHeader projectName={project?.name ?? 'Lore Estoq'} projectId={projectId} icon="📦" />

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">

          {/* API Status Card */}
          <div className="bg-white rounded-2xl border border-stone/30 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🔌</span>
              <h2 className="font-semibold text-ink text-sm">Integração com sistema</h2>
            </div>

            {project?.api_connected ? (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
                    <span className="text-sm font-semibold text-ink">Conectado</span>
                    <span className="text-sm text-ink/50">— {project.api_name ?? 'API configurada'}</span>
                  </div>
                  {lastQuery && (
                    <p className="text-xs text-ink/40 mt-1">Última consulta: {timeAgo(lastQuery.created_at)}</p>
                  )}
                </div>
                <Link
                  href={`/project/${projectId}/settings`}
                  className="text-xs font-medium text-brand bg-brand-light px-3 py-1.5 rounded-lg hover:bg-brand/20 transition-colors shrink-0"
                >
                  Reconfigurar
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    <span className="text-sm font-semibold text-amber-700">Sem API configurada</span>
                  </div>
                  <p className="text-xs text-ink/40 mt-1">Configure a integração para consultar seu estoque em linguagem natural</p>
                </div>
                <Link
                  href={`/project/${projectId}/settings`}
                  className="text-xs font-medium text-white bg-brand px-3 py-1.5 rounded-lg hover:bg-brand-dark transition-colors shrink-0"
                >
                  Configurar agora
                </Link>
              </div>
            )}
          </div>

          {/* Chat section */}
          <div className="bg-white rounded-2xl border border-stone/30 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-stone/20 flex items-center gap-2">
              <span className="text-base">💬</span>
              <h2 className="font-semibold text-ink text-sm">Consultar estoque</h2>
              {!historyLoading && (
                <span className="ml-auto text-xs text-muted bg-stone/20 px-2 py-0.5 rounded-full">
                  {messages.filter(m => m.role === 'user').length} consultas
                </span>
              )}
            </div>

            {/* Messages */}
            <div className="overflow-y-auto p-5 flex flex-col gap-4" style={{ minHeight: '320px', maxHeight: '480px' }}>
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="h-5 w-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-4 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-xl">📦</div>
                  <div>
                    <p className="font-semibold text-ink text-sm">Consulte seu estoque</p>
                    <p className="text-xs text-muted mt-0.5">Pergunte sobre disponibilidade, preços e quantidades</p>
                  </div>
                  <div className="flex flex-col gap-2 w-full max-w-sm">
                    {SUGGESTIONS.map(s => (
                      <button key={s} onClick={() => sendMessage(s)}
                        className="px-4 py-2.5 rounded-xl bg-parchment border border-stone/50 text-sm text-muted text-left hover:border-blue-300 hover:text-ink transition-colors">
                        &ldquo;{s}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start items-end gap-2'}`}>
                      {msg.role === 'assistant' && (
                        <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 self-start mt-1">
                          <span className="text-white text-xs font-bold">L</span>
                        </div>
                      )}
                      <div className={`max-w-[78%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-blue-50 text-blue-900 rounded-br-sm'
                          : 'bg-surface border border-stone text-ink/80 rounded-tl-sm'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex items-end gap-2">
                      <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-bold">L</span>
                      </div>
                      <div className="bg-surface border border-stone rounded-xl rounded-tl-sm px-4 py-3">
                        <div className="flex gap-1 items-center h-4">
                          {[0,1,2].map(i => <span key={i} className="h-2 w-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-stone/20 px-5 py-4 bg-surface shrink-0">
              <div className={`flex items-end gap-3 p-3 bg-white rounded-2xl border transition-all shadow-sm ${input ? 'border-blue-400' : 'border-stone'}`}>
                <textarea
                  value={input}
                  onChange={(e) => { setInput(e.target.value); const t = e.target; t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, 120)}px` }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  placeholder="Pergunte sobre disponibilidade, preços, quantidades..."
                  rows={1}
                  disabled={chatLoading}
                  className="flex-1 resize-none bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none leading-relaxed disabled:cursor-not-allowed"
                  style={{ maxHeight: '120px' }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || chatLoading}
                  className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                    input.trim() && !chatLoading ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-stone/30 text-muted cursor-not-allowed'
                  }`}
                >
                  {chatLoading
                    ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                  }
                </button>
              </div>
            </div>
          </div>

          {/* Recent queries */}
          {recentQueries.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-ink/50 uppercase tracking-wide mb-3">📊 Últimas consultas</h2>
              <div className="bg-white rounded-2xl border border-stone/30 divide-y divide-stone/20">
                {recentQueries.map((q, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-parchment/50 transition-colors cursor-pointer" onClick={() => sendMessage(q.question)}>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-ink truncate block">&ldquo;{truncate(q.question, 40)}&rdquo;</span>
                      <span className="text-xs text-ink/40 truncate block mt-0.5">→ {q.answer}</span>
                    </div>
                    <span className="text-xs text-ink/30 shrink-0">{q.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

      <ToastContainer toasts={toasts} onClose={close} />
    </>
  )
}
