'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ToastContainer, useToast } from '@/components/ui/Toast'

interface LegalCase {
  id: string
  title: string
  status: 'ativo' | 'encerrado' | 'suspenso'
}

interface Client {
  id: string
  name: string
  cpf_cnpj: string | null
  email: string | null
  phone: string | null
  type: 'pessoa_fisica' | 'pessoa_juridica'
  notes: string | null
  created_at: string
  legal_cases: LegalCase[]
}

interface Props {
  projectId: string
  token: string
  apiBase: string
}

// ── New Client Modal ──────────────────────────────────────────────────────────

function NewClientModal({
  projectId, token, apiBase, onClose, onCreated,
}: {
  projectId: string; token: string; apiBase: string
  onClose: () => void; onCreated: (c: Client) => void
}) {
  const [form, setForm] = useState({ name: '', cpf_cnpj: '', email: '', phone: '', type: 'pessoa_fisica', notes: '' })
  const [loading, setLoading] = useState(false)
  const { toasts, toast, close } = useToast()

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast('Informe o nome do cliente.', 'error'); return }
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/api/projects/${projectId}/legal/clients`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).detail ?? 'Erro')
      const client = await res.json()
      onCreated({ ...client, legal_cases: [] })
      onClose()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Erro ao criar cliente.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone/40">
          <h2 className="font-bold text-ink text-base">Novo cliente</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-stone/20 transition-colors">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-3">
          <div className="flex gap-2">
            {(['pessoa_fisica', 'pessoa_juridica'] as const).map(t => (
              <button key={t} type="button" onClick={() => set('type', t)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${form.type === t ? 'bg-brand text-white border-brand' : 'border-stone/40 text-muted hover:border-brand/40'}`}>
                {t === 'pessoa_fisica' ? '👤 Pessoa Física' : '🏢 Pessoa Jurídica'}
              </button>
            ))}
          </div>
          <input className="border border-stone/40 rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand/50" placeholder="Nome completo *" value={form.name} onChange={e => set('name', e.target.value)} />
          <input className="border border-stone/40 rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand/50" placeholder={form.type === 'pessoa_fisica' ? 'CPF' : 'CNPJ'} value={form.cpf_cnpj} onChange={e => set('cpf_cnpj', e.target.value)} />
          <input className="border border-stone/40 rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand/50" placeholder="E-mail" value={form.email} onChange={e => set('email', e.target.value)} />
          <input className="border border-stone/40 rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand/50" placeholder="Telefone" value={form.phone} onChange={e => set('phone', e.target.value)} />
          <textarea className="border border-stone/40 rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand/50 resize-none" placeholder="Observações (opcional)" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl border border-stone/40 text-sm text-muted hover:text-ink transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60">
              {loading ? 'Salvando...' : 'Criar cliente'}
            </button>
          </div>
        </form>
      </div>
      <ToastContainer toasts={toasts} onClose={close} />
    </div>
  )
}

// ── Client Card ───────────────────────────────────────────────────────────────

function ClientCard({ client, projectId, onDelete }: { client: Client; projectId: string; onDelete: (id: string) => void }) {
  const activeCount = client.legal_cases?.filter(c => c.status === 'ativo').length ?? 0
  const totalCount = client.legal_cases?.length ?? 0
  const icon = client.type === 'pessoa_juridica' ? '🏢' : '👤'

  return (
    <div className="bg-white rounded-xl border border-stone/30 px-5 py-4 flex items-center gap-4 hover:border-brand/30 transition-colors">
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink text-sm">{client.name}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
          {client.cpf_cnpj && <span className="text-xs text-ink/40">{client.type === 'pessoa_fisica' ? 'CPF' : 'CNPJ'}: {client.cpf_cnpj}</span>}
          {client.email && <span className="text-xs text-ink/40">{client.email}</span>}
          {client.phone && <span className="text-xs text-ink/40">{client.phone}</span>}
        </div>
        <p className="text-xs text-ink/40 mt-1">{totalCount > 0 ? `${activeCount} processo${activeCount !== 1 ? 's' : ''} ativo${activeCount !== 1 ? 's' : ''}` : 'Sem processos'}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link href={`/project/${projectId}/legal/clients/${client.id}`}
          className="text-xs font-medium text-brand bg-brand-light px-3 py-1.5 rounded-lg hover:bg-brand/20 transition-colors">
          Ver →
        </Link>
        <button onClick={() => onDelete(client.id)}
          className="text-xs text-red-400 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
          ✕
        </button>
      </div>
    </div>
  )
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export function ClientsTab({ projectId, token, apiBase }: Props) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const { toasts, toast, close } = useToast()

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/projects/${projectId}/legal/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setClients(data.clients ?? [])
    } catch {
      toast('Erro ao carregar clientes.', 'error')
    } finally {
      setLoading(false)
    }
  }, [projectId, token, apiBase]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchClients() }, [fetchClients])

  async function handleDelete(clientId: string) {
    if (!confirm('Remover cliente e todos os processos vinculados?')) return
    try {
      await fetch(`${apiBase}/api/projects/${projectId}/legal/clients/${clientId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      setClients(p => p.filter(c => c.id !== clientId))
    } catch {
      toast('Erro ao remover cliente.', 'error')
    }
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.cpf_cnpj ?? '').includes(search)
  )

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 border border-stone/40 rounded-xl px-3 py-2 bg-white flex-1 max-w-xs">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C8C6BC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)}
              className="text-sm text-ink placeholder:text-ink/30 bg-transparent outline-none w-full" />
          </div>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 text-sm font-semibold text-white bg-brand px-4 py-2 rounded-xl hover:bg-brand-dark transition-colors shrink-0">
            + Novo cliente
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border border-stone/30 h-20 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <div className="text-5xl">👥</div>
            <div>
              <h3 className="font-semibold text-ink">{search ? 'Nenhum cliente encontrado' : 'Nenhum cliente ainda'}</h3>
              <p className="text-sm text-muted mt-1">{search ? 'Tente outro termo.' : 'Cadastre o primeiro cliente do escritório.'}</p>
            </div>
            {!search && (
              <button onClick={() => setShowNew(true)} className="bg-brand text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-brand-dark transition-colors">
                + Novo cliente
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => (
              <ClientCard key={c.id} client={c} projectId={projectId} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {showNew && (
        <NewClientModal
          projectId={projectId} token={token} apiBase={apiBase}
          onClose={() => setShowNew(false)}
          onCreated={c => { setClients(p => [c, ...p]); toast(`Cliente "${c.name}" criado!`, 'success') }}
        />
      )}
      <ToastContainer toasts={toasts} onClose={close} />
    </>
  )
}
