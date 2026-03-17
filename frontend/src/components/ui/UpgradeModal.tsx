'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { UpgradeError } from '@/types'

const PLAN_FEATURES = {
  pro: {
    name: 'Pro',
    price: 'R$180',
    period: '/mês',
    color: '#0F6E56',
    features: ['5 projetos', '50 docs por projeto', '1.000 perguntas/mês', 'Widget embeddable'],
  },
  business: {
    name: 'Business',
    price: 'R$290',
    period: '/mês',
    color: '#0a4f3e',
    features: ['Projetos ilimitados', 'Docs ilimitados', '5.000 perguntas/mês', 'Widget embeddable'],
  },
}

const ERROR_ICONS: Record<string, JSX.Element> = {
  project_limit_reached: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
    </svg>
  ),
  document_limit_reached: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
    </svg>
  ),
  question_limit_reached: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  widget_access_denied: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
}

const DEFAULT_ICON = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)

export default function UpgradeModal() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<UpgradeError | null>(null)
  const [visible, setVisible] = useState(false)

  const open = useCallback((detail: UpgradeError) => {
    setError(detail)
    setIsOpen(true)
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const close = useCallback(() => {
    setVisible(false)
    setTimeout(() => {
      setIsOpen(false)
      setError(null)
    }, 220)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as UpgradeError
      if (detail) open(detail)
    }
    window.addEventListener('upgrade-required', handler)
    return () => window.removeEventListener('upgrade-required', handler)
  }, [open])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, close])

  if (!isOpen) return null

  const currentPlan = error?.current_plan ?? 'free'
  const plansToShow = currentPlan === 'pro' ? ['business'] : ['pro', 'business']
  const icon = error?.error ? (ERROR_ICONS[error.error] ?? DEFAULT_ICON) : DEFAULT_ICON

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: `rgba(0,0,0,${visible ? 0.45 : 0})`,
        transition: 'background-color 220ms ease',
        backdropFilter: visible ? 'blur(3px)' : 'blur(0px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)',
          transition: 'opacity 220ms ease, transform 220ms ease',
        }}
      >
        {/* Top accent stripe */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #0F6E56, #1a9e7a)' }} />

        <div className="p-6 pb-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0"
                style={{ backgroundColor: '#f0faf7', color: '#0F6E56' }}
              >
                {icon}
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900 leading-tight">Limite atingido</h2>
                <span
                  className="inline-block mt-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: '#f0faf7', color: '#0F6E56' }}
                >
                  Plano {currentPlan === 'free' ? 'Gratuito' : currentPlan === 'pro' ? 'Pro' : 'Business'}
                </span>
              </div>
            </div>
            <button
              onClick={close}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0 mt-0.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Message */}
          <p className="text-[13.5px] text-gray-600 leading-relaxed mb-5">
            {error?.message ?? 'Faça upgrade do seu plano para continuar usando este recurso.'}
          </p>

          {/* Plan cards */}
          <div className={`grid gap-3 mb-5 ${plansToShow.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {plansToShow.map((planKey) => {
              const plan = PLAN_FEATURES[planKey as keyof typeof PLAN_FEATURES]
              const isHighlighted = planKey === 'pro'
              return (
                <div
                  key={planKey}
                  className="relative rounded-xl p-4 border"
                  style={{
                    borderColor: isHighlighted ? '#0F6E56' : '#e5e7eb',
                    backgroundColor: isHighlighted ? '#f0faf7' : '#fafafa',
                  }}
                >
                  {isHighlighted && (
                    <span
                      className="absolute -top-2.5 left-3 text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: '#0F6E56' }}
                    >
                      Recomendado
                    </span>
                  )}
                  <div className="mb-2.5">
                    <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">{plan.name}</span>
                    <div className="flex items-baseline gap-0.5 mt-0.5">
                      <span className="text-xl font-bold text-gray-900">{plan.price}</span>
                      <span className="text-[11px] text-gray-400">{plan.period}</span>
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-[12px] text-gray-600">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-2.5">
            <button
              onClick={() => { close(); router.push('/billing') }}
              className="flex-1 py-2.5 rounded-xl text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
              style={{ backgroundColor: '#0F6E56' }}
            >
              Ver planos
            </button>
            <button
              onClick={close}
              className="px-4 py-2.5 rounded-xl text-[13.5px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
