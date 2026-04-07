'use client'

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

// ── Metric Card ────────────────────────────────────────────────────────────

type MetricColor = 'green' | 'red' | 'blue' | 'amber'

const METRIC_COLORS: Record<MetricColor, { bg: string; num: string; label: string }> = {
  green: { bg: 'bg-brand-light',   num: 'text-brand-dark',  label: 'text-brand'     },
  red:   { bg: 'bg-red-50',        num: 'text-red-700',     label: 'text-red-500'   },
  blue:  { bg: 'bg-blue-50',       num: 'text-blue-700',    label: 'text-blue-500'  },
  amber: { bg: 'bg-amber-50',      num: 'text-amber-700',   label: 'text-amber-500' },
}

export function MetricCard({
  value,
  label,
  color,
}: {
  value: number
  label: string
  color: MetricColor
}) {
  const c = METRIC_COLORS[color]
  return (
    <div className={`${c.bg} rounded-2xl p-5`}>
      <p className={`text-3xl font-bold ${c.num}`}>{value}</p>
      <p className={`text-sm mt-1 ${c.label}`}>{label}</p>
    </div>
  )
}

// ── Docs Project Card ──────────────────────────────────────────────────────

export function DocsProjectCard({ project }: { project: DashboardProject }) {
  const href = `/dashboard/${slugify(project.name)}--${project.id}`
  return (
    <Link
      href={href}
      className="group flex flex-col p-5 bg-white rounded-2xl border border-stone/30 hover:border-brand/30 hover:shadow-md transition-all duration-200 min-h-[140px]"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-brand-light rounded-xl flex items-center justify-center text-xl shrink-0">
          📄
        </div>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-brand-light text-brand shrink-0">
          ● Ativo
        </span>
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

export function EstoqProjectCard({ project }: { project: DashboardProject }) {
  const href = `/dashboard/${slugify(project.name)}--${project.id}`
  return (
    <Link
      href={href}
      className="group flex flex-col p-5 bg-white rounded-2xl border border-stone/30 hover:border-blue-300 hover:shadow-md transition-all duration-200 min-h-[140px]"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl shrink-0">
          📦
        </div>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${
            project.api_connected
              ? 'bg-brand-light text-brand'
              : 'bg-amber-50 text-amber-600'
          }`}
        >
          ● {project.api_connected ? 'API Online' : 'Sem API'}
        </span>
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

export function LegalProjectCard({ project }: { project: DashboardProject }) {
  const hasUrgent = (project.urgent_deadlines ?? 0) > 0
  return (
    <Link
      href={`/project/${project.id}/legal`}
      className="group flex flex-col p-5 bg-white rounded-2xl border border-stone/30 hover:border-purple-300 hover:shadow-md transition-all duration-200 min-h-[140px]"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-xl shrink-0">
          ⚖️
        </div>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${
            hasUrgent ? 'bg-red-50 text-red-600' : 'bg-brand-light text-brand'
          }`}
        >
          {hasUrgent
            ? `⚠️ ${project.urgent_deadlines} urgente${(project.urgent_deadlines ?? 0) > 1 ? 's' : ''}`
            : '● Ok'}
        </span>
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
