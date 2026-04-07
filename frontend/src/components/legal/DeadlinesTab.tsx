'use client'

import { useState, useEffect } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────

export interface Deadline {
  id: string
  title: string
  description?: string
  deadline_date: string
  process_number?: string
  category: 'prazo' | 'audiencia' | 'pericia' | 'recurso'
  status: 'pending' | 'done' | 'overdue'
  alert_days: number
  days_remaining: number
  urgency: 'overdue' | 'urgent' | 'ok'
  created_at: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  prazo: 'Prazo',
  audiencia: 'Audiência',
  pericia: 'Perícia',
  recurso: 'Recurso',
}

const CATEGORY_COLORS: Record<string, string> = {
  prazo: 'bg-blue-50 text-blue-700 border-blue-200',
  audiencia: 'bg-purple-50 text-purple-700 border-purple-200',
  pericia: 'bg-orange-50 text-orange-700 border-orange-200',
  recurso: 'bg-red-50 text-red-700 border-red-200',
}

function daysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)} dia${Math.abs(days) !== 1 ? 's' : ''} em atraso`
  if (days === 0) return 'Vence hoje'
  if (days === 1) return '1 dia restante'
  return `${days} dias restantes`
}

function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

// ── Deadline Card ──────────────────────────────────────────────────────────

function DeadlineCard({
  deadline,
  onMarkDone,
  onDelete,
}: {
  deadline: Deadline
  onMarkDone: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [loadingDone, setLoadingDone] = useState(false)
  const [loadingDel, setLoadingDel] = useState(false)

  const isOverdue = deadline.urgency === 'overdue'
  const isUrgent = deadline.urgency === 'urgent'

  return (
    <div
      className={`bg-white rounded-xl border px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors ${
        isOverdue
          ? 'border-red-200 bg-red-50/30'
          : isUrgent
          ? 'border-amber-200 bg-amber-50/30'
          : 'border-stone/30 hover:border-brand/30'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-semibold text-sm text-ink truncate">{deadline.title}</span>
          <span
            className={`text-xs font-medium border rounded-full px-2 py-0.5 shrink-0 ${
              CATEGORY_COLORS[deadline.category] ?? CATEGORY_COLORS.prazo
            }`}
          >
            {CATEGORY_LABELS[deadline.category] ?? deadline.category}
          </span>
        </div>
        <p className="text-xs text-ink/50">
          Vence: {formatDate(deadline.deadline_date)}
          {' · '}
          <span
            className={
              isOverdue ? 'text-red-600 font-medium' : isUrgent ? 'text-amber-600 font-medium' : 'text-ink/50'
            }
          >
            {daysLabel(deadline.days_remaining)}
          </span>
          {deadline.process_number && (
            <span className="text-ink/40"> · Proc. {deadline.process_number}</span>
          )}
        </p>
        {deadline.description && (
          <p className="text-xs text-ink/40 mt-0.5 truncate">{deadline.description}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={async () => {
            setLoadingDone(true)
            await onMarkDone(deadline.id)
            setLoadingDone(false)
          }}
          disabled={loadingDone}
          className="flex items-center gap-1.5 text-xs font-medium text-brand bg-brand-light border border-brand/20 px-3 py-1.5 rounded-lg hover:bg-brand/20 transition-colors disabled:opacity-50"
        >
          {loadingDone ? (
            <span className="h-3 w-3 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          Concluído
        </button>
        <button
          onClick={async () => {
            setLoadingDel(true)
            await onDelete(deadline.id)
            setLoadingDel(false)
          }}
          disabled={loadingDel}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-ink/30 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
          title="Remover prazo"
        >
          {loadingDel ? (
            <span className="h-3 w-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Group Section ──────────────────────────────────────────────────────────

function DeadlineGroup({
  label,
  color,
  deadlines,
  onMarkDone,
  onDelete,
}: {
  label: string
  color: 'red' | 'amber' | 'green' | 'gray'
  deadlines: Deadline[]
  onMarkDone: (id: string) => void
  onDelete: (id: string) => void
}) {
  if (deadlines.length === 0) return null

  const dotColors = {
    red: 'bg-red-500',
    amber: 'bg-amber-400',
    green: 'bg-green-500',
    gray: 'bg-stone',
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${dotColors[color]}`} />
        <h3 className="text-xs font-bold text-ink/50 uppercase tracking-widest">
          {label} ({deadlines.length})
        </h3>
      </div>
      {deadlines.map((d) => (
        <DeadlineCard key={d.id} deadline={d} onMarkDone={onMarkDone} onDelete={onDelete} />
      ))}
    </div>
  )
}

// ── Create Modal ───────────────────────────────────────────────────────────

function CreateDeadlineModal({
  projectId,
  token,
  apiBase,
  onClose,
  onCreated,
}: {
  projectId: string
  token: string
  apiBase: string
  onClose: () => void
  onCreated: (d: Deadline) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadlineDate, setDeadlineDate] = useState('')
  const [processNumber, setProcessNumber] = useState('')
  const [category, setCategory] = useState('prazo')
  const [alertDays, setAlertDays] = useState(3)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!title.trim() || !deadlineDate) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${apiBase}/api/projects/${projectId}/legal/deadlines`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          deadline_date: deadlineDate,
          process_number: processNumber.trim() || undefined,
          category,
          alert_days: alertDays,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail ?? `Erro ${res.status}`)
      }
      const data: Deadline = await res.json()
      onCreated(data)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar prazo.')
    } finally {
      setLoading(false)
    }
  }

  const canSave = title.trim().length > 0 && deadlineDate.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone/40 shrink-0">
          <h2 className="font-bold text-ink text-lg">Novo prazo processual</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-ink/40 hover:text-ink hover:bg-stone/20 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-ink/70">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Contestação, Audiência de Instrução..."
              className="text-sm border border-stone/40 rounded-xl px-3 py-2 focus:outline-none focus:border-brand/50 text-ink placeholder:text-ink/30"
            />
          </div>

          {/* Date + Alert days */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-ink/70">
                Data do prazo <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="text-sm border border-stone/40 rounded-xl px-3 py-2 focus:outline-none focus:border-brand/50 text-ink"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-ink/70">Alertar X dias antes</label>
              <input
                type="number"
                min={1}
                max={30}
                value={alertDays}
                onChange={(e) => setAlertDays(Number(e.target.value))}
                className="text-sm border border-stone/40 rounded-xl px-3 py-2 focus:outline-none focus:border-brand/50 text-ink"
              />
            </div>
          </div>

          {/* Category + Process number */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-ink/70">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="text-sm border border-stone/40 rounded-xl px-3 py-2 focus:outline-none focus:border-brand/50 text-ink bg-white"
              >
                <option value="prazo">Prazo</option>
                <option value="audiencia">Audiência</option>
                <option value="pericia">Perícia</option>
                <option value="recurso">Recurso</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-ink/70">Número do processo</label>
              <input
                value={processNumber}
                onChange={(e) => setProcessNumber(e.target.value)}
                placeholder="0001234-12.2025..."
                className="text-sm border border-stone/40 rounded-xl px-3 py-2 focus:outline-none focus:border-brand/50 text-ink placeholder:text-ink/30"
              />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-ink/70">Descrição (opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes adicionais sobre este prazo..."
              rows={2}
              className="text-sm border border-stone/40 rounded-xl px-3 py-2 focus:outline-none focus:border-brand/50 text-ink placeholder:text-ink/30 resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-stone/40 flex justify-end gap-3 bg-surface shrink-0">
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
              'Salvar prazo'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Tab Component ─────────────────────────────────────────────────────

export function DeadlinesTab({
  projectId,
  token,
  apiBase,
}: {
  projectId: string
  token: string
  apiBase: string
}) {
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    if (!token) return
    fetch(`${apiBase}/api/projects/${projectId}/legal/deadlines`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setDeadlines(data.deadlines ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [projectId, token, apiBase])

  async function handleMarkDone(id: string) {
    await fetch(`${apiBase}/api/projects/${projectId}/legal/deadlines/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })
    setDeadlines((prev) => prev.filter((d) => d.id !== id))
  }

  async function handleDelete(id: string) {
    await fetch(`${apiBase}/api/projects/${projectId}/legal/deadlines/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setDeadlines((prev) => prev.filter((d) => d.id !== id))
  }

  const pending = deadlines.filter((d) => d.status === 'pending')
  const overdue = pending.filter((d) => d.urgency === 'overdue')
  const urgent = pending.filter((d) => d.urgency === 'urgent')
  const upcoming = pending.filter((d) => d.urgency === 'ok' && d.days_remaining <= 7)
  const future = pending.filter((d) => d.urgency === 'ok' && d.days_remaining > 7)

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-stone/30 h-16 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-ink/50">
          {overdue.length > 0 && (
            <span className="text-red-600 font-semibold">{overdue.length} vencido{overdue.length !== 1 ? 's' : ''}</span>
          )}
          {overdue.length > 0 && urgent.length > 0 && <span className="mx-1">·</span>}
          {urgent.length > 0 && (
            <span className="text-amber-600 font-semibold">{urgent.length} urgente{urgent.length !== 1 ? 's' : ''}</span>
          )}
          {(overdue.length > 0 || urgent.length > 0) && upcoming.length > 0 && <span className="mx-1">·</span>}
          {upcoming.length > 0 && <span>{upcoming.length} próximo{upcoming.length !== 1 ? 's' : ''}</span>}
          {pending.length === 0 && <span>Nenhum prazo pendente</span>}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 text-sm font-semibold text-white bg-brand px-4 py-2 rounded-xl hover:bg-brand-dark transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Novo prazo
        </button>
      </div>

      {pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="text-5xl">⏰</div>
          <div>
            <h3 className="font-semibold text-ink">Nenhum prazo cadastrado</h3>
            <p className="text-sm text-ink/50 mt-1">Adicione prazos e audiências para receber alertas de urgência.</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-brand text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-brand-dark transition-colors"
          >
            Cadastrar primeiro prazo
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          <DeadlineGroup label="Vencido" color="red" deadlines={overdue} onMarkDone={handleMarkDone} onDelete={handleDelete} />
          <DeadlineGroup label="Urgente" color="amber" deadlines={urgent} onMarkDone={handleMarkDone} onDelete={handleDelete} />
          <DeadlineGroup label="Próximos 7 dias" color="amber" deadlines={upcoming} onMarkDone={handleMarkDone} onDelete={handleDelete} />
          <DeadlineGroup label="Futuros" color="green" deadlines={future} onMarkDone={handleMarkDone} onDelete={handleDelete} />
        </div>
      )}

      {showCreate && (
        <CreateDeadlineModal
          projectId={projectId}
          token={token}
          apiBase={apiBase}
          onClose={() => setShowCreate(false)}
          onCreated={(d) => setDeadlines((prev) => [d, ...prev])}
        />
      )}
    </>
  )
}
