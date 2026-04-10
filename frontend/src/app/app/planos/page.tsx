"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { apiFetch }     from "@/lib/apiFetch"
import { PageShell }    from "@/components/dashboard/PageShell"

type Period = "monthly" | "annual"

interface BillingStatus {
  plan:      string
  status:    string
  period?:   string
  days_left?: number
  renews_at?: string
}

const PLANS = {
  pro: {
    name:        "Pro",
    monthly:     247,
    annual:      198,       // R$247 × 0.8
    annualTotal: 2376,
    rec:         false,
    features: [
      "Templates ilimitados",
      "Gestão de prazos + alertas por e-mail",
      "Geração de documentos com IA",
      "Exportar .docx e PDF",
      "Gestão de clientes e processos",
      "Até 5 usuários",
      "Suporte por e-mail",
    ],
  },
  business: {
    name:        "Business",
    monthly:     397,
    annual:      318,       // R$397 × 0.8
    annualTotal: 3811,
    rec:         true,
    features: [
      "Tudo do Pro",
      "Usuários ilimitados",
      "Sincronização com PJe/e-SAJ",
      "Relatório de atividade mensal",
      "Motor Padrão Diamante com feedback loop",
      "Suporte prioritário",
      "Onboarding assistido",
    ],
  },
}

function Dot() {
  return (
    <span style={{
      display: "inline-block", width: "6px", height: "6px",
      background: "#0F6E56", borderRadius: "50%",
      marginRight: "8px", flexShrink: 0,
    }} />
  )
}

