"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { apiFetch } from "@/lib/apiFetch"

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000") + "/api"

interface Variable {
  key:   string
  label: string
  type:  "text" | "textarea" | "date"
}

interface Template {
  id:          string
  name:        string
  area?:       string
  subtype?:    string
  variables?:  Variable[]
  is_diamond?: boolean
  content?:    string
  structure?:  Record<string, { instrucao?: string; exemplo?: string }>
  tone_guide?: string
}

interface DashboardData {
  projects: { id: string; name: string; type: string }[]
}

export default function TemplatePage() {
  const params = useParams()
  const router = useRouter()
  const id     = params.id as string

  const [token,      setToken]      = useState("")
  const [template,   setTemplate]   = useState<Template | null>(null)
  const [values,     setValues]     = useState<Record<string, string>>({})
  const [projectId,  setProjectId]  = useState<string | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [generating, setGenerating] = useState(false)
  const [streamText, setStreamText] = useState("")
  const [docId,      setDocId]      = useState<string | null>(null)
  const [error,      setError]      = useState<string | null>(null)
  const [copied,     setCopied]     = useState(false)
  const [activeTab,  setActiveTab]  = useState<"form" | "preview">("form")

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/login"); return }
      const tok = session.access_token
      setToken(tok)

      try {
        const [tmpl, dash] = await Promise.all([
          apiFetch<Template>(`/legal/templates/${id}`, tok),
          apiFetch<DashboardData>("/projects/dashboard", tok).catch(() => ({ projects: [] })),
        ])

        setTemplate(tmpl)

        // Pré-preenche datas com hoje
        const initial: Record<string, string> = {}
        ;(tmpl.variables ?? []).forEach(v => {
          if (v.type === "date") initial[v.key] = new Date().toISOString().split("T")[0]
        })
        setValues(initial)

        // Pega o primeiro projeto jurídico (ou qualquer projeto)
        const projects = dash.projects ?? []
        const juridico = projects.find(p => p.type === "juridico") ?? projects[0]
        if (juridico) setProjectId(juridico.id)
      } catch {
        // template não encontrado
      } finally {
        setLoading(false)
      }
    })
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const variables = template?.variables ?? []
  const emptyCount = variables.filter(v => !values[v.key]?.trim()).length

  // Preview em tempo real para templates legados
  const livePreview = (() => {
    if (!template?.content) return ""
    let content = template.content
    Object.entries(values).forEach(([key, val]) => {
      content = content.replaceAll(`{{${key}}}`, val || `{{${key}}}`)
    })
    return content
  })()

  const handleGenerate = async () => {
    if (!template) return
    if (!projectId) {
      setError("Crie um projeto jurídico primeiro para gerar documentos.")
      return
    }

    setGenerating(true)
    setStreamText("")
    setDocId(null)
    setError(null)
    setActiveTab("preview")

    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/legal/generate-stream`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ template_id: id, variables: values }),
      })

      if (!res.ok || !res.body) {
        // Fallback síncrono
        const data = await apiFetch<{ document_id: string; content: string }>(
          `/projects/${projectId}/legal/generate`, token,
          { method: "POST", body: JSON.stringify({ template_id: id, variables: values }) }
        )
        setStreamText(data.content ?? "")
        setDocId(data.document_id ?? null)
        return
      }

      const reader      = res.body.getReader()
      const decoder     = new TextDecoder()
      let accumulated   = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value, { stream: true }).split("\n")
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === "chunk") {
              accumulated += event.text
              setStreamText(accumulated)
            } else if (event.type === "done") {
              setDocId(event.document_id ?? null)
            } else if (event.type === "error") {
              throw new Error(event.message)
            }
          } catch { continue }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao gerar documento.")
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = async (format: "docx" | "pdf") => {
    if (!docId || !projectId) return
    const res = await fetch(
      `${API_BASE}/projects/${projectId}/legal/documents/${docId}/export?format=${format}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) return
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href     = url
    a.download = `documento.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(streamText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── Loading / Not found ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "36px 40px" }}>
        <div style={{
          height: "400px", background: "#fff", borderRadius: "10px",
          opacity: 0.4, border: "0.5px solid #d8d6d0",
          animation: "pulse 1.5s ease-in-out infinite",
        }} />
        <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.2}}`}</style>
      </div>
    )
  }

  if (!template) {
    return (
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "36px 40px", textAlign: "center" }}>
        <p style={{ fontSize: "14px", color: "#888", marginBottom: "12px" }}>Template não encontrado.</p>
        <Link href="/app/templates" style={{ color: "#0F6E56", fontSize: "13px" }}>← Voltar para templates</Link>
      </div>
    )
  }

  const area    = template.area ?? ""
  const subtype = template.subtype ?? ""
  const areaLabel = area ? area.charAt(0).toUpperCase() + area.slice(1) : ""

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "36px 40px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px" }}>
        <div>
          <Link href="/app/templates" style={{
            fontSize: "12px", color: "#888", textDecoration: "none",
            display: "block", marginBottom: "8px",
          }}>
            ← Templates
          </Link>
          <h1 style={{
            fontSize: "22px", fontWeight: 500, color: "#1a1a1a",
            fontFamily: "Georgia, serif", margin: 0, marginBottom: "6px",
          }}>
            {template.name}
          </h1>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {areaLabel && <span style={{ fontSize: "12px", color: "#888" }}>{areaLabel}{subtype ? ` · ${subtype}` : ""}</span>}
            {template.is_diamond && (
              <span style={{
                fontSize: "10px", fontWeight: 500, padding: "2px 7px",
                borderRadius: "99px", background: "#E1F5EE", color: "#085041",
              }}>✦ Elite</span>
            )}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            background: generating ? "#d8d6d0" : "#0F6E56",
            color: "#fff", border: "none",
            padding: "10px 24px", borderRadius: "8px",
            fontSize: "13px", fontWeight: 500,
            cursor: generating ? "not-allowed" : "pointer",
            minWidth: "140px", flexShrink: 0,
          }}
        >
          {generating ? "Gerando..." : docId ? "Regenerar" : "Gerar documento"}
        </button>
      </div>

      {/* Erro */}
      {error && (
        <div style={{
          background: "#FCEBEB", border: "0.5px solid #F09595",
          borderRadius: "8px", padding: "12px 16px",
          fontSize: "13px", color: "#791F1F", marginBottom: "20px",
        }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "0.5px solid #d8d6d0", marginBottom: "24px" }}>
        {(["form", "preview"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "10px 16px", fontSize: "13px",
              color: activeTab === tab ? "#0F6E56" : "#888",
              fontWeight: activeTab === tab ? 500 : 400,
              borderBottom: activeTab === tab ? "2px solid #0F6E56" : "2px solid transparent",
              marginBottom: "-0.5px", background: "transparent",
              border: "none", borderBottom: activeTab === tab ? "2px solid #0F6E56" : "2px solid transparent",
              cursor: "pointer",
            }}
          >
            {tab === "form" ? "✏️ Preencher campos" : "👁️ Preview"}
            {tab === "form" && emptyCount > 0 && (
              <span style={{
                marginLeft: "6px", fontSize: "10px",
                background: "#FCEBEB", color: "#791F1F",
                padding: "1px 6px", borderRadius: "99px",
              }}>{emptyCount}</span>
            )}
            {tab === "preview" && streamText && (
              <span style={{
                marginLeft: "6px", fontSize: "10px",
                background: "#E1F5EE", color: "#085041",
                padding: "1px 6px", borderRadius: "99px",
              }}>gerado</span>
            )}
          </button>
        ))}
      </div>

      {/* Aba formulário */}
      {activeTab === "form" && (
        <>
          {variables.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "40px 20px",
              color: "#888", fontSize: "13px",
              border: "0.5px dashed #d8d6d0", borderRadius: "10px",
            }}>
              Este template não tem campos para preencher.
              Clique em "Gerar documento" para criar.
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "16px",
            }}>
              {variables.map(v => (
                <div key={v.key} style={{ gridColumn: v.type === "textarea" ? "1 / -1" : "auto" }}>
                  <label style={{
                    display: "block", fontSize: "12px", fontWeight: 500,
                    color: "#1a1a1a", marginBottom: "5px",
                  }}>
                    {v.label}
                    {!values[v.key]?.trim() && (
                      <span style={{ color: "#E24B4A", marginLeft: "3px" }}>*</span>
                    )}
                  </label>
                  {v.type === "textarea" ? (
                    <textarea
                      value={values[v.key] ?? ""}
                      onChange={e => setValues(prev => ({ ...prev, [v.key]: e.target.value }))}
                      placeholder={`Digite ${v.label.toLowerCase()}...`}
                      rows={4}
                      style={{
                        width: "100%", border: "0.5px solid #d8d6d0", borderRadius: "7px",
                        padding: "9px 12px", fontSize: "13px", color: "#1a1a1a",
                        resize: "vertical", outline: "none", fontFamily: "inherit",
                        boxSizing: "border-box",
                      }}
                    />
                  ) : v.type === "date" ? (
                    <input
                      type="date"
                      value={values[v.key] ?? ""}
                      onChange={e => setValues(prev => ({ ...prev, [v.key]: e.target.value }))}
                      style={{
                        width: "100%", border: "0.5px solid #d8d6d0", borderRadius: "7px",
                        padding: "9px 12px", fontSize: "13px", color: "#1a1a1a",
                        outline: "none", boxSizing: "border-box",
                      }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={values[v.key] ?? ""}
                      onChange={e => setValues(prev => ({ ...prev, [v.key]: e.target.value }))}
                      placeholder={`Digite ${v.label.toLowerCase()}...`}
                      style={{
                        width: "100%", border: "0.5px solid #d8d6d0", borderRadius: "7px",
                        padding: "9px 12px", fontSize: "13px", color: "#1a1a1a",
                        outline: "none", boxSizing: "border-box",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Aba preview */}
      {activeTab === "preview" && (
        <>
          {/* Botões de ação */}
          {(streamText || generating) && (
            <div style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
              {streamText && !generating && (
                <>
                  <button
                    onClick={handleCopy}
                    style={{
                      padding: "7px 14px", borderRadius: "7px", fontSize: "12px",
                      background: "#fff", border: "0.5px solid #d8d6d0",
                      color: "#1a1a1a", cursor: "pointer",
                    }}
                  >
                    {copied ? "✓ Copiado!" : "📋 Copiar texto"}
                  </button>
                  {docId && (
                    <>
                      <button
                        onClick={() => handleDownload("docx")}
                        style={{
                          padding: "7px 14px", borderRadius: "7px", fontSize: "12px",
                          background: "#fff", border: "0.5px solid #d8d6d0",
                          color: "#1a1a1a", cursor: "pointer",
                        }}
                      >
                        ⬇ Baixar .docx
                      </button>
                      <button
                        onClick={() => handleDownload("pdf")}
                        style={{
                          padding: "7px 14px", borderRadius: "7px", fontSize: "12px",
                          background: "#fff", border: "0.5px solid #d8d6d0",
                          color: "#1a1a1a", cursor: "pointer",
                        }}
                      >
                        ⬇ Baixar PDF
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Documento */}
          <div style={{
            background: "#fafaf8", border: "0.5px solid #d8d6d0",
            borderRadius: "10px", padding: "32px", minHeight: "300px",
            fontFamily: "Times New Roman, serif", fontSize: "13px",
            lineHeight: "2", color: "#1a1a1a", whiteSpace: "pre-wrap",
          }}>
            {generating && !streamText && (
              <span style={{ color: "#aaa", fontFamily: "system-ui", fontSize: "13px" }}>
                Gerando documento com IA...
              </span>
            )}
            {streamText || (!generating && !streamText && livePreview) || ""}
            {generating && (
              <span style={{
                display: "inline-block", width: "2px", height: "16px",
                background: "#0F6E56", marginLeft: "2px",
                verticalAlign: "middle", animation: "blink 1s infinite",
              }} />
            )}
          </div>
          <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
        </>
      )}

      {/* Rodapé */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginTop: "24px", paddingTop: "16px", borderTop: "0.5px solid #e8e6e0",
      }}>
        <span style={{ fontSize: "11px", color: "#888" }}>
          {variables.length === 0
            ? "Sem campos obrigatórios"
            : emptyCount > 0
            ? `${emptyCount} campo${emptyCount > 1 ? "s" : ""} não preenchido${emptyCount > 1 ? "s" : ""}`
            : "✓ Todos os campos preenchidos"
          }
        </span>
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            background: generating ? "#d8d6d0" : "#0F6E56",
            color: "#fff", border: "none",
            padding: "9px 20px", borderRadius: "7px",
            fontSize: "13px", fontWeight: 500,
            cursor: generating ? "not-allowed" : "pointer",
          }}
        >
          {generating ? "Gerando..." : docId ? "Regenerar documento" : "Gerar documento"}
        </button>
      </div>

    </div>
  )
}
