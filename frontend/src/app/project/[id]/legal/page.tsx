'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import LoreLogo from '@/components/LoreLogo'
import { CreateTemplateModal } from '@/components/legal/CreateTemplateModal'
import { DeadlinesTab } from '@/components/legal/DeadlinesTab'

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
  template,
  projectId,
  token,
  onClose,
  onGenerated,
}: {
  template: Template
  projectId: string
  token: string
  onClose: () => void
  onGenerated: (doc: GeneratedDocument) => void
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)
  const [useAi, setUseAi] = useState(false)
  const { toasts, toast, close } = useToast()

  // Live preview
  const preview = template.variables.reduce((text, v) => {
    return text.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, 'g'), values[v.key] || `{{${v.key}}}`)
  }, template.content)

  async function handleGenerate() {
    setGenerating(true)
    try {
      const result = await apiFetch<GeneratedDocument>(
        `/api/projects/${projectId}/legal/generate`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({ template_id: template.id, variables: values, use_ai: useAi }),
        }
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
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone/40 shrink-0">
          <div>
            <h2 className="font-bold text-ink text-lg">{template.name}</h2>
            <p className="text-xs text-ink/50 mt-0.5">{template.variables.length} campos para preencher</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-stone/20 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Form */}
          <div className="w-full md:w-[380px] shrink-0 overflow-y-auto border-r border-stone/40 p-6 flex flex-col gap-4">
            {template.variables.map((v) => (
              <div key={v.key} className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-ink/70">{v.label}</label>
                {v.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={values[v.key] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [v.key]: e.target.value }))}
                    placeholder={v.label}
                    className="text-sm border border-stone/40 rounded-xl px-3 py-2 focus:outline-none focus:border-brand/50 resize-none text-ink placeholder:text-ink/30"
                  />
                ) : (
                  <input
                    type={v.type === 'date' ? 'date' : 'text'}
                    value={values[v.key] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [v.key]: e.target.value }))}
                    placeholder={v.label}
                    className="text-sm border border-stone/40 rounded-xl px-3 py-2 focus:outline-none focus:border-brand/50 text-ink placeholder:text-ink/30"
                  />
                )}
              </div>
            ))}

            <div className="flex items-center gap-2 pt-2">
              <input
                id="use-ai"
                type="checkbox"
                checked={useAi}
                onChange={(e) => setUseAi(e.target.checked)}
                className="accent-brand"
              />
              <label htmlFor="use-ai" className="text-xs text-ink/70 cursor-pointer">
                Preencher campos técnicos vazios com IA
              </label>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full bg-brand text-white text-sm font-semibold px-4 py-3 rounded-xl hover:bg-brand-dark transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Gerando...
                </>
              ) : (
                'Gerar documento'
              )}
            </button>
          </div>

          {/* Preview */}
          <div className="hidden md:flex flex-1 flex-col overflow-hidden">
            <div className="px-6 py-3 border-b border-stone/40 shrink-0 flex items-center justify-between">
              <span className="text-xs font-semibold text-ink/50 uppercase tracking-wide">Preview</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="text-xs text-ink/70 leading-relaxed whitespace-pre-wrap font-mono">
                {preview}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onClose={close} />
    </div>
  )
}

// ── Document Result Modal ──────────────────────────────────────────────────────

