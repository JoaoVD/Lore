'use client'

import { useState, useEffect } from 'react'

interface Category {
  id: string
  name: string
  icon: string
}

interface Props {
  projectId: string
  token: string
  categories: Category[]
  onClose: () => void
  onSuccess: (template: Record<string, unknown>) => void
}

export function CreateTemplateModal({ projectId, token, categories, onClose, onSuccess }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [content, setContent] = useState('')
  const [detectedVars, setDetectedVars] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor')

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

  // Auto-detect variables from content
  useEffect(() => {
    const vars = [...new Set(
      (content.match(/\{\{(\w+)\}\}/g) ?? []).map((v) => v.slice(2, -2))
    )]
    setDetectedVars(vars)
  }, [content])

  async function handleSave() {
    if (!name.trim() || !content.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/legal/templates`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          category_id: categoryId || undefined,
          content,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail ?? `Erro ${res.status}`)
      }
      const data = await res.json()
      onSuccess(data)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar template.')
    } finally {
      setLoading(false)
    }
  }

  const canSave = name.trim().length > 0 && content.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone/40 shrink-0">
          <div>
            <h2 className="font-bold text-ink text-lg">Novo template jurídico</h2>
            <p className="text-xs text-ink/50 mt-0.5">Use {`{{variavel}}`} para criar campos preenchíveis</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-ink/40 hover:text-ink hover:bg-stone/20 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Name + category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-ink/70">
                Nome do template <span className="text-red-400">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Notificação Extrajudicial"
                className="text-sm border border-stone/40 rounded-xl px-3 py-2 focus:outline-none focus:border-brand/50 text-ink placeholder:text-ink/30"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-ink/70">Categoria</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="text-sm border border-stone/40 rounded-xl px-3 py-2 focus:outline-none focus:border-brand/50 text-ink bg-white"
              >
                <option value="">Selecione uma categoria</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-ink/70">Descrição (opcional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição de quando usar este template"
              className="text-sm border border-stone/40 rounded-xl px-3 py-2 focus:outline-none focus:border-brand/50 text-ink placeholder:text-ink/30"
            />
          </div>

          {/* Hint */}
          <div className="bg-brand-light border border-brand/20 rounded-xl p-3 text-xs text-brand-dark">
            <span className="font-semibold">Dica:</span> Use{' '}
            <code className="bg-brand/10 px-1 py-0.5 rounded font-mono">{`{{nome_cliente}}`}</code>,{' '}
            <code className="bg-brand/10 px-1 py-0.5 rounded font-mono">{`{{data}}`}</code>,{' '}
            <code className="bg-brand/10 px-1 py-0.5 rounded font-mono">{`{{valor}}`}</code>{' '}
            para criar campos que serão preenchidos ao usar o template.
          </div>

          {/* Editor / Preview tabs */}
          <div className="flex border-b border-stone/40 gap-1">
            {(['editor', 'preview'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-4 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                  activeTab === tab
                    ? 'border-brand text-brand'
                    : 'border-transparent text-ink/40 hover:text-ink'
                }`}
              >
                {tab === 'editor' ? 'Editor' : 'Preview'}
              </button>
            ))}
          </div>

          {activeTab === 'editor' ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`EXCELENTÍSSIMO SENHOR JUIZ...\n\n{{nome_cliente}}, {{nacionalidade}}...\n\nDigite seu template aqui usando {{variavel}} para campos preenchíveis.`}
              rows={16}
              className="w-full border border-stone/40 rounded-xl px-4 py-3 text-sm font-mono leading-relaxed focus:outline-none focus:border-brand/50 resize-none text-ink placeholder:text-ink/30"
            />
          ) : (
            <div className="bg-parchment rounded-xl p-5 font-mono text-sm leading-relaxed whitespace-pre-wrap border border-stone/30 min-h-64">
              {content ? (
                content.split(/(\{\{[^}]+\}\})/g).map((part, i) =>
                  part.match(/\{\{[^}]+\}\}/) ? (
                    <span key={i} className="bg-amber-100 text-amber-700 rounded px-1 border border-amber-200">
                      {part}
                    </span>
                  ) : (
                    <span key={i}>{part}</span>
                  )
                )
              ) : (
                <span className="text-ink/30">O preview aparece aqui conforme você digita...</span>
              )}
            </div>
          )}

          {/* Detected variables */}
          {detectedVars.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink/60 mb-2">
                Variáveis detectadas ({detectedVars.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {detectedVars.map((v) => (
                  <span
                    key={v}
                    className="bg-brand-light text-brand border border-brand/20 rounded-full px-3 py-1 text-xs font-medium"
                  >
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone/40 flex items-center justify-end gap-3 bg-surface shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-ink/60 border border-stone/40 rounded-xl hover:bg-stone/10 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !canSave}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-brand rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar template'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
