'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Button from '@/components/ui/Button'

const PLANS = {
  monthly: [
    {
      id: 'pro-monthly',
      name: 'Lore Pro',
      price: 180,
      period: 'mês',
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY ?? '',
      features: [
        'RAG ilimitado',
        '5 projetos',
        'Upload de PDFs e DOCXs',
        'Chat com IA',
        'Suporte por e-mail',
      ],
      highlight: false,
      badge: null,
    },
    {
      id: 'business-monthly',
      name: 'Lore Business',
      price: 290,
      period: 'mês',
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY ?? '',
      features: [
        'Tudo do Pro',
        'Projetos ilimitados',
        'Acesso à API',
        'Suporte prioritário',
        'Relatórios avançados',
      ],
      highlight: true,
      badge: 'Mais popular',
    },
  ],
  annual: [
    {
      id: 'pro-annual',
      name: 'Lore Pro',
      price: 1800,
      period: 'ano',
      equivalent: 'R$\u00a0150/mês',
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL ?? '',
      features: [
        'RAG ilimitado',
        '5 projetos',
        'Upload de PDFs e DOCXs',
        'Chat com IA',
        'Suporte por e-mail',
      ],
      highlight: false,
      badge: 'Economize 17%',
    },
    {
      id: 'business-annual',
      name: 'Lore Business',
      price: 2900,
      period: 'ano',
      equivalent: 'R$\u00a0241/mês',
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL ?? '',
      features: [
        'Tudo do Pro',
        'Projetos ilimitados',
        'Acesso à API',
        'Suporte prioritário',
        'Relatórios avançados',
      ],
      highlight: true,
      badge: 'Mais popular',
    },
  ],
} as const

type BillingCycle = 'monthly' | 'annual'

async function startCheckout(priceId: string, setLoading: (v: boolean) => void) {
  setLoading(true)
  try {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/v1/billing/create-checkout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          price_id: priceId,
          success_url: `${window.location.origin}/billing/success`,
          cancel_url: `${window.location.origin}/billing`,
        }),
      },
    )

    if (!res.ok) throw new Error('Checkout failed')
    const { checkout_url } = await res.json()
    window.location.href = checkout_url
  } catch {
    setLoading(false)
  }
}

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <circle cx="8" cy="8" r="7.5" stroke="currentColor" strokeOpacity="0.2" />
      <path
        d="M5 8l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

type Plan = (typeof PLANS)['monthly'][number] | (typeof PLANS)['annual'][number]

