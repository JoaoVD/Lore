'use client'

import {
  useState, useEffect, useRef, useCallback,
} from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import LoreLogo from '@/components/LoreLogo'
import type { Project } from '@/types'

// ── Types ────────────────────────────────────────────────────────────────────

interface Document {
  id: string
  project_id: string
  file_name: string
  file_url: string
  chunks_count: number
  status: 'processing' | 'ready' | 'error'
  error_message: string | null
  created_at: string
}

interface Source {
  file_name: string
  page_number: number | null
  score: number
}

interface ChatMessage {
  id: string
  project_id: string
  role: 'user' | 'assistant'
  content: string
  sources: Source[]
  created_at: string
}

// ── API ───────────────────────────────────────────────────────────────────────

// Projects router is mounted at /api/projects (NOT /api/v1)
const PROJECTS_BASE =
  (process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') ?? 'http://localhost:8000') +
  '/api/projects'

async function apiFetch<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${PROJECTS_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    if (res.status === 204) return undefined as T
    const body = await res.json().catch(() => ({}))
    const detail = body.detail
    if (res.status === 402 && typeof detail === 'object' && detail !== null) {
      window.dispatchEvent(new CustomEvent('upgrade-required', { detail }))
    }
    throw new Error(
      typeof detail === 'object' && detail?.message ? detail.message : (detail ?? `Erro ${res.status}`)
    )
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// Upload via XHR to support progress events
function uploadFile(
  path: string,
  token: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<{ document_id: string; status: string; file_name: string }> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${PROJECTS_BASE}${path}`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        const body = JSON.parse(xhr.responseText || '{}')
        const detail = body.detail
        if (xhr.status === 402 && typeof detail === 'object' && detail !== null) {
          window.dispatchEvent(new CustomEvent('upgrade-required', { detail }))
        }
        const msg = typeof detail === 'object' && detail?.message ? detail.message : (detail ?? `Erro ${xhr.status}`)
        reject(new Error(msg))
      }
    }
    xhr.onerror = () => reject(new Error('Falha na conexão ao fazer upload.'))
    xhr.send(form)
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ALLOWED_EXTS = ['.pdf', '.docx', '.txt']
const MAX_MB = 20

function extIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const colors: Record<string, string> = {
    pdf: 'text-red-500', docx: 'text-blue-500', txt: 'text-stone',
  }
  return colors[ext ?? ''] ?? 'text-muted'
}


function shortName(name: string, max = 28) {
  if (name.length <= max) return name
  const ext = name.includes('.') ? '.' + name.split('.').pop() : ''
  return name.slice(0, max - ext.length - 1) + '…' + ext
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Document['status'] }) {
  if (status === 'ready') {
    return (
      <span title="Pronto" className="flex items-center justify-center h-5 w-5 rounded-full bg-brand-light">
        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span title="Erro no processamento" className="flex items-center justify-center h-5 w-5 rounded-full bg-[#F7C1C1]/40">
        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#A32D2D" strokeWidth="3" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </span>
    )
  }
  return (
    <span title="Processando..." className="flex items-center justify-center h-5 w-5">
      <span className="h-4 w-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </span>
  )
}

// ── Drop Zone ─────────────────────────────────────────────────────────────────

function DropZone({
  onFiles,
  uploading,
  progress,
  uploadingName,
}: {
  onFiles: (files: File[]) => void
  uploading: boolean
  progress: number
  uploadingName: string
}) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    onFiles(files)
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`
          relative rounded-xl border-2 border-dashed transition-all duration-150 cursor-pointer
          flex flex-col items-center justify-center gap-2 py-6 px-4 text-center
          ${dragging
            ? 'border-brand bg-brand/8 scale-[1.01]'
            : 'border-stone hover:border-brand/40 hover:bg-brand/5'
          }
          ${uploading ? 'pointer-events-none opacity-70' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_EXTS.join(',')}
          className="hidden"
          onChange={(e) => onFiles(Array.from(e.target.files ?? []))}
        />
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${dragging ? 'bg-brand/20' : 'bg-stone/20'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={dragging ? '#0F6E56' : '#C8C6BC'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold text-ink-soft">
            {dragging ? 'Solte aqui' : 'Arraste ou clique para enviar'}
          </p>
          <p className="text-xs text-muted mt-0.5">PDF, DOCX, TXT · máx. {MAX_MB}MB</p>
        </div>
      </div>

      {/* Progress bar */}
      {uploading && (
        <div className="mt-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted truncate max-w-[70%]">{shortName(uploadingName, 24)}</span>
            <span className="text-xs font-semibold text-brand">{progress}%</span>
          </div>
          <div className="h-1 w-full bg-stone/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Document Item ─────────────────────────────────────────────────────────────

function DocumentItem({
  doc,
  onRemove,
  removing,
}: {
  doc: Document
  onRemove: (id: string) => void
  removing: boolean
}) {
  return (
    <div className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-stone/10 transition-colors ${removing ? 'opacity-40 pointer-events-none' : ''}`}>
      {/* File icon */}
      <span className={`shrink-0 ${extIcon(doc.file_name)}`}>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
        </svg>
      </span>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate" title={doc.file_name}>
          {shortName(doc.file_name)}
        </p>
        <p className="text-xs text-muted mt-0.5">
          {doc.status === 'ready' && `${doc.chunks_count} trechos`}
          {doc.status === 'processing' && 'Processando…'}
          {doc.status === 'error' && (
            <span className="text-[#A32D2D]" title={doc.error_message ?? 'Erro desconhecido'}>
              Erro no processamento
            </span>
          )}
        </p>
      </div>

      {/* Status + remove */}
      <div className="flex items-center gap-1.5 shrink-0">
        <StatusBadge status={doc.status} />
        <button
          onClick={() => onRemove(doc.id)}
          title="Remover arquivo"
          className="h-6 w-6 rounded-lg flex items-center justify-center text-stone hover:text-[#A32D2D] hover:bg-[#F7C1C1]/30 transition-colors opacity-0 group-hover:opacity-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Typing Indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 justify-start">
      <div className="h-7 w-7 rounded-lg bg-brand flex items-center justify-center shrink-0 shadow-sm">
        <span className="font-serif text-white text-sm font-bold leading-none select-none">L</span>
      </div>
      <div className="bg-surface border border-stone rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 bg-brand-mid rounded-full animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Source Chips ──────────────────────────────────────────────────────────────

function SourceChips({
  sources,
  documents,
}: {
  sources: Source[]
  documents: Document[]
}) {
  if (!sources.length) return null

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {sources.map((s, i) => {
        const doc = documents.find((d) => d.file_name === s.file_name)
        const href = doc?.file_url
        const label = `${shortName(s.file_name, 22)}${s.page_number != null ? ` · p.${s.page_number}` : ''}`

        return href ? (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={`${s.file_name}${s.page_number != null ? ` — página ${s.page_number}` : ''}`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-brand-light hover:bg-brand/10 text-brand-dark font-mono text-xs transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            {label}
          </a>
        ) : (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone/30 text-muted font-mono text-xs"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            {label}
          </span>
        )
      })}
    </div>
  )
}

// ── Message Bubble ────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  documents,
}: {
  msg: ChatMessage
  documents: Document[]
}) {
  const isUser = msg.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%]">
          <div className="bg-brand-light text-brand-dark rounded-xl rounded-br-sm px-4 py-3 shadow-sm text-sm leading-relaxed whitespace-pre-wrap break-words">
            {msg.content}
          </div>
          <p className="text-right text-xs text-muted mt-1 pr-1">{formatTime(msg.created_at)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-2 justify-start">
      <div className="h-7 w-7 rounded-lg bg-brand flex items-center justify-center shrink-0 shadow-sm self-start mt-1">
        <span className="font-serif text-white text-sm font-bold leading-none select-none">L</span>
      </div>
      <div className="max-w-[78%]">
        <div className="bg-surface border border-stone rounded-xl rounded-tl-sm px-4 py-3 shadow-sm text-sm leading-relaxed whitespace-pre-wrap break-words text-ink-soft">
          {msg.content}
          <SourceChips sources={msg.sources} documents={documents} />
        </div>
        <p className="text-xs text-muted mt-1 pl-1">{formatTime(msg.created_at)}</p>
      </div>
    </div>
  )
}

// ── Chat Empty State ──────────────────────────────────────────────────────────

function ChatEmptyState({ hasDocuments }: { hasDocuments: boolean }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8 py-12">
      {hasDocuments ? (
        <>
          <div className="h-16 w-16 rounded-2xl bg-brand-light flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-ink">Pronto para responder</h3>
            <p className="text-sm text-muted mt-1 leading-relaxed">
              Faça uma pergunta sobre os documentos enviados.
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            {['Qual o tema principal?', 'Faça um resumo', 'Quais são as datas importantes?'].map((s) => (
              <div key={s} className="px-4 py-2.5 rounded-xl bg-surface border border-stone/50 text-sm text-muted text-left">
                &ldquo;{s}&rdquo;
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="h-16 w-16 rounded-2xl bg-amber-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-ink">Nenhum documento ainda</h3>
            <p className="text-sm text-muted mt-1 leading-relaxed">
              Envie um arquivo PDF, DOCX ou TXT para começar a conversa.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const supabase = createClient()
  const { toasts, toast, close } = useToast()

  // ── Session ──────────────────────────────────────────────────────────────
  const [token, setToken] = useState('')
  const [project, setProject] = useState<Project | null>(null)

  // ── Documents ────────────────────────────────────────────────────────────
  const [documents, setDocuments] = useState<Document[]>([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadingName, setUploadingName] = useState('')

  // Polling intervals per document
  const pollRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({})

  // ── Chat ─────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [chatLoading, setChatLoading] = useState(false)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Mobile tab state
  const [activeTab, setActiveTab] = useState<'docs' | 'chat'>('chat')

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      setToken(session.access_token)

      try {
        // Fetch project info (from projects list)
        const projects = await apiFetch<Project[]>('', session.access_token)
        const proj = projects.find((p) => p.id === projectId)
        if (!proj) { router.replace('/dashboard'); return }
        setProject(proj)

        // Fetch documents
        const docs = await apiFetch<Document[]>(`/${projectId}/files`, session.access_token)
        setDocuments(docs)

        // Start polling for any already-processing docs
        docs.filter((d) => d.status === 'processing').forEach((d) =>
          startPolling(d.id, session.access_token)
        )
      } catch (err: unknown) {
        toast(err instanceof Error ? err.message : 'Erro ao carregar dados.', 'error')
      } finally {
        setDocsLoading(false)
      }

      // Fetch chat history
      try {
        const history = await apiFetch<ChatMessage[]>(
          `/${projectId}/history?limit=100`,
          session.access_token,
        )
        setMessages(history)
      } catch {
        // history might be empty
      } finally {
        setHistoryLoading(false)
      }
    }

    init()

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      Object.values(pollRefs.current).forEach(clearInterval)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-scroll chat ──────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatLoading])

  // ── Polling ───────────────────────────────────────────────────────────────

  const startPolling = useCallback((docId: string, accessToken: string) => {
    if (pollRefs.current[docId]) return

    const interval = setInterval(async () => {
      try {
        const status = await apiFetch<{
          document_id: string; status: string; chunks_count: number; error_message: string | null
        }>(`/${projectId}/files/${docId}/status`, accessToken)

        if (status.status !== 'processing') {
          clearInterval(pollRefs.current[docId])
          delete pollRefs.current[docId]

          setDocuments((prev) =>
            prev.map((d) =>
              d.id === docId
                ? { ...d, status: status.status as Document['status'], chunks_count: status.chunks_count, error_message: status.error_message }
                : d
            )
          )

          if (status.status === 'ready') {
            toast('Documento processado e pronto para uso!', 'success')
          } else if (status.status === 'error') {
            toast(`Erro ao processar documento: ${status.error_message ?? 'Desconhecido'}`, 'error')
          }
        }
      } catch {
        // Ignore polling errors silently
      }
    }, 3000)

    pollRefs.current[docId] = interval
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Upload ────────────────────────────────────────────────────────────────

  const handleFiles = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return

    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTS.includes(ext)) {
      toast(`Tipo não suportado. Use: ${ALLOWED_EXTS.join(', ')}`, 'error')
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast(`Arquivo muito grande. Máximo: ${MAX_MB}MB`, 'error')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setUploadingName(file.name)

    try {
      const result = await uploadFile(
        `/${projectId}/upload`,
        token,
        file,
        setUploadProgress,
      )

      // Add to list with processing status
      const newDoc: Document = {
        id: result.document_id,
        project_id: projectId,
        file_name: result.file_name,
        file_url: '',
        chunks_count: 0,
        status: 'processing',
        error_message: null,
        created_at: new Date().toISOString(),
      }
      setDocuments((prev) => [newDoc, ...prev])
      startPolling(result.document_id, token)
      toast('Arquivo enviado! Processando em segundo plano…', 'info')
      setActiveTab('docs')
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Erro no upload.', 'error')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      setUploadingName('')
    }
  }, [token, projectId, startPolling]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Remove Document ───────────────────────────────────────────────────────

  const handleRemove = useCallback(async (docId: string) => {
    setRemovingIds((s) => new Set(s).add(docId))
    try {
      await apiFetch(`/${projectId}/files/${docId}`, token, { method: 'DELETE' })
      clearInterval(pollRefs.current[docId])
      delete pollRefs.current[docId]
      setDocuments((prev) => prev.filter((d) => d.id !== docId))
      toast('Arquivo removido.', 'info')
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Erro ao remover.', 'error')
      setRemovingIds((s) => { const n = new Set(s); n.delete(docId); return n })
    }
  }, [token, projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Chat Send ─────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || chatLoading) return

    const hasReady = documents.some((d) => d.status === 'ready')
    if (!hasReady) {
      toast('Aguarde o processamento de ao menos um documento antes de perguntar.', 'warning')
      return
    }

    setInput('')
    setChatLoading(true)

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: `tmp-${Date.now()}`,
      project_id: projectId,
      role: 'user',
      content: text,
      sources: [],
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      const response = await apiFetch<{ user_message: ChatMessage; assistant_message: ChatMessage }>(
        `/${projectId}/chat`,
        token,
        { method: 'POST', body: JSON.stringify({ message: text }) },
      )

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        response.user_message,
        response.assistant_message,
      ])
    } catch (err: unknown) {
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id))
      toast(err instanceof Error ? err.message : 'Erro ao enviar mensagem.', 'error')
    } finally {
      setChatLoading(false)
    }
  }, [input, chatLoading, documents, token, projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Auto-resize textarea
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const readyDocs = documents.filter((d) => d.status === 'ready')
  const hasDocuments = documents.length > 0

  return (
    <>
      <div className="min-h-screen bg-parchment flex flex-col">

        {/* ── Header ── */}
        <header className="sticky top-0 z-30 bg-surface border-b border-stone shadow-sm shrink-0">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">

            {/* Back */}
            <Link
              href="/dashboard"
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-stone/20 transition-colors shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
              </svg>
            </Link>

            {/* Logo */}
            <Link href="/dashboard" className="shrink-0">
              <LoreLogo layout="inline" size="h-7 w-7" showWordmark={false} />
            </Link>

            <div className="h-5 w-px bg-stone shrink-0" />

            {/* Project name */}
            <div className="flex items-center gap-2 min-w-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <h1 className="font-semibold text-ink text-sm truncate">
                {project?.name ?? 'Carregando...'}
              </h1>
            </div>

            {/* Right controls */}
            <div className="hidden sm:flex items-center gap-2 ml-auto">
              <span className="text-xs px-2.5 py-1 rounded-full bg-stone/30 text-muted font-medium">
                {readyDocs.length} doc{readyDocs.length !== 1 ? 's' : ''} prontos
              </span>
              <Link
                href={`/project/${projectId}/settings`}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-stone/20 transition-colors"
                title="Configurações do projeto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </Link>
            </div>
          </div>

          {/* Mobile tabs */}
          <div className="sm:hidden flex border-t border-stone">
            {(['docs', 'chat'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                  activeTab === tab
                    ? 'text-brand border-b-2 border-brand'
                    : 'text-muted hover:text-ink-soft'
                }`}
              >
                {tab === 'docs' ? `Documentos (${documents.length})` : 'Chat'}
              </button>
            ))}
          </div>
        </header>

        {/* ── Two-column layout ── */}
        <div className="flex-1 flex overflow-hidden max-w-[1400px] w-full mx-auto">

          {/* ── LEFT: Documents panel ── */}
          <aside
            className={`
              w-full sm:w-[300px] lg:w-[320px] shrink-0
              border-r border-stone bg-surface flex flex-col
              ${activeTab === 'chat' ? 'hidden sm:flex' : 'flex'}
            `}
          >
            {/* Panel header */}
            <div className="px-4 pt-5 pb-3 border-b border-stone/50 shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink">Documentos</h2>
                <span className="text-xs text-muted bg-stone/30 rounded-full px-2 py-0.5 font-medium">
                  {documents.length}
                </span>
              </div>
              {project?.description && (
                <p className="text-xs text-muted mt-1 leading-relaxed line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>

            {/* Upload zone */}
            <div className="px-4 py-4 border-b border-stone/50 shrink-0">
              <DropZone
                onFiles={handleFiles}
                uploading={uploading}
                progress={uploadProgress}
                uploadingName={uploadingName}
              />
            </div>

            {/* Document list */}
            <div className="flex-1 overflow-y-auto py-2">
              {docsLoading ? (
                <div className="flex flex-col gap-1 px-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl">
                      <div className="h-5 w-5 rounded bg-stone/30 animate-pulse shrink-0" />
                      <div className="flex-1 flex flex-col gap-1.5">
                        <div className="h-3 w-3/4 bg-stone/30 rounded animate-pulse" />
                        <div className="h-2.5 w-1/2 bg-stone/30 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C8C6BC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                  <p className="text-xs text-muted">Nenhum arquivo enviado</p>
                </div>
              ) : (
                <div className="flex flex-col px-2">
                  {documents.map((doc) => (
                    <DocumentItem
                      key={doc.id}
                      doc={doc}
                      onRemove={handleRemove}
                      removing={removingIds.has(doc.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* ── RIGHT: Chat panel ── */}
          <main
            className={`
              flex-1 flex flex-col min-w-0 bg-parchment
              ${activeTab === 'docs' ? 'hidden sm:flex' : 'flex'}
            `}
          >
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
              {historyLoading ? (
                <div className="flex flex-col gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start items-end gap-2'}`}>
                      {i % 2 !== 0 && <div className="h-7 w-7 rounded-full bg-stone/30 animate-pulse shrink-0" />}
                      <div className={`h-12 rounded-2xl bg-stone/30 animate-pulse ${i % 2 === 0 ? 'w-48' : 'w-64'}`} />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <ChatEmptyState hasDocuments={hasDocuments} />
              ) : (
                <div className="flex flex-col gap-4 max-w-3xl mx-auto">
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} msg={msg} documents={documents} />
                  ))}
                  {chatLoading && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>
              )}
              {!historyLoading && messages.length > 0 && (
                <div ref={messagesEndRef} />
              )}
            </div>

            {/* Chat input */}
            <div className="shrink-0 bg-surface border-t border-stone px-4 sm:px-6 py-4">
              <div className="max-w-3xl mx-auto">
                {/* No ready docs warning */}
                {!docsLoading && hasDocuments && readyDocs.length === 0 && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                    <span className="h-4 w-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
                    Aguardando processamento dos documentos...
                  </div>
                )}

                <div className={`flex items-end gap-3 p-3 bg-surface rounded-2xl border transition-all duration-150 shadow-sm ${input ? 'border-brand/50 shadow-brand/10' : 'border-stone'}`}>
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      !hasDocuments
                        ? 'Envie um documento para começar...'
                        : readyDocs.length === 0
                        ? 'Aguardando processamento...'
                        : 'Faça uma pergunta sobre seus documentos...'
                    }
                    disabled={!hasDocuments || readyDocs.length === 0 || chatLoading}
                    rows={1}
                    className="flex-1 resize-none bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none leading-relaxed disabled:cursor-not-allowed"
                    style={{ maxHeight: '140px' }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || chatLoading || !hasDocuments || readyDocs.length === 0}
                    className={`
                      h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150
                      ${input.trim() && readyDocs.length > 0 && !chatLoading
                        ? 'bg-brand hover:bg-brand-dark text-white shadow-sm'
                        : 'bg-stone/30 text-muted cursor-not-allowed'
                      }
                    `}
                    aria-label="Enviar"
                  >
                    {chatLoading ? (
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-center text-xs text-muted mt-2">
                  Enter para enviar · Shift+Enter para nova linha
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>

      <ToastContainer toasts={toasts} onClose={close} />
    </>
  )
}
