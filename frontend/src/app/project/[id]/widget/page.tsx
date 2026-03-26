'use client'

/**
 * /project/[id]/widget
 * ─────────────────────
 * Compact chat widget designed for embedding via <iframe>.
 * Auth: uses ?api_key= query param as Bearer token.
 *       The backend endpoint /api/projects/{id}/chat must accept this key
 *       via an X-API-Key header or Bearer token (see auth/middleware.py).
 *
 * Embed snippet (generated in settings):
 *   <iframe src="https://app.lumiAI.com/project/{id}/widget?api_key={key}&title=My+Project"
 *     width="400" height="600" frameborder="0" />
 */

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Source {
  file_name: string
  page_number: number | null
  score: number
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: Source[]
  created_at: string
}

// ── API ───────────────────────────────────────────────────────────────────────

const PROJECTS_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000') +
  '/api/projects'

async function apiFetch<T>(
  path: string,
  apiKey: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${PROJECTS_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'X-API-Key': apiKey,
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Erro ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit',
  })
}

function shortName(name: string, max = 22) {
  if (name.length <= max) return name
  const ext = name.includes('.') ? '.' + name.split('.').pop() : ''
  return name.slice(0, max - ext.length - 1) + '…' + ext
}

// ── Source Pills ──────────────────────────────────────────────────────────────

function SourcePills({ sources }: { sources: Source[] }) {
  if (!sources?.length) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {sources.map((s, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-brand-light text-brand-dark text-[10px] font-mono"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
          </svg>
          {shortName(s.file_name)}
          {s.page_number != null && ` · p.${s.page_number}`}
        </span>
      ))}
    </div>
  )
}

