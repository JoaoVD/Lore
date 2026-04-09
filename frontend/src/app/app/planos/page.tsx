"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { PageShell }    from "@/components/dashboard/PageShell"

interface Sub {
  plan: string
  trial_ends_at?: string
}

const PLANS = [
  {
    key:   "pro",
    name:  "Pro",
    price: 247,
    rec:   false,
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
  {
    key:   "business",
    name:  "Business",
    price: 397,
    rec:   true,
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
]

function Dot() {
  return (
    <span style={{
      display: "inline-block", width: "6px", height: "6px",
      background: "#0F6E56", borderRadius: "50",
      marginRight: "8px", flexShrink: 0,
    }} />
  )
}

export default function PlanosPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [sub, setSub] = useState<Sub | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace("/login"); return }
      // Busca assinatura via Next.js API route
      fetch("/api/subscriptions/juridico")
        .then(r => r.json())
        .then(setSub)
        .catch(() => {})
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const days = sub?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0

  return (
    <PageShell
      title="Planos"
      subtitle="Escolha o plano ideal para o seu escritório"
    >
      {/* Banner trial ativo */}
      {sub?.plan === "trial" && days > 0 && (
        <div style={{
          background: "#E1F5EE", border: "0.5px solid #9FE1CB",
          borderRadius: "8px", padding: "12px 16px",
          fontSize: "13px", color: "#1a1a1a", marginBottom: "28px",
        }}>
          Seu trial termina em{" "}
          <strong>{days} dia{days !== 1 ? "s" : ""}</strong>.
          {" "}Assine agora e continue usando sem interrupção.
        </div>
      )}

      {/* Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "14px",
        maxWidth: "680px",
      }}>
        {PLANS.map(plan => {
          const isCurrent = sub?.plan === plan.key
          return (
            <div
              key={plan.key}
              style={{
                background: "#fff",
                border: plan.rec ? "2px solid #0F6E56" : "0.5px solid #d8d6d0",
                borderRadius: "12px",
                padding: "24px",
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

              <div style={{
                fontSize: "15px", fontWeight: 500, color: "#1a1a1a", marginBottom: "6px",
              }}>
                {plan.name}
              </div>

              <div style={{ marginBottom: "4px" }}>
                <span style={{ fontSize: "28px", fontWeight: 500, color: "#0F6E56" }}>
                  R$ {plan.price}
                </span>
                <span style={{ fontSize: "13px", color: "#888" }}>/mês</span>
              </div>

              <div style={{ fontSize: "11px", color: "#888", marginBottom: "18px" }}>
                14 dias grátis
              </div>

              <div style={{ marginBottom: "20px" }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{
                    fontSize: "12px", color: "#1a1a1a",
                    marginBottom: "7px", display: "flex", alignItems: "center",
                  }}>
                    <Dot />
                    {f}
                  </div>
                ))}
              </div>

              <button
                disabled={isCurrent}
                style={{
                  width: "100%", padding: "10px", borderRadius: "8px",
                  fontSize: "13px", fontWeight: 500,
                  cursor: isCurrent ? "default" : "pointer",
                  border: "none",
                  background: isCurrent ? "#e8e6e0" : "#0F6E56",
                  color: isCurrent ? "#888" : "#fff",
                  transition: "background .15s",
                }}
              >
                {isCurrent ? "Plano atual" : `Assinar ${plan.name}`}
              </button>
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: "12px", color: "#888", marginTop: "20px" }}>
        Sem cartão de crédito no trial · Cancele quando quiser · Dados protegidos
      </p>
    </PageShell>
  )
}
