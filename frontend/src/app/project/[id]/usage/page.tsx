'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Features } from '@/lib/features'
import LoreLogo from '@/components/LoreLogo'

// ── Types ─────────────────────────────────────────────────────────────────────

interface UsageSummary {
  total_questions: number
  total_sessions: number
  unique_users: number
  minutes_saved: number
  hours_saved: number
}

interface DailyUsage {
  date: string
  questions: number
}

interface TopQuestion {
  question: string
  count: number
}

interface UsageReport {
  period: string
  summary: UsageSummary
  top_questions: TopQuestion[]
  daily_usage: DailyUsage[]
  most_active_day: string | null
}

// ── API ───────────────────────────────────────────────────────────────────────

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000') + '/api/projects'

async function fetchUsage(projectId: string, token: string, period: string): Promise<UsageReport> {
  const res = await fetch(`${API_BASE}/${projectId}/usage?period=${period}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Erro ${res.status}`)
  }
  return res.json()
}

// ── Components ────────────────────────────────────────────────────────────────

function StatCard({ value, label, sub }: { value: string | number; label: string; sub?: string }) {
  return (
    <div className="bg-surface border border-stone rounded-2xl px-5 py-4 flex flex-col gap-1">
      <span className="text-2xl font-bold text-ink">{value}</span>
      <span className="text-sm font-medium text-ink-soft">{label}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  )
}

function BarChart({ data }: { data: DailyUsage[] }) {
  if (!data.length) return (
    <div className="h-32 flex items-center justify-center text-xs text-muted">Sem dados no período</div>
  )

  const max = Math.max(...data.map((d) => d.questions), 1)
  const last30 = data.slice(-30)

  return (
    <div className="flex items-end gap-0.5 h-28 w-full">
      {last30.map((d) => {
        const pct = Math.max((d.questions / max) * 100, d.questions > 0 ? 4 : 0)
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative" title={`${d.date}: ${d.questions} pergunta(s)`}>
            <div
              className="w-full rounded-sm bg-brand/70 group-hover:bg-brand transition-colors"
              style={{ height: `${pct}%`, minHeight: d.questions > 0 ? '3px' : '0' }}
            />
          </div>
        )
      })}
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function UsagePage() {
  const params = useParams()
  const router = useRouter()
  const rawSlug = params.id as string
  const projectId = rawSlug.length > 36 ? rawSlug.slice(-36) : rawSlug

  const supabase = createClient()
  const [token, setToken] = useState('')
  const [period, setPeriod] = useState('30d')
  const [report, setReport] = useState<UsageReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Gate de feature
  if (!Features.USAGE_REPORT) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center">
        <div className="text-center">
          <p className="text-ink font-semibold">Relatório de uso não disponível</p>
          <p className="text-muted text-sm mt-1">Esta feature ainda não foi ativada.</p>
          <Link href={`/dashboard`} className="mt-4 inline-block text-sm text-brand hover:underline">
            Voltar ao dashboard
          </Link>
        </div>
      </div>
    )
  }

  const load = useCallback(async (tk: string, p: string) => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchUsage(projectId, tk, p)
      setReport(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar relatório')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      setToken(session.access_token)
      load(session.access_token, period)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function changePeriod(p: string) {
    setPeriod(p)
    if (token) load(token, p)
  }

  const periods = [
    { value: '7d', label: '7 dias' },
    { value: '30d', label: '30 dias' },
    { value: '90d', label: '90 dias' },
    { value: 'all', label: 'Tudo' },
  ]

  return (
    <div className="min-h-screen bg-parchment">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface border-b border-stone shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link
            href={`/dashboard`}
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
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <h1 className="font-semibold text-ink text-sm">Relatório de Uso</h1>
          </div>

          {/* Period selector */}
          <div className="ml-auto flex items-center gap-1">
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => changePeriod(p.value)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                  ${period === p.value
                    ? 'bg-brand text-white'
                    : 'text-muted hover:text-ink hover:bg-stone/20'
                  }
                `}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-surface border border-stone rounded-2xl px-5 py-4">
                <div className="h-7 w-16 bg-stone/30 rounded animate-pulse mb-2" />
                <div className="h-3 w-24 bg-stone/20 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : report ? (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <StatCard
                value={report.summary.total_questions}
                label="Perguntas"
                sub={`nos últimos ${period === 'all' ? 'todo período' : period}`}
              />
              <StatCard
                value={report.summary.total_sessions}
                label="Sessões"
                sub="conversas iniciadas"
              />
              <StatCard
                value={report.summary.unique_users}
                label="Usuários únicos"
                sub="pessoas que perguntaram"
              />
              <StatCard
                value={`${report.summary.hours_saved}h`}
                label="Economizadas"
                sub={`≈ ${report.summary.minutes_saved} min (3 min/pergunta)`}
              />
            </div>

            {/* Chart */}
            <div className="bg-surface border border-stone rounded-2xl px-5 py-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-ink">Perguntas por dia</h2>
                {report.most_active_day && (
                  <span className="text-xs text-muted">
                    Dia mais ativo: <strong className="text-ink-soft">{formatDate(report.most_active_day)}</strong>
                  </span>
                )}
              </div>
              <BarChart data={report.daily_usage} />
              {report.daily_usage.length > 0 && (
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-muted">{formatDate(report.daily_usage[0].date)}</span>
                  <span className="text-xs text-muted">{formatDate(report.daily_usage[report.daily_usage.length - 1].date)}</span>
                </div>
              )}
            </div>

            {/* Top questions */}
            <div className="bg-surface border border-stone rounded-2xl px-5 py-5 mb-6">
              <h2 className="text-sm font-bold text-ink mb-4">Perguntas mais frequentes</h2>
              {report.top_questions.length === 0 ? (
                <p className="text-xs text-muted py-4 text-center">Nenhuma pergunta no período</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {report.top_questions.map((q, i) => {
                    const maxCount = report.top_questions[0]?.count || 1
                    const pct = Math.round((q.count / maxCount) * 100)
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-muted font-mono w-4 shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-ink truncate" title={q.question}>{q.question}</p>
                          <div className="mt-1 h-1 bg-stone/20 rounded-full overflow-hidden">
                            <div className="h-full bg-brand/60 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-brand shrink-0">{q.count}x</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Insights */}
            {report.summary.total_questions > 0 && (
              <div className="bg-brand-light border border-brand/20 rounded-2xl px-5 py-4">
                <div className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-brand-dark">Insights</p>
                    <p className="text-sm text-brand-dark/80 mt-1 leading-relaxed">
                      {report.top_questions.length > 0
                        ? `As perguntas mais frequentes giram em torno de "${report.top_questions[0].question.slice(0, 50)}...". Considere adicionar um documento que responda diretamente essas dúvidas para reduzir o tempo de resposta.`
                        : `Seu projeto recebeu ${report.summary.total_questions} pergunta(s) no período, economizando aproximadamente ${report.summary.hours_saved} hora(s) de pesquisa manual.`
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  )
}