export default function PlanosPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [token,   setToken]   = useState("")
  const [period,  setPeriod]  = useState<Period>("monthly")
  const [status,  setStatus]  = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const params = new URLSearchParams(window.location.search)
    if (params.get("success")) setSuccess(true)

    if (params.get("success") || params.get("cancelled")) {
      window.history.replaceState({}, "", "/app/planos")
    }

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace("/login"); return }
      setToken(session.access_token)

      try {
        const data = await apiFetch<BillingStatus>("/billing/status", session.access_token)
        setStatus(data)
      } catch { /* silencioso — billing pode não estar configurado */ }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCheckout(plan: "pro" | "business") {
    if (!token) return
    setLoading(true)
    console.log("[CHECKOUT] Enviando:", { plan, period })
    try {
      const data = await apiFetch<{ checkout_url: string }>(
        "/billing/checkout", token,
        { method: "POST", body: JSON.stringify({ plan, period }) }
      )
      console.log("[CHECKOUT] Resposta:", data)
      if (data.checkout_url) window.location.href = data.checkout_url
    } catch (err: unknown) {
      console.error("[CHECKOUT] Erro:", err)
      alert(err instanceof Error ? err.message : "Erro ao iniciar o checkout.")
    } finally {
      setLoading(false)
    }
  }

  async function handlePortal() {
    if (!token) return
    try {
      const data = await apiFetch<{ portal_url: string }>(
        "/billing/portal", token, { method: "POST" }
      )
      if (data.portal_url) window.location.href = data.portal_url
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao abrir o portal.")
    }
  }

  const isActive = status?.status === "active"
  const isTrial  = status?.plan === "trial"
  const daysLeft = status?.days_left ?? 0

  if (!mounted) {
    return (
      <PageShell title="Planos" subtitle="Escolha o plano ideal para o seu escritório">
        <div style={{ height: "300px" }} />
      </PageShell>
    )
  }

  return (
    <PageShell
      title="Planos"
      subtitle="Escolha o plano ideal para o seu escritório"
    >
      {/* Banner de sucesso pós-checkout */}
      {success && (
        <div style={{
          background: "#E1F5EE", border: "0.5px solid #9FE1CB",
          borderRadius: "8px", padding: "12px 16px",
          fontSize: "13px", color: "#085041", marginBottom: "24px",
        }}>
          Assinatura ativada com sucesso! Bem-vindo ao Lore Jurídico.
        </div>
      )}

      {/* Banner de trial */}
      {isTrial && daysLeft > 0 && (
        <div style={{
          background: "#FEF3C7", border: "0.5px solid #EF9F27",
          borderRadius: "8px", padding: "12px 16px",
          fontSize: "13px", color: "#633806", marginBottom: "24px",
        }}>
          Seu trial termina em{" "}
          <strong>{daysLeft} dia{daysLeft !== 1 ? "s" : ""}</strong>.
          {" "}Assine agora para continuar sem interrupção.
        </div>
      )}

      {/* Assinatura ativa — botão de gerenciar */}
      {isActive && (
        <div style={{
          background: "#fff", border: "0.5px solid #d8d6d0",
          borderRadius: "10px", padding: "16px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: "28px",
        }}>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}>
              Plano {status?.plan === "pro" ? "Pro" : "Business"} ativo
            </div>
            <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>
              {status?.period === "annual" ? "Cobrança anual" : "Cobrança mensal"}
              {status?.renews_at && (
                ` · Renova em ${new Date(status.renews_at).toLocaleDateString("pt-BR")}`
              )}
            </div>
          </div>
          <button
            onClick={handlePortal}
            style={{
              background: "transparent", color: "#0F6E56",
              border: "0.5px solid #9FE1CB", padding: "7px 14px",
              borderRadius: "7px", fontSize: "12px", fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Gerenciar assinatura
          </button>
        </div>
      )}

      {/* Toggle mensal / anual */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
        <span style={{ fontSize: "13px", color: "#1a1a1a" }}>Mensal</span>
        <div
          role="switch"
          aria-checked={period === "annual"}
          onClick={() => setPeriod(p => p === "monthly" ? "annual" : "monthly")}
          style={{
            width: "44px", height: "24px", borderRadius: "99px",
            cursor: "pointer",
            background: period === "annual" ? "#0F6E56" : "#d8d6d0",
            position: "relative", transition: "background .2s", flexShrink: 0,
          }}
        >
          <div style={{
            position: "absolute", top: "3px",
            left: period === "annual" ? "23px" : "3px",
            width: "18px", height: "18px",
            borderRadius: "50%", background: "#fff",
            transition: "left .2s",
          }} />
        </div>
        <span style={{ fontSize: "13px", color: "#1a1a1a" }}>
          Anual{" "}
          <span style={{
            fontSize: "10px", fontWeight: 500,
            background: "#E1F5EE", color: "#085041",
            padding: "2px 7px", borderRadius: "99px",
          }}>
            20% off
          </span>
        </span>
      </div>

      {/* Cards de plano */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "14px",
        maxWidth: "680px",
      }}>
        {(Object.entries(PLANS) as [string, typeof PLANS.pro][]).map(([key, plan]) => {
          const isCurrentPlan = isActive && status?.plan === key
          const price         = period === "annual" ? plan.annual : plan.monthly

          return (
            <div
              key={key}
              style={{
                background: "#fff",
                border: plan.rec ? "2px solid #0F6E56" : "0.5px solid #d8d6d0",
                borderRadius: "12px", padding: "24px",
              }}
            >
              {plan.rec && (
                <div style={{
                  fontSize: "10px", fontWeight: 500, padding: "2px 8px",
                  borderRadius: "99px", background: "#E1F5EE", color: "#085041",
                  display: "inline-block", marginBottom: "10px",
                }}>
                  Mais popular
                </div>
              )}

              <div style={{ fontSize: "15px", fontWeight: 500, color: "#1a1a1a", marginBottom: "6px" }}>
                {plan.name}
              </div>

              <div style={{ marginBottom: "2px" }}>
                <span style={{ fontSize: "28px", fontWeight: 500, color: "#0F6E56" }}>
                  R$ {price}
                </span>
                <span style={{ fontSize: "13px", color: "#888" }}>/mês</span>
              </div>

              {period === "annual" && (
                <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>
                  R$ {plan.annualTotal.toLocaleString("pt-BR")} cobrado anualmente
                </div>
              )}

              <div style={{ fontSize: "11px", color: "#888", marginBottom: "16px" }}>
                {isTrial && daysLeft > 0
                  ? `${daysLeft} dias grátis restantes`
                  : "Sem fidelidade"}
              </div>

              <div style={{ marginBottom: "20px" }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{
                    fontSize: "12px", color: "#1a1a1a",
                    marginBottom: "6px", display: "flex", alignItems: "center",
                  }}>
                    <Dot />
                    {f}
                  </div>
                ))}
              </div>

              <button
                onClick={() => !isCurrentPlan && !loading && handleCheckout(key as "pro" | "business")}
                disabled={isCurrentPlan || loading}
                style={{
                  width: "100%", padding: "10px", borderRadius: "8px",
                  fontSize: "13px", fontWeight: 500,
                  cursor: isCurrentPlan || loading ? "default" : "pointer",
                  border: "none",
                  background: isCurrentPlan ? "#e8e6e0" : "#0F6E56",
                  color: isCurrentPlan ? "#888" : "#fff",
                  opacity: loading && !isCurrentPlan ? 0.7 : 1,
                  transition: "opacity .15s",
                }}
              >
                {isCurrentPlan
                  ? "Plano atual"
                  : loading
                  ? "Redirecionando..."
                  : `Assinar ${plan.name}`}
              </button>
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: "12px", color: "#888", marginTop: "20px" }}>
        Pagamento seguro via Stripe · Cancele quando quiser · Sem multa de cancelamento
      </p>
    </PageShell>
  )
}