// ── Typing Indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-1.5">
      <div className="h-6 w-6 rounded-lg bg-brand flex items-center justify-center shrink-0 shadow-sm">
        <span className="font-serif text-white text-xs font-bold leading-none select-none">L</span>
      </div>
      <div className="bg-surface border border-stone rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm">
        <div className="flex gap-1 items-center">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 bg-brand-mid rounded-full animate-bounce"
              style={{ animationDelay: `${i * 130}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}


// ── Message Bubble ────────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%]">
          <div className="bg-brand-light text-brand-dark rounded-2xl rounded-br-sm px-3 py-2 text-sm leading-relaxed shadow-sm whitespace-pre-wrap break-words">
            {msg.content}
          </div>
          <p className="text-right text-[10px] text-muted mt-0.5 pr-1">{formatTime(msg.created_at)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-1.5">
      <div className="h-6 w-6 rounded-lg bg-brand flex items-center justify-center shrink-0 shadow-sm self-start mt-0.5">
        <span className="font-serif text-white text-xs font-bold leading-none select-none">L</span>
      </div>
      <div className="max-w-[80%]">
        <div className="bg-surface border border-stone rounded-2xl rounded-bl-sm px-3 py-2 text-sm leading-relaxed shadow-sm whitespace-pre-wrap break-words text-ink-soft">
          {msg.content}
          <SourcePills sources={msg.sources} />
        </div>
        <p className="text-[10px] text-muted mt-0.5 pl-1">{formatTime(msg.created_at)}</p>
      </div>
    </div>
  )
}

// ── Error Screen ──────────────────────────────────────────────────────────────

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">Não foi possível carregar</p>
        <p className="text-xs text-muted mt-0.5 leading-relaxed">{message}</p>
      </div>
    </div>
  )
}

// ── Widget Inner (needs search params) ───────────────────────────────────────

function WidgetInner() {
  const params = useParams()
  const searchParams = useSearchParams()

  // Project ID comes from the URL path [id] OR from ?project_id= query param
  const projectId = (params.id as string) || searchParams.get('project_id') || ''
  const apiKey = searchParams.get('api_key') || ''
  const title = searchParams.get('title') || 'Assistente Lumi'
  const placeholder = searchParams.get('placeholder') || 'Faça uma pergunta…'
  const themeColor = searchParams.get('color') || '#0F6E56'

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [initError, setInitError] = useState('')
  const [ready, setReady] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Init ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!projectId) { setInitError('Parâmetro project_id ausente na URL.'); return }
    if (!apiKey) { setInitError('Parâmetro api_key ausente na URL.'); return }

    async function loadHistory() {
      try {
        const history = await apiFetch<ChatMessage[]>(
          `/${projectId}/history?limit=50`,
          apiKey,
        )
        setMessages(history)
        setReady(true)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido'
        if (msg.includes('401') || msg.includes('403') || msg.includes('Forbidden') || msg.includes('Unauthorized')) {
          setInitError('API key inválida ou sem permissão para acessar este projeto.')
        } else if (msg.includes('404')) {
          setInitError('Projeto não encontrado.')
        } else {
          // Non-fatal: history might just be empty for new projects
          setReady(true)
        }
      }
    }

    loadHistory()
  }, [projectId, apiKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-scroll ─────────────────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatLoading])

  // ── Send ────────────────────────────────────────────────────────────────

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || chatLoading || !ready) return

    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setChatLoading(true)

    const tempMsg: ChatMessage = {
      id: `tmp-${Date.now()}`,
      role: 'user',
      content: text,
      sources: [],
      created_at: new Date().toISOString(),
    }
    setMessages((p) => [...p, tempMsg])

    try {
      const resp = await apiFetch<{
        user_message: ChatMessage
        assistant_message: ChatMessage
      }>(`/${projectId}/chat`, apiKey, {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      })

      setMessages((p) => [
        ...p.filter((m) => m.id !== tempMsg.id),
        resp.user_message,
        resp.assistant_message,
      ])
    } catch (err: unknown) {
      setMessages((p) => p.filter((m) => m.id !== tempMsg.id))
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Desculpe, não consegui responder. ${err instanceof Error ? err.message : ''}`,
        sources: [],
        created_at: new Date().toISOString(),
      }
      setMessages((p) => [...p, errMsg])
    } finally {
      setChatLoading(false)
    }
  }, [input, chatLoading, ready, projectId, apiKey])

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`
  }

  if (initError) return <ErrorScreen message={initError} />

  return (
    <div className="flex flex-col h-full bg-surface font-sans">

      {/* ── Header ── */}
      <div
        className="shrink-0 flex items-center gap-2.5 px-4 py-3 shadow-sm"
        style={{ backgroundColor: themeColor }}
      >
        <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
          <span className="font-serif text-white text-base font-bold leading-none select-none">L</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-none truncate">{title}</p>
          <p className="text-xs text-white/70 mt-0.5 leading-none">Assistente de documentos</p>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-brand-mid shadow-sm" />
          <span className="text-xs text-white/80">Online</span>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-parchment">
        {!ready ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <span className="h-6 w-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-muted">Carregando…</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div
              className="h-12 w-12 rounded-2xl flex items-center justify-center"
              style={{ background: `${themeColor}1a` }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={themeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-ink-soft">Como posso ajudar?</p>
            <p className="text-xs text-muted leading-relaxed max-w-[200px]">
              Faça perguntas sobre os documentos deste projeto.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg) => <Bubble key={msg.id} msg={msg} />)}
            {chatLoading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div className="shrink-0 border-t border-stone bg-surface px-3 py-3">
        <div className={`flex items-end gap-2 p-2 rounded-xl border transition-all duration-150 ${input ? 'border-brand/50' : 'border-stone'}`}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKey}
            placeholder={!ready ? 'Carregando…' : placeholder}
            disabled={!ready || chatLoading}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none leading-relaxed disabled:cursor-not-allowed"
            style={{ maxHeight: '100px' }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || chatLoading || !ready}
            className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: input.trim() && ready && !chatLoading ? themeColor : '#e5e7eb',
              color: input.trim() && ready && !chatLoading ? 'white' : '#9ca3af',
            }}
          >
            {chatLoading ? (
              <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>

        {/* Branding */}
        <p className="text-center text-[10px] text-muted mt-2 leading-none">
          Powered by{' '}
          <span className="font-semibold font-serif" style={{ color: themeColor }}>Lore</span>
        </p>
      </div>
    </div>
  )
}

// ── Page export (wraps inner with Suspense for useSearchParams) ───────────────

export default function WidgetPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center bg-surface">
        <span className="h-6 w-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <WidgetInner />
    </Suspense>
  )
}