function DocumentResultModal({
  doc,
  onClose,
}: {
  doc: GeneratedDocument
  onClose: () => void
}) {
  function copyToClipboard() {
    navigator.clipboard.writeText(doc.content)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone/40 shrink-0">
          <div>
            <h2 className="font-bold text-ink text-lg">Documento gerado</h2>
            <p className="text-xs text-ink/50 mt-0.5">{doc.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 text-xs font-medium text-brand bg-brand-light px-3 py-1.5 rounded-lg hover:bg-brand/20 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copiar
            </button>
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-stone/20 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <pre className="text-sm text-ink leading-relaxed whitespace-pre-wrap font-mono">
            {doc.content}
          </pre>
        </div>
      </div>
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
  const [templates, setTemplates] = useState<Template[]>([])
  const [documents, setDocuments] = useState<GeneratedDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'templates' | 'documents' | 'deadlines'>('templates')
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
        const [tmpl, docs] = await Promise.all([
          apiFetch<{ templates: Template[] }>(
            `/api/legal/templates?project_id=${projectId}`,
            session.access_token
          ),
          apiFetch<{ documents: GeneratedDocument[] }>(
            `/api/projects/${projectId}/legal/documents`,
            session.access_token
          ),
        ])
        setTemplates(tmpl.templates)
        setDocuments(docs.documents)
      } catch (err: unknown) {
        toast(err instanceof Error ? err.message : 'Erro ao carregar templates.', 'error')
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

  // Group templates by category
  const grouped = filteredTemplates.reduce<Record<string, Template[]>>((acc, t) => {
    const cat = t.legal_template_categories?.name ?? 'Outros'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(t)
    return acc
  }, {})

  return (
    <>
      <div className="min-h-screen bg-parchment flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-surface border-b border-stone shadow-sm shrink-0">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
            <Link
              href="/dashboard"
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
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base">⚖️</span>
              <h1 className="font-semibold text-ink text-sm truncate">Lore Jurídico</h1>
            </div>
            <div className="hidden sm:flex items-center gap-2 ml-auto">
              <Link
                href={`/project/${projectId}/settings`}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-stone/20 transition-colors"
                title="Configurações do projeto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </Link>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-8">
          {/* Tabs + search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
            <div className="flex gap-1 bg-stone/20 rounded-xl p-1">
              {(['templates', 'documents', 'deadlines'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-150 ${
                    activeTab === tab ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
                  }`}
                >
                  {tab === 'templates'
                    ? `Templates (${templates.length})`
                    : tab === 'documents'
                    ? `Gerados (${documents.length})`
                    : '⏰ Prazos'}
                </button>
              ))}
            </div>
            {activeTab === 'templates' && (
              <div className="flex items-center gap-3 sm:ml-auto">
                <div className="flex items-center gap-2 border border-stone/40 rounded-xl px-3 py-2 bg-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C8C6BC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-sm text-ink placeholder:text-ink/30 bg-transparent outline-none w-48"
                  />
                </div>
                <button
                  onClick={() => setShowCreateTemplate(true)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-white bg-brand px-4 py-2 rounded-xl hover:bg-brand-dark transition-colors shrink-0"
                >
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
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 border border-stone/30 animate-pulse h-48" />
                ))}
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
                      {items.map((t) => (
                        <TemplateCard key={t.id} template={t} onUse={setSelectedTemplate} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
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
                <button
                  onClick={() => setActiveTab('templates')}
                  className="bg-brand text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-brand-dark transition-colors"
                >
                  Ver templates
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white rounded-xl px-5 py-4 border border-stone/30 flex items-center gap-4 hover:border-brand/30 transition-colors cursor-pointer"
                    onClick={() => setGeneratedDoc(doc)}
                  >
                    <span className="text-2xl shrink-0">📄</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink text-sm truncate">{doc.name}</p>
                      <p className="text-xs text-ink/40 mt-0.5">
                        {new Date(doc.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: 'long', year: 'numeric',
                        })}
                      </p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C8C6BC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Deadlines tab */}
          {activeTab === 'deadlines' && token && (
            <DeadlinesTab projectId={projectId} token={token} apiBase={API_BASE} />
          )}
        </main>
      </div>

      {/* Fill modal */}
      {selectedTemplate && token && (
        <FillModal
          template={selectedTemplate}
          projectId={projectId}
          token={token}
          onClose={() => setSelectedTemplate(null)}
          onGenerated={handleGenerated}
        />
      )}

      {/* Result modal */}
      {generatedDoc && (
        <DocumentResultModal
          doc={generatedDoc}
          onClose={() => setGeneratedDoc(null)}
        />
      )}

      {/* Create template modal */}
      {showCreateTemplate && token && (
        <CreateTemplateModal
          projectId={projectId}
          token={token}
          categories={categories}
          onClose={() => setShowCreateTemplate(false)}
          onSuccess={handleTemplateCreated}
        />
      )}

      <ToastContainer toasts={toasts} onClose={close} />
    </>
  )
}
