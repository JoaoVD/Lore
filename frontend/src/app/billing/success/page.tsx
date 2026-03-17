'use client'

import Link from 'next/link'

export default function BillingSuccessPage() {
  return (
    <main className="min-h-screen bg-parchment flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-light mb-6">
          <svg
            className="w-8 h-8 text-brand"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="h-px w-8 bg-stone/70" />
          <span className="text-brand text-xs font-semibold tracking-[0.18em] uppercase">
            Assinatura ativa
          </span>
          <div className="h-px w-8 bg-stone/70" />
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl text-ink mb-3 leading-tight">
          Bem-vindo ao Lore
        </h1>

        <p className="text-[#7A7870] text-base leading-relaxed mb-8">
          Sua assinatura está ativa e seu período de teste gratuito de
          14 dias começa agora. Explore tudo que o Lore tem a oferecer.
        </p>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-xl bg-[#0F6E56] text-white font-semibold text-sm hover:bg-[#085041] transition-colors shadow-sm hover:shadow-md"
        >
          Ir para o dashboard
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M3 8h10M9 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </main>
  )
}
