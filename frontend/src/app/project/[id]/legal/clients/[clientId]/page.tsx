'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ToastContainer, useToast } from '@/components/ui/Toast'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Deadline { id: string; title: string; deadline_date: string; status: string; category: string }
interface Document  { id: string; name: string; created_at: string }

interface Case {
  id: string
  title: string
  process_number: string | null
  area: string | null
  status: 'ativo' | 'encerrado' | 'suspenso'
  description: string | null
  tribunal?: string | null
  last_sync?: string | null
  legal_deadlines: Deadline[]
  legal_documents: Document[]
}

interface ClientData {
  id: string
  name: string
  cpf_cnpj: string | null
  email: string | null
  phone: string | null
  type: 'pessoa_fisica' | 'pessoa_juridica'
  notes: string | null
}

const TRIBUNAIS = [
  { key: 'TRT15', name: 'TRT 15ª Região (Campinas)' },
  { key: 'TRT2',  name: 'TRT 2ª Região (São Paulo)' },
  { key: 'TJSP',  name: 'TJSP' },
  { key: 'TRF3',  name: 'TRF 3ª Região' },
  { key: 'STJ',   name: 'STJ' },
]

const AREAS = ['trabalhista', 'civil', 'familia', 'previdenciario', 'tributario', 'criminal']

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// ── New Case Modal ─────────────────────────────────────────────────────────────

function NewCaseModal({
  projectId, clientId, token, onClose, onCreated,
}: { projectId: string; clientId: string; token: string; onClose: () => void; onCreated: (c: Case) => void }) {
  const [form, setForm] = useState({ title: '', process_number: '', area: '', description: '' })
  const [loading, setLoading] = useState(false)
  const { toasts, toast, close } = useToast()
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { toast('Informe o título do processo.', 'error'); return }
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/legal/cases`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, client_id: clientId }),
      })
      if (!res.ok) throw new Error((await res.json()).detail ?? 'Erro')
      const c = await res.json()
      onCreated({ ...c, legal_deadlines: [], legal_documents: [] })
      onClose()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Erro ao criar processo.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone/40">
          <h2 className="font-bold text-ink text-base">Novo processo</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-stone/20">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-3">
          <input className="border border-stone/40 rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand/50" placeholder="Título do processo *" value={form.title} onChange={e => set('title', e.target.value)} />
          <input className="border border-stone/40 rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand/50" placeholder="Número do processo (ex: 0001234-12.2025.5.15.0001)" value={form.process_number} onChange={e => set('process_number', e.target.value)} />
          <select className="border border-stone/40 rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand/50 bg-white" value={form.area} onChange={e => set('area', e.target.value)}>
            <option value="">Área jurídica (opcional)</option>
            {AREAS.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
          </select>
          <textarea className="border border-stone/40 rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand/50 resize-none" placeholder="Descrição (opcional)" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl border border-stone/40 text-sm text-muted hover:text-ink transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark disabled:opacity-60">
              {loading ? 'Salvando...' : 'Criar processo'}
            </button>
          </div>
        </form>
      </div>
      <ToastContainer toasts={toasts} onClose={close} />
    </div>
  )
}

// ── Sync PJe Modal ────────────────────────────────────────────────────────────

function SyncPjeModal({
  projectId, caseData, token, onClose, onSynced,
}: { projectId: string; caseData: Case; token: string; onClose: () => void; onSynced: () => void }) {
  const [tribunal, setTribunal] = useState(caseData.tribunal ?? '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number; found: number; warning?: string } | null>(null)
  const { toasts, toast, close } = useToast()

  async function handleSync() {
    if (!tribunal) { toast('Selecione o tribunal.', 'error'); return }
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/legal/cases/${caseData.id}/sync-pje`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tribunal }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? 'Erro')
      setResult(data)
      onSynced()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Erro ao sincronizar.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone/40">
          <h2 className="font-bold text-ink text-base">🔄 Sincronizar com tribunal</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-stone/20">×</button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div>
            <p className="text-xs text-ink/50 mb-1">Processo</p>
            <p className="text-sm font-medium text-ink">{caseData.process_number ?? 'Sem número cadastrado'}</p>
          </div>
          <div>
            <label className="text-xs text-ink/50 mb-1 block">Tribunal</label>
            <select className="w-full border border-stone/40 rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand/50 bg-white" value={tribunal} onChange={e => setTribunal(e.target.value)}>
              <option value="">Selecione o tribunal...</option>
              {TRIBUNAIS.map(t => <option key={t.key} value={t.key}>{t.name}</option>)}
            </select>
          </div>

          {result ? (
            <div className={`rounded-xl p-4 text-sm ${result.imported > 0 ? 'bg-brand-light text-brand-dark' : 'bg-stone/10 text-ink/60'}`}>
              {result.imported > 0
                ? `✅ ${result.imported} prazo${result.imported > 1 ? 's' : ''} importado${result.imported > 1 ? 's' : ''}!`
                : 'Nenhum prazo novo encontrado.'}
              {result.warning && <p className="mt-1 text-xs opacity-70">{result.warning}</p>}
            </div>
          ) : (
            <button onClick={handleSync} disabled={loading || !caseData.process_number}
              className="w-full py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark disabled:opacity-50 transition-colors">
              {loading ? 'Buscando prazos...' : 'Buscar prazos'}
            </button>
          )}
          {!caseData.process_number && (
            <p className="text-xs text-red-400 text-center">Cadastre o número do processo antes de sincronizar.</p>
          )}
        </div>
      </div>
      <ToastContainer toasts={toasts} onClose={close} />
    </div>
  )
}

