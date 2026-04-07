'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import { ProjectHeader } from '@/components/project/ProjectHeader'
import { CreateTemplateModal } from '@/components/legal/CreateTemplateModal'
import { DeadlinesTab } from '@/components/legal/DeadlinesTab'
import type { Project } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Variable {
  key: string
  label: string
  type: 'text' | 'date' | 'textarea'
}

interface Template {
  id: string
  name: string
  description: string
  content: string
  variables: Variable[]
  is_default: boolean
  category_id?: string
  legal_template_categories: { id?: string; name: string; icon: string } | null
}

interface GeneratedDocument {
  id: string
  name: string
  content: string
  created_at: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: { file_name: string; page_number: number | null; score: number }[]
  created_at: string
}

// ── API ───────────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function apiFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Erro ${res.status}`)
  }
  return res.json()
}

// ── Template Card ─────────────────────────────────────────────────────────────

function TemplateCard({ template, onUse }: { template: Template; onUse: (t: Template) => void }) {
  const cat = template.legal_template_categories
  return (
    <div className="bg-white rounded-2xl p-6 border border-stone/30 shadow-sm hover:shadow-md hover:border-brand/30 transition-all duration-200 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          {cat && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand bg-brand-light px-2.5 py-1 rounded-full mb-2">
              {cat.icon} {cat.name}
            </span>
          )}
          <h3 className="font-bold text-ink text-base leading-snug">{template.name}</h3>
        </div>
      </div>
      {template.description && (
        <p className="text-sm text-ink/60 leading-relaxed">{template.description}</p>
      )}
      <p className="text-xs text-ink/40">{template.variables.length} variáveis</p>
      <button
        onClick={() => onUse(template)}
        className="mt-auto w-full bg-brand text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-brand-dark transition-colors duration-150"
      >
        Usar template
      </button>
    </div>
  )
}

// ── Fill Modal ─────────────────────────────────────────────────────────────────

function FillModal({
  template, projectId, token, onClose, onGenerated,
}: {
  template: Template; projectId: string; token: string
  onClose: () => void; onGenerated: (doc: GeneratedDocument) => void
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)
  const [useAi, setUseAi] = useState(false)
  const { toasts, toast, close } = useToast()

  const preview = template.variables.reduce((text, v) => {
    return text.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, 'g'), values[v.key] || `{{${v.key}}}`)
  }, template.content)

  async function handleGenerate() {
    setGenerating(true)
    try {
      const result = await apiFetch<GeneratedDocument>(
        `/api/projects/${projectId}/legal/generate`, token,
        { method: 'POST', body: JSON.stringify({ template_id: template.id, variables: values, use_ai: useAi }) }
      )
      onGenerated(result)
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Erro ao gerar documento.', 'error')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone/40 shrink-0">
          <div>
            <h2 className="font-bold text-ink text-lg">{template.name}</h2>
            <p className="text-xs text-ink/50 mt-0.5">{template.variables.length} campos para preencher</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-stone/20 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-full md:w-[380px] shrink-0 overflow-y-auto border-r border-stone/40 p-6 flex flex-col gap-4">
            {template.variables.map((v) => (
              <div key={v.key} className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-ink/70">{v.label}</label>
                {v.type === 'textarea' ? (
                  <textarea rows={3} value={values[v.key] ?? ''} onChange={(e) => setValues((prev) => ({ ...prev, [v.key]: e.target.value }))}
                    placeholder={v.label} className="text-sm border border-stone/40 rounded-xl px-3 py-2 focus:outline-none focus:border-brand/50 resize-none text-ink placeholder:text-ink/30" />
                ) : (
                  <input type={v.type === 'date' ? 'date' : 'text'} value={values[v.key] ?? ''} onChange={(e) => setValues((prev) => ({ ...prev, [v.key]: e.target.value }))}
                    placeholder={v.label} className="text-sm border border-stone/40 rounded-xl px-3 py-2 focus:outline-none focus:border-brand/50 text-ink placeholder:text-ink/30" />
                )}
              </div>
            ))}
            <div className="flex items-center gap-2 pt-2">
              <input id="use-ai" type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} className="accent-brand" />
              <label htmlFor="use-ai" className="text-xs text-ink/70 cursor-pointer">Preencher campos técnicos vazios com IA</label>
            </div>
            <button onClick={handleGenerate} disabled={generating}
              className="w-full bg-brand text-white text-sm font-semibold px-4 py-3 rounded-xl hover:bg-brand-dark transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {generating ? <><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Gerando...</> : 'Gerar documento'}
            </button>
          </div>
          <div className="hidden md:flex flex-1 flex-col overflow-hidden">
            <div className="px-6 py-3 border-b border-stone/40 shrink-0">
              <span className="text-xs font-semibold text-ink/50 uppercase tracking-wide">Preview</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="text-xs text-ink/70 leading-relaxed whitespace-pre-wrap font-mono">{preview}</pre>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} onClose={close} />
    </div>
  )
}

