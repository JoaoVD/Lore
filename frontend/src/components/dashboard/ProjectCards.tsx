'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { DashboardProject } from '@/types'

// ── Helpers ────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

// ── Kebab Menu (shared) ────────────────────────────────────────────────────

function KebabMenu({ onDelete }: { onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v) }}
        className="h-7 w-7 flex items-center justify-center rounded-lg text-stone hover:text-ink hover:bg-stone/20 transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Opções"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 w-36 bg-surface border border-stone/40 rounded-xl shadow-lg py-1 text-sm">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); onDelete() }}
            className="w-full text-left px-4 py-2 text-red-500 hover:bg-red-50 transition-colors rounded-lg"
          >
            Excluir projeto
          </button>
        </div>
      )}
    </div>
  )
}

// ── Metric Card ────────────────────────────────────────────────────────────

type MetricColor = 'green' | 'red' | 'blue' | 'amber'

const METRIC_COLORS: Record<MetricColor, { bg: string; num: string; label: string }> = {
  green: { bg: 'bg-brand-light',   num: 'text-brand-dark',  label: 'text-brand'     },
  red:   { bg: 'bg-red-50',        num: 'text-red-700',     label: 'text-red-500'   },
  blue:  { bg: 'bg-blue-50',       num: 'text-blue-700',    label: 'text-blue-500'  },
  amber: { bg: 'bg-amber-50',      num: 'text-amber-700',   label: 'text-amber-500' },
}

export function MetricCard({ value, label, color }: { value: number; label: string; color: MetricColor }) {
  const c = METRIC_COLORS[color]
  return (
    <div className={`${c.bg} rounded-2xl p-5`}>
      <p className={`text-3xl font-bold ${c.num}`}>{value}</p>
      <p className={`text-sm mt-1 ${c.label}`}>{label}</p>
    </div>
  )
}

// ── Docs Project Card ──────────────────────────────────────────────────────

export function DocsProjectCard({
  project,
  onDelete,
}: {
  project: DashboardProject
  onDelete?: (id: string) => void
}) {
  const href = `/dashboard/${slugify(project.name)}--${project.id}`
  return (
    <Link
      href={href}
      className="group relative flex flex-col p-5 bg-white rounded-2xl border border-stone/30 hover:border-brand/30 hover:shadow-md transition-all duration-200 min-h-[140px]"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-brand-light rounded-xl flex items-center justify-center text-xl shrink-0">
          📄
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-brand-light text-brand">
            ● Ativo
          </span>
          {onDelete && <KebabMenu onDelete={() => onDelete(project.id)} />}
        </div>
      </div>
      <h3 className="font-semibold text-ink text-sm mb-1 group-hover:text-brand transition-colors line-clamp-1">
        {project.name}
      </h3>
      {project.description && (
        <p className="text-xs text-ink/50 line-clamp-1 mb-2">{project.description}</p>
      )}
      <div className="mt-auto pt-3 border-t border-stone/20 flex items-center gap-3 text-xs text-ink/40">
        <span>📄 {project.document_count ?? 0} docs</span>
        <span>💬 {project.question_count ?? 0} perguntas</span>
      </div>
    </Link>
  )
}

// ── Estoq Project Card ─────────────────────────────────────────────────────

export function EstoqProjectCard({
  project,
  onDelete,
}: {
  project: DashboardProject
  onDelete?: (id: string) => void
}) {
  const href = `/dashboard/${slugify(project.name)}--${project.id}`
  return (
    <Link
      href={href}
      className="group relative flex flex-col p-5 bg-white rounded-2xl border border-stone/30 hover:border-blue-300 hover:shadow-md transition-all duration-200 min-h-[140px]"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl shrink-0">
          📦
        </div>
        <div className="flex items-center gap-1">
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              project.api_connected ? 'bg-brand-light text-brand' : 'bg-amber-50 text-amber-600'
            }`}
          >
            ● {project.api_connected ? 'API Online' : 'Sem API'}
          </span>
          {onDelete && <KebabMenu onDelete={() => onDelete(project.id)} />}
        </div>
      </div>
      <h3 className="font-semibold text-ink text-sm mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">
        {project.name}
      </h3>
      <div className="mt-auto pt-3 border-t border-stone/20 flex items-center gap-3 text-xs text-ink/40">
        <span>🔌 {project.api_name ?? 'API não configurada'}</span>
        <span>💬 {project.question_count ?? 0} consultas</span>
      </div>
    </Link>
  )
}

// ── Legal Project Card ─────────────────────────────────────────────────────

export function LegalProjectCard({
  project,
  onDelete,
}: {
  project: DashboardProject
  onDelete?: (id: string) => void
}) {
  const hasUrgent = (project.urgent_deadlines ?? 0) > 0
  return (
    <Link
      href={`/project/${project.id}/legal`}
      className="group relative flex flex-col p-5 bg-white rounded-2xl border border-stone/30 hover:border-purple-300 hover:shadow-md transition-all duration-200 min-h-[140px]"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-xl shrink-0">
          ⚖️
        </div>
        <div className="flex items-center gap-1">
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              hasUrgent ? 'bg-red-50 text-red-600' : 'bg-brand-light text-brand'
            }`}
          >
            {hasUrgent
              ? `⚠️ ${project.urgent_deadlines} urgente${(project.urgent_deadlines ?? 0) > 1 ? 's' : ''}`
              : '● Ok'}
          </span>
          {onDelete && <KebabMenu onDelete={() => onDelete(project.id)} />}
        </div>
      </div>
      <h3 className="font-semibold text-ink text-sm mb-1 group-hover:text-purple-600 transition-colors line-clamp-1">
        {project.name}
      </h3>
      <div className="mt-auto pt-3 border-t border-stone/20 flex items-center gap-3 text-xs text-ink/40">
        <span>📋 {project.template_count ?? 0} templates</span>
        <span>⏰ {project.deadline_count ?? 0} prazos</span>
      </div>
    </Link>
  )
}
