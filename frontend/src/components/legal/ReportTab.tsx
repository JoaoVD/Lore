'use client'

import { useState, useEffect } from 'react'

interface ReportData {
  period: string
  summary: {
    documents_generated: number
    deadlines_met: number
    deadlines_pending: number
    deadlines_overdue: number
    active_clients: number
  }
  top_templates: { name: string; count: number }[]
  daily_documents: { date: string; count: number }[]
}

interface Props {
  projectId: string
  token: string
  apiBase: string
}

function MetricBox({ value, label, color = '#0F6E56' }: { value: number; label: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-stone/30 px-5 py-4 flex flex-col gap-1 min-w-0">
      <span style={{ fontSize: '28px', fontWeight: 600, color, lineHeight: 1 }}>{value}</span>
      <span className="text-xs text-ink/50 leading-snug">{label}</span>
    </div>
  )
}

function BarChart({ data }: { data: { date: string; count: number }[] }) {
  if (!data.length) return <p className="text-sm text-ink/40 text-center py-8">Sem dados no período.</p>

  const max = Math.max(...data.map(d => d.count), 1)

  return (
    <div className="flex items-end gap-1.5 h-32 w-full overflow-x-auto">
      {data.map(d => {
        const height = Math.max((d.count / max) * 100, 4)
        const label = new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        return (
          <div key={d.date} className="flex flex-col items-center gap-1 flex-1 min-w-[28px]" title={`${label}: ${d.count}`}>
            <span className="text-[10px] text-ink/40">{d.count > 0 ? d.count : ''}</span>
            <div style={{ height: `${height}%`, background: '#0F6E56', opacity: 0.75, borderRadius: '4px 4px 0 0', minHeight: '4px', width: '100%' }} />
            <span className="text-[9px] text-ink/30 whitespace-nowrap">{label}</span>
          </div>
        )
      })}
    </div>
  )
}

export function ReportTab({ projectId, token, apiBase }: Props) {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`${apiBase}/api/projects/${projectId}/legal/report?period=${period}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId, token, apiBase, period])

  return (
    <div className="flex flex-col gap-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-ink text-base">📊 Relatório de atividade</h2>
        <div className="flex gap-1 bg-stone/20 rounded-xl p-1">
          {(['7d', '30d', '90d'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${period === p ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>
              {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="h-6 w-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <p className="text-sm text-muted text-center py-16">Erro ao carregar relatório.</p>
      ) : (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricBox value={data.summary.documents_generated} label="Documentos gerados" />
            <MetricBox value={data.summary.deadlines_met} label="Prazos cumpridos" color="#0F6E56" />
            <MetricBox value={data.summary.deadlines_overdue} label="Prazos vencidos" color={data.summary.deadlines_overdue > 0 ? '#ef4444' : '#0F6E56'} />
            <MetricBox value={data.summary.active_clients} label="Clientes ativos" color="#7F77DD" />
          </div>

          {/* Bar chart */}
          <div className="bg-white rounded-xl border border-stone/30 p-5">
            <p className="text-sm font-semibold text-ink mb-4">📈 Documentos gerados por dia</p>
            <BarChart data={data.daily_documents} />
          </div>

          {/* Top templates */}
          {data.top_templates.length > 0 && (
            <div className="bg-white rounded-xl border border-stone/30 p-5">
              <p className="text-sm font-semibold text-ink mb-4">📋 Templates mais utilizados</p>
              <div className="flex flex-col gap-3">
                {data.top_templates.map((t, i) => (
                  <div key={t.name} className="flex items-center gap-3">
                    <span className="text-xs text-ink/40 w-4 text-right shrink-0">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-ink truncate">{t.name}</span>
                        <span className="text-xs text-ink/40 shrink-0 ml-2">{t.count}x</span>
                      </div>
                      <div className="h-1.5 bg-stone/20 rounded-full overflow-hidden">
                        <div style={{ width: `${(t.count / data.top_templates[0].count) * 100}%`, background: '#0F6E56', height: '100%', borderRadius: '99px' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