function PlanCard({ plan, cycle }: { plan: Plan; cycle: BillingCycle }) {
  const [loading, setLoading] = useState(false)
  const annualPlan = plan as (typeof PLANS)['annual'][number]
  const equivalent = 'equivalent' in annualPlan ? annualPlan.equivalent : undefined

  return (
    <div
      className={`
        relative flex flex-col rounded-2xl transition-all duration-300
        ${
          plan.highlight
            ? 'bg-[#0F6E56] text-white shadow-2xl shadow-[#0F6E56]/25 scale-[1.02]'
            : 'bg-surface border border-stone/60 shadow-sm hover:shadow-md hover:-translate-y-0.5'
        }
      `}
    >
      {/* Top badges row */}
      <div className="flex items-start justify-between p-7 pb-0">
        {/* Cancellation badge */}
        <span
          className={`
            inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full
            ${plan.highlight ? 'bg-white/15 text-white' : 'bg-brand-light text-brand'}
          `}
        >
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Cancele quando quiser
        </span>

        {/* Popular / save badge */}
        {plan.badge && (
          <span
            className={`
              text-xs font-bold px-2.5 py-1 rounded-full
              ${
                plan.badge === 'Mais popular'
                  ? plan.highlight
                    ? 'bg-white text-[#0F6E56]'
                    : 'bg-[#0F6E56] text-white'
                  : plan.highlight
                    ? 'bg-white/15 text-white'
                    : 'bg-brand-light text-brand font-semibold'
              }
            `}
          >
            {plan.badge}
          </span>
        )}
      </div>

      {/* Plan name & price */}
      <div className="px-7 pt-5 pb-6">
        <h3
          className={`font-serif text-xl mb-4 ${plan.highlight ? 'text-white' : 'text-ink'}`}
        >
          {plan.name}
        </h3>

        <div className="flex items-end gap-1.5">
          <span
            className={`text-sm font-medium ${plan.highlight ? 'text-white/70' : 'text-stone'} mb-1`}
          >
            R$
          </span>
          <span
            className={`font-sans font-bold leading-none tracking-tight ${
              plan.highlight ? 'text-white' : 'text-ink'
            }`}
            style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)' }}
          >
            {plan.price.toLocaleString('pt-BR')}
          </span>
          <span
            className={`text-sm mb-1 ${plan.highlight ? 'text-white/70' : 'text-stone'}`}
          >
            /{plan.period}
          </span>
        </div>

        {equivalent && (
          <p
            className={`text-xs mt-1.5 ${plan.highlight ? 'text-white/60' : 'text-stone'}`}
          >
            equivale a {equivalent}
          </p>
        )}
      </div>

      {/* Divider */}
      <div
        className={`mx-7 h-px ${plan.highlight ? 'bg-white/15' : 'bg-stone/40'}`}
      />

      {/* Features */}
      <ul className="flex flex-col gap-3 px-7 py-6">
        {plan.features.map((feature) => (
          <li
            key={feature}
            className={`flex items-center gap-3 text-sm ${
              plan.highlight ? 'text-white/90' : 'text-ink'
            }`}
          >
            <span className={plan.highlight ? 'text-brand-mid' : 'text-brand'}>
              <CheckIcon />
            </span>
            {feature}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="px-7 pb-7 mt-auto">
        <button
          onClick={() => startCheckout(plan.priceId, setLoading)}
          disabled={loading}
          className={`
            w-full h-12 rounded-xl font-semibold text-sm transition-all duration-200
            flex items-center justify-center gap-2
            disabled:opacity-60 disabled:cursor-not-allowed
            ${
              plan.highlight
                ? 'bg-white text-[#0F6E56] hover:bg-parchment active:bg-parchment shadow-sm hover:shadow-md'
                : 'bg-[#0F6E56] text-white hover:bg-[#085041] active:bg-[#085041] shadow-sm hover:shadow-md'
            }
          `}
        >
          {loading ? (
            <>
              <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Aguarde...
            </>
          ) : (
            'Assinar agora'
          )}
        </button>
      </div>
    </div>
  )
}

export default function BillingPage() {
  const [cycle, setCycle] = useState<BillingCycle>('monthly')

  return (
    <main className="min-h-screen bg-parchment">
      {/* Subtle grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
        }}
      />

      <div className="relative max-w-3xl mx-auto px-6 py-20">

        {/* Header */}
        <div className="text-center mb-12">
          {/* Ornamental rule */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-px w-12 bg-stone/70" />
            <span className="text-brand text-xs font-semibold tracking-[0.18em] uppercase">
              Planos
            </span>
            <div className="h-px w-12 bg-stone/70" />
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl text-ink leading-tight tracking-tight mb-4">
            Conhecimento ao alcance
            <br />
            <em className="not-italic text-[#0F6E56]">da sua equipe</em>
          </h1>

          <p className="text-base text-[#7A7870] max-w-md mx-auto leading-relaxed">
            Faça o upgrade e desbloqueie todos os recursos.
            Cancele quando quiser.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center mb-10">
          <div className="inline-flex items-center bg-surface border border-stone/50 rounded-full p-1 shadow-sm">
            <button
              onClick={() => setCycle('monthly')}
              className={`
                px-5 h-9 rounded-full text-sm font-medium transition-all duration-200
                ${
                  cycle === 'monthly'
                    ? 'bg-ink text-white shadow-sm'
                    : 'text-[#7A7870] hover:text-ink'
                }
              `}
            >
              Mensal
            </button>
            <button
              onClick={() => setCycle('annual')}
              className={`
                px-5 h-9 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2
                ${
                  cycle === 'annual'
                    ? 'bg-ink text-white shadow-sm'
                    : 'text-[#7A7870] hover:text-ink'
                }
              `}
            >
              Anual
              {cycle !== 'annual' && (
                <span className="text-[10px] font-bold bg-brand-light text-brand px-1.5 py-0.5 rounded-full">
                  −17%
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {PLANS[cycle].map((plan) => (
            <PlanCard key={plan.id} plan={plan} cycle={cycle} />
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-[#7A7870] mt-10 leading-relaxed">
          Pagamentos processados com segurança pelo Stripe.
          <br />
          Sem fidelidade — cancele a qualquer momento sem taxas ou penalidades.
        </p>
      </div>
    </main>
  )
}
