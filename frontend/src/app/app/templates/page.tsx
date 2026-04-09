"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient }  from "@/lib/supabase/client"
import { apiFetch }      from "@/lib/apiFetch"
import { PageShell }     from "@/components/dashboard/PageShell"
import { EmptyState }    from "@/components/dashboard/EmptyState"
import { TemplateCard }  from "@/components/dashboard/TemplateCard"

interface Template {
  id: string
  name: string
  area: string
  subtype?: string
  is_diamond?: boolean
  description?: string
}

const AREAS = ["todos", "trabalhista", "civel", "familia", "previdenciario", "contratos"]

export default function TemplatesPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [templates, setTemplates] = useState<Template[]>([])
  const [loading,   setLoading]   = useState(true)
  const [area,      setArea]      = useState("todos")

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace("/login"); return }
      try {
        const data = await apiFetch<{ templates: Template[] }>(
          "/legal/templates", session.access_token
        )
        setTemplates(data.templates ?? [])
      } catch { /* silencioso */ }
      finally { setLoading(false) }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = area === "todos"
    ? templates
    : templates.filter(t => t.area === area)

  const count = templates.length
  const subtitle = loading
    ? "Carregando..."
    : `${count} template${count !== 1 ? "s" : ""} disponíve${count !== 1 ? "is" : "l"}`

  return (
    <PageShell title="Templates" subtitle={subtitle}>
      {/* Filtro por área */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {AREAS.map(a => {
          const active = area === a
          return (
            <button
              key={a}
              onClick={() => setArea(a)}
              style={{
                padding: "6px 14px", borderRadius: "7px", fontSize: "12px",
                fontWeight: active ? 500 : 400, cursor: "pointer",
                border: `0.5px solid ${active ? "#0F6E56" : "#d8d6d0"}`,
                background: active ? "#E1F5EE" : "#fff",
                color: active ? "#085041" : "#3a3a3a",
                textTransform: "capitalize",
              }}
            >
              {a === "todos" ? "Todos" : a}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "10px",
        }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              background: "#fff", border: "0.5px solid #d8d6d0",
              borderRadius: "10px", height: "100px", opacity: 0.4,
            }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Nenhum template nesta área"
          description="Selecione outra área ou crie um template customizado dentro de um projeto jurídico."
        />
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "10px",
        }}>
          {filtered.map(t => <TemplateCard key={t.id} template={t} />)}
        </div>
      )}
    </PageShell>
  )
}