// ── Document Result Modal ──────────────────────────────────────────────────────

function DocumentResultModal({ doc, onClose }: { doc: GeneratedDocument; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone/40 shrink-0">
          <div>
            <h2 className="font-bold text-ink text-lg">Documento gerado</h2>
            <p className="text-xs text-ink/50 mt-0.5">{doc.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigator.clipboard.writeText(doc.content)}
              className="flex items-center gap-1.5 text-xs font-medium text-brand bg-brand-light px-3 py-1.5 rounded-lg hover:bg-brand/20 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copiar
            </button>
            <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-stone/20 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <pre className="text-sm text-ink leading-relaxed whitespace-pre-wrap font-mono">{doc.content}</pre>
        </div>
      </div>
    </div>
  )
}

// ── Chat Tab ──────────────────────────────────────────────────────────────────

const LEGAL_SUGGESTIONS = [
  'Quais são os prazos desta causa?',
  'Faça um resumo dos contratos',
  'Quais documentos vencem esta semana?',
]

function ChatTab({ projectId, token }: { projectId: string; token: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [chatLoading, setChatLoading] = useState(false)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toasts, toast, close } = useToast()

  useEffect(() => {
    apiFetch<ChatMessage[]>(`/api/projects/${projectId}/history?limit=50`, token)
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId, token])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatLoading])

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || chatLoading) return
    setInput('')
    setChatLoading(true)

    const temp: ChatMessage = { id: `tmp-${Date.now()}`, role: 'user', content: msg, sources: [], created_at: new Date().toISOString() }
    setMessages(prev => [...prev, temp])

    try {
      const res = await apiFetch<{ user_message: ChatMessage; assistant_message: ChatMessage }>(
        `/api/projects/${projectId}/chat`, token,
        { method: 'POST', body: JSON.stringify({ message: msg }) }
      )
      setMessages(prev => [...prev.filter(m => m.id !== temp.id), res.user_message, res.assistant_message])
    } catch (err: unknown) {
      setMessages(prev => prev.filter(m => m.id !== temp.id))
      toast(err instanceof Error ? err.message : 'Erro ao enviar mensagem.', 'error')
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-0 bg-white rounded-2xl border border-stone/30 overflow-hidden" style={{ minHeight: '500px' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4" style={{ minHeight: '400px', maxHeight: '600px' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="h-6 w-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <div className="h-14 w-14 rounded-2xl bg-purple-50 flex items-center justify-center text-2xl">⚖️</div>
            <div>
              <p className="font-semibold text-ink">Consulte seus documentos jurídicos</p>
              <p className="text-sm text-muted mt-1">Faça perguntas sobre os documentos do projeto</p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              {LEGAL_SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => sendMessage(s)}
                  className="px-4 py-2.5 rounded-xl bg-parchment border border-stone/50 text-sm text-muted text-left hover:border-brand/40 hover:text-ink transition-colors">
                  &ldquo;{s}&rdquo;
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start items-end gap-2'}`}>
                {msg.role === 'assistant' && (
                  <div className="h-7 w-7 rounded-lg bg-brand flex items-center justify-center shrink-0 self-start mt-1">
                    <span className="font-serif text-white text-sm font-bold leading-none">L</span>
                  </div>
                )}
                <div className={`max-w-[78%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-brand-light text-brand-dark rounded-br-sm'
                    : 'bg-surface border border-stone text-ink/80 rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex items-end gap-2">
                <div className="h-7 w-7 rounded-lg bg-brand flex items-center justify-center shrink-0">
                  <span className="font-serif text-white text-sm font-bold leading-none">L</span>
                </div>
                <div className="bg-surface border border-stone rounded-xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1 items-center h-4">
                    {[0,1,2].map(i => <span key={i} className="h-2 w-2 bg-brand-mid rounded-full animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-stone/30 px-4 py-4 bg-surface shrink-0">
        <div className={`flex items-end gap-3 p-3 bg-white rounded-2xl border transition-all shadow-sm ${input ? 'border-brand/50' : 'border-stone'}`}>
          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); const t = e.target; t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, 120)}px` }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Faça uma pergunta sobre os documentos..."
            rows={1}
            disabled={chatLoading}
            className="flex-1 resize-none bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none leading-relaxed disabled:cursor-not-allowed"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || chatLoading}
            className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
              input.trim() && !chatLoading ? 'bg-brand hover:bg-brand-dark text-white' : 'bg-stone/30 text-muted cursor-not-allowed'
            }`}
          >
            {chatLoading
              ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            }
          </button>
        </div>
      </div>
      <ToastContainer toasts={toasts} onClose={close} />
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LegalPage() {
  const params = useParams()
  const router = useRouter()
  const rawSlug = params.id as string
  const projectId = rawSlug.length > 36 ? rawSlug.slice(-36) : rawSlug
  const supabase = createClient()
  const { toasts, toast, close } = useToast()

  const [token, setToken] = useState('')
  const [projectName, setProjectName] = useState('')
  const [templates, setTemplates] = useState<Template[]>([])
  const [documents, setDocuments] = useState<GeneratedDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'templates' | 'documents' | 'deadlines' | 'chat'>('templates')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [generatedDoc, setGeneratedDoc] = useState<GeneratedDocument | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateTemplate, setShowCreateTemplate] = useState(false)

  const categories = useMemo(() => {
    const seen = new Set<string>()
    return templates
      .filter((t) => t.legal_template_categories?.name)
      .map((t) => ({
        id: t.category_id ?? t.legal_template_categories?.id ?? t.legal_template_categories!.name,
        name: t.legal_template_categories!.name,
        icon: t.legal_template_categories!.icon,
      }))
      .filter((c) => !seen.has(c.id) && seen.add(c.id))
  }, [templates])

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      setToken(session.access_token)

      try {
        const [tmpl, docs, projects] = await Promise.all([
          apiFetch<{ templates: Template[] }>(`/api/legal/templates?project_id=${projectId}`, session.access_token),
          apiFetch<{ documents: GeneratedDocument[] }>(`/api/projects/${projectId}/legal/documents`, session.access_token),
          apiFetch<Project[]>('/api/projects', session.access_token),
        ])
        setTemplates(tmpl.templates)
        setDocuments(docs.documents)
        const proj = projects.find(p => p.id === projectId)
        if (proj) setProjectName(proj.name)
      } catch (err: unknown) {
        toast(err instanceof Error ? err.message : 'Erro ao carregar dados.', 'error')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerated = useCallback((doc: GeneratedDocument) => {
    setDocuments((prev) => [doc, ...prev])
    setSelectedTemplate(null)
    setGeneratedDoc(doc)
  }, [])

  const handleTemplateCreated = useCallback((template: Record<string, unknown>) => {
    setTemplates((prev) => [template as unknown as Template, ...prev])
    toast('Template criado com sucesso!', 'success')
  }, [toast])

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const grouped = filteredTemplates.reduce<Record<string, Template[]>>((acc, t) => {
    const cat = t.legal_template_categories?.name ?? 'Outros'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(t)
    return acc
  }, {})

  const TABS = [
    { id: 'templates' as const,  label: `📋 Templates (${templates.length})` },
    { id: 'deadlines' as const,  label: '⏰ Prazos' },
    { id: 'documents' as const,  label: `📄 Gerados (${documents.length})` },
    { id: 'chat' as const,       label: '💬 Chat' },
  ]

  return (
    <>
      <div className="min-h-screen bg-parchment flex flex-col">
        <ProjectHeader projectName={projectName || 'Lore Jurídico'} projectId={projectId} icon="⚖️" />

        <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-8">
          {/* Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
            <div className="flex gap-1 bg-stone/20 rounded-xl p-1 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-150 whitespace-nowrap ${
                    activeTab === tab.id ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {activeTab === 'templates' && (
              <div className="flex items-center gap-3 sm:ml-auto">
                <div className="flex items-center gap-2 border border-stone/40 rounded-xl px-3 py-2 bg-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C8C6BC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input type="text" placeholder="Buscar templates..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-sm text-ink placeholder:text-ink/30 bg-transparent outline-none w-48" />
                </div>
                <button onClick={() => setShowCreateTemplate(true)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-white bg-brand px-4 py-2 rounded-xl hover:bg-brand-dark transition-colors shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Novo template
                </button>
              </div>
            )}
          </div>

          {/* Templates tab */}
          {activeTab === 'templates' && (
            loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1,2,3,4,5,6].map(i => <div key={i} className="bg-white rounded-2xl p-6 border border-stone/30 animate-pulse h-48" />)}
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                <div className="text-5xl">⚖️</div>
                <div>
                  <h3 className="font-semibold text-ink">Nenhum template encontrado</h3>
                  <p className="text-sm text-muted mt-1">Verifique se a feature Lore Jurídico está ativa.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-10">
                {Object.entries(grouped).map(([category, items]) => (
                  <div key={category}>
                    <h2 className="text-lg font-bold text-ink mb-4">{category}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {items.map(t => <TemplateCard key={t.id} template={t} onUse={setSelectedTemplate} />)}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Deadlines tab */}
          {activeTab === 'deadlines' && token && (
            <DeadlinesTab projectId={projectId} token={token} apiBase={API_BASE} />
          )}

          {/* Documents tab */}
          {activeTab === 'documents' && (
            documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                <div className="text-5xl">📄</div>
                <div>
                  <h3 className="font-semibold text-ink">Nenhum documento gerado ainda</h3>
                  <p className="text-sm text-muted mt-1">Use um template para gerar seu primeiro documento.</p>
                </div>
                <button onClick={() => setActiveTab('templates')}
                  className="bg-brand text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-brand-dark transition-colors">
                  Ver templates
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map(doc => (
                  <div key={doc.id} onClick={() => setGeneratedDoc(doc)}
                    className="bg-white rounded-xl px-5 py-4 border border-stone/30 flex items-center gap-4 hover:border-brand/30 transition-colors cursor-pointer">
                    <span className="text-2xl shrink-0">📄</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink text-sm truncate">{doc.name}</p>
                      <p className="text-xs text-ink/40 mt-0.5">{new Date(doc.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C8C6BC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Chat tab */}
          {activeTab === 'chat' && token && (
            <ChatTab projectId={projectId} token={token} />
          )}
        </main>
      </div>

      {selectedTemplate && token && (
        <FillModal template={selectedTemplate} projectId={projectId} token={token} onClose={() => setSelectedTemplate(null)} onGenerated={handleGenerated} />
      )}
      {generatedDoc && <DocumentResultModal doc={generatedDoc} onClose={() => setGeneratedDoc(null)} />}
      {showCreateTemplate && token && (
        <CreateTemplateModal projectId={projectId} token={token} categories={categories} onClose={() => setShowCreateTemplate(false)} onSuccess={handleTemplateCreated} />
      )}

      <ToastContainer toasts={toasts} onClose={close} />
    </>
  )
}
