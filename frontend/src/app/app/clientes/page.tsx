"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { apiFetch }     from "@/lib/apiFetch"
import { PageShell }    from "@/components/dashboard/PageShell"
import { EmptyState }   from "@/components/dashboard/EmptyState"
import type { DashboardProject } from "@/types"

interface Client {
  id: string
  name: string
  email?: string
  type?: string
  project_name?: string
  project_id?: string
}

export default function ClientesPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState("")

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace("/login"); return }
      const token = session.access_token

      try {
        const dash = await apiFetch<{ projects: DashboardProject[] }>(
          "/projects/dashboard", token
        )
        const legalProjects = (dash.projects ?? []).filter(p => p.type === "juridico").slice(0, 8)

        const all: Client[] = []
        await Promise.allSettled(
          legalProjects.map(async p => {
            const data = await apiFetch<{ clients: Client[] }>(
              `/projects/${p.id}/legal/clients`, token
            )
            all.push(...(data.clients ?? []).map(c => ({
              ...c,
              project_name: p.name,
              project_id:   p.id,
            })))
          })
        )
        setClients(all)
      } catch { /* silencioso */ }
      finally { setLoading(false) }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = clients.filter(c =>
    (c.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(search.toLowerCase())
  )

  const count = clients.length
  const subtitle = loading
    ? "Carregando..."
    : `${count} cliente${count !== 1 ? "s" : ""} cadastrado${count !== 1 ? "s" : ""}`

  return (
    <PageShell title="Clientes" subtitle={subtitle}>
      {/* Busca */}
      {!loading && clients.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="Buscar pelo nome ou e-mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "9px 14px",
              border: "0.5px solid #d8d6d0", borderRadius: "8px",
              fontSize: "13px", color: "#1a1a1a", background: "#fff",
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              background: "#fff", border: "0.5px solid #d8d6d0",
              borderRadius: "10px", height: "64px", opacity: 0.4,
            }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="👥"
          title={search ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"}
          description={
            search
              ? "Tente buscar por outro nome ou e-mail."
              : "Os clientes são cadastrados dentro de cada projeto jurídico. Acesse um projeto e adicione seus clientes."
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map(client => (
            <div
              key={client.id}
              style={{
                background: "#fff", border: "0.5px solid #d8d6d0",
                borderRadius: "10px", padding: "14px 16px",
                display: "flex", alignItems: "center", gap: "14px",
                transition: "border-color .15s",
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = "#b0ada6")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = "#d8d6d0")}
            >
              {/* Avatar */}
              <div style={{
                width: "36px", height: "36px", borderRadius: "50%",
                background: "#E1F5EE", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "13px", fontWeight: 500,
                color: "#0F6E56", flexShrink: 0,
              }}>
                {(client.name ?? "?").slice(0, 2).toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: "13px", fontWeight: 500, color: "#1a1a1a",
                  marginBottom: "2px",
                }}>
                  {client.name}
                </div>
                <div style={{ fontSize: "11px", color: "#888", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {client.email && <span>{client.email}</span>}
                  {client.project_name && <span>· {client.project_name}</span>}
                </div>
              </div>

              {/* Tipo PF/PJ */}
              <span style={{
                fontSize: "10px", fontWeight: 500, padding: "2px 8px",
                borderRadius: "99px", background: "#E1F5EE", color: "#085041",
                flexShrink: 0,
              }}>
                {client.type === "pessoa_juridica" ? "PJ" : "PF"}
              </span>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  )
}