// ── Case Card ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  ativo:     { label: '● Ativo',     bg: '#E1F5EE', color: '#085041' },
  encerrado: { label: '● Encerrado', bg: '#f5f5f5', color: '#888' },
  suspenso:  { label: '◐ Suspenso',  bg: '#FEF3C7', color: '#92400E' },
}

function CaseCard({ caseData, projectId, token, onDelete, onSynced }: {
  caseData: Case; projectId: string; token: string
  onDelete: (id: string) => void; onSynced: () => void
}) {
  const [showSync, setShowSync] = useState(false)
  const cfg = STATUS_CONFIG[caseData.status] ?? STATUS_CONFIG.ativo
  const deadlineCount = caseData.legal_deadlines?.length ?? 0
  const docCount = caseData.legal_documents?.length ?? 0

  return (
    <>
      <div className="bg-white rounded-xl border border-stone/30 p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink text-sm">{caseData.title}</p>
            {caseData.process_number && (
              <p className="text-xs text-ink/40 mt-0.5 font-mono">Proc: {caseData.process_number}</p>
            )}
          </div>
          <span style={{ background: cfg.bg, color: cfg.color }} className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap">
            {cfg.label}
          </span>
        </div>

        {caseData.area && (
          <span className="text-xs text-brand bg-brand-light px-2.5 py-1 rounded-full w-fit capitalize">{caseData.area}</span>
        )}

        <div className="flex gap-4 text-xs text-ink/40">
          <span>⏰ {deadlineCount} prazo{deadlineCount !== 1 ? 's' : ''}</span>
          <span>📄 {docCount} documento{docCount !== 1 ? 's' : ''}</span>
          {caseData.last_sync && (
            <span>🔄 Sync: {new Date(caseData.last_sync).toLocaleDateString('pt-BR')}</span>
          )}
        </div>

        <div className="flex gap-2 pt-1 border-t border-stone/20">
          <button onClick={() => setShowSync(true)}
            className="flex-1 text-xs font-medium text-brand bg-brand-light px-3 py-1.5 rounded-lg hover:bg-brand/20 transition-colors">
            🔄 Sincronizar PJe
          </button>
          <button onClick={() => onDelete(caseData.id)}
            className="text-xs text-red-400 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
            Remover
          </button>
        </div>
      </div>

      {showSync && (
        <SyncPjeModal
          projectId={projectId} caseData={caseData} token={token}
          onClose={() => setShowSync(false)}
          onSynced={() => { setShowSync(false); onSynced() }}
        />
      )}
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const rawId = params.id as string
  const projectId = rawId.length > 36 ? rawId.slice(-36) : rawId
  const clientId = params.clientId as string
  const supabase = createClient()
  const { toasts, toast, close } = useToast()

  const [token, setToken] = useState('')
  const [client, setClient] = useState<ClientData | null>(null)
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewCase, setShowNewCase] = useState(false)

  const fetchData = useCallback(async (accessToken: string) => {
    const [clientRes, casesRes] = await Promise.all([
      fetch(`${API_BASE}/api/projects/${projectId}/legal/clients`, { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch(`${API_BASE}/api/projects/${projectId}/legal/clients/${clientId}/cases`, { headers: { Authorization: `Bearer ${accessToken}` } }),
    ])
    const clientsData = await clientRes.json()
    const casesData = await casesRes.json()
    const found = (clientsData.clients ?? []).find((c: ClientData) => c.id === clientId)
    if (found) setClient(found)
    setCases(casesData.cases ?? [])
  }, [projectId, clientId])

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      setToken(session.access_token)
      try { await fetchData(session.access_token) }
      catch { toast('Erro ao carregar dados.', 'error') }
      finally { setLoading(false) }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDeleteCase(caseId: string) {
    if (!confirm('Remover este processo?')) return
    await fetch(`${API_BASE}/api/projects/${projectId}/legal/cases/${caseId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    })
    setCases(p => p.filter(c => c.id !== caseId))
  }

  const allDeadlines = cases.flatMap(c => c.legal_deadlines ?? [])
  const allDocs = cases.flatMap(c => c.legal_documents ?? [])

  return (
    <>
      <div className="min-h-screen bg-parchment">
        <header className="sticky top-0 z-30 bg-white border-b border-stone/30 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
            <Link href={`/project/${rawId}/legal`} className="text-sm text-muted hover:text-ink flex items-center gap-1 transition-colors">
              ← Voltar
            </Link>
            <span className="text-stone/30">/</span>
            <span className="text-sm font-semibold text-ink">{client?.name ?? '...'}</span>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
          {/* Client info */}
          {client && (
            <div className="bg-white rounded-2xl border border-stone/30 p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center text-2xl shrink-0">
                {client.type === 'pessoa_juridica' ? '🏢' : '👤'}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-ink text-lg">{client.name}</h1>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                  {client.cpf_cnpj && <span className="text-xs text-ink/40">{client.type === 'pessoa_fisica' ? 'CPF' : 'CNPJ'}: {client.cpf_cnpj}</span>}
                  {client.email && <span className="text-xs text-ink/40">{client.email}</span>}
                  {client.phone && <span className="text-xs text-ink/40">{client.phone}</span>}
                </div>
                {client.notes && <p className="text-xs text-ink/50 mt-1">{client.notes}</p>}
              </div>
            </div>
          )}

          {/* Cases */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-ink text-base">📋 Processos ({cases.length})</h2>
              <button onClick={() => setShowNewCase(true)}
                className="text-sm font-semibold text-white bg-brand px-4 py-2 rounded-xl hover:bg-brand-dark transition-colors">
                + Novo processo
              </button>
            </div>
            {loading ? (
              <div className="space-y-3">{[1,2].map(i => <div key={i} className="bg-white rounded-xl border border-stone/30 h-28 animate-pulse" />)}</div>
            ) : cases.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <span className="text-4xl">⚖️</span>
                <p className="text-sm text-muted">Nenhum processo cadastrado ainda.</p>
                <button onClick={() => setShowNewCase(true)} className="bg-brand text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-brand-dark transition-colors">
                  + Novo processo
                </button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {cases.map(c => (
                  <CaseCard key={c.id} caseData={c} projectId={projectId} token={token}
                    onDelete={handleDeleteCase} onSynced={() => fetchData(token)} />
                ))}
              </div>
            )}
          </div>

          {/* All deadlines */}
          {allDeadlines.length > 0 && (
            <div>
              <h2 className="font-bold text-ink text-base mb-4">⏰ Prazos do cliente ({allDeadlines.length})</h2>
              <div className="space-y-2">
                {allDeadlines.sort((a, b) => a.deadline_date.localeCompare(b.deadline_date)).map(dl => (
                  <div key={dl.id} className="bg-white rounded-xl border border-stone/30 px-5 py-3 flex items-center gap-3">
                    <span className="text-sm font-medium text-ink flex-1 truncate">{dl.title}</span>
                    <span className="text-xs text-ink/40 shrink-0">
                      {new Date(dl.deadline_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${dl.status === 'done' ? 'bg-stone/20 text-ink/40' : 'bg-brand-light text-brand-dark'}`}>
                      {dl.status === 'done' ? 'Concluído' : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All docs */}
          {allDocs.length > 0 && (
            <div>
              <h2 className="font-bold text-ink text-base mb-4">📄 Documentos gerados ({allDocs.length})</h2>
              <div className="space-y-2">
                {allDocs.map(doc => (
                  <div key={doc.id} className="bg-white rounded-xl border border-stone/30 px-5 py-3 flex items-center gap-3">
                    <span className="text-xl shrink-0">📄</span>
                    <span className="text-sm text-ink flex-1 truncate">{doc.name}</span>
                    <span className="text-xs text-ink/40 shrink-0">
                      {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {showNewCase && token && (
        <NewCaseModal
          projectId={projectId} clientId={clientId} token={token}
          onClose={() => setShowNewCase(false)}
          onCreated={c => { setCases(p => [c, ...p]); toast(`Processo "${c.title}" criado!`, 'success') }}
        />
      )}
      <ToastContainer toasts={toasts} onClose={close} />
    </>
  )
}
