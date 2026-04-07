'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('reveal-visible')
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}

function RevealSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useReveal()
  return (
    <div ref={ref} className={`reveal-section ${className}`}>
      {children}
    </div>
  )
}

function TemplateMockup() {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-stone/30 overflow-hidden max-w-lg mx-auto md:mx-0">
      <div className="bg-brand px-4 py-3 flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
        <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
        <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
        <span className="text-white/80 text-xs ml-2 font-medium">Lore Jurídico — Leal & Associados</span>
      </div>
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">⚖️</span>
          <span className="text-xs font-semibold text-ink/60 uppercase tracking-wide">Petição Inicial Trabalhista</span>
        </div>
        <div className="space-y-2">
          {[
            { label: 'Nome do reclamante', value: 'João da Silva' },
            { label: 'Empresa reclamada', value: 'Construtora ABC Ltda.' },
            { label: 'Data de admissão', value: '15/03/2021' },
            { label: 'Salário', value: 'R$ 3.500,00' },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-xs text-ink/50">{label}</span>
              <div className="bg-brand-light text-ink text-sm px-3 py-1.5 rounded-lg font-medium">
                {value}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <button className="flex-1 bg-brand text-white text-xs font-semibold px-3 py-2 rounded-lg">
            Gerar documento
          </button>
          <button className="flex-1 bg-brand-light text-brand text-xs font-semibold px-3 py-2 rounded-lg">
            Preencher com IA
          </button>
        </div>
      </div>
    </div>
  )
}

export default function JuridicoPage() {
  return (
    <>
      <style>{`
        .reveal-section {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .reveal-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      <Navbar />

      <main className="min-h-screen bg-parchment font-sans text-ink">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-brand-light text-brand text-xs font-semibold px-3 py-1.5 rounded-full mb-6 tracking-wide uppercase">
                <span className="text-base">⚖️</span>
                Lore Jurídico
              </div>
              <h1
                className="text-4xl sm:text-5xl font-bold text-ink leading-tight mb-6"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Seu escritório mais{' '}
                <span className="text-brand">produtivo.</span>
              </h1>
              <p className="text-lg text-ink/70 mb-8 leading-relaxed">
                Templates prontos de petições, contratos e procurações. Preencha as variáveis e gere o documento em segundos — com sugestão de cláusulas por IA.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/auth/signup"
                  className="bg-brand text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-dark transition-colors duration-150 text-base text-center"
                >
                  Começar grátis →
                </Link>
                <button className="bg-white text-ink border border-stone/40 px-6 py-3 rounded-xl font-medium hover:bg-brand-light hover:border-brand/30 hover:text-brand transition-colors duration-150 text-base">
                  Falar com especialista
                </button>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <TemplateMockup />
            </div>
          </div>
        </section>

        {/* 3 features */}
        <section className="bg-brand-light py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <RevealSection>
              <h2
                className="text-3xl sm:text-4xl font-bold text-center text-ink mb-4"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Tudo que um escritório precisa
              </h2>
              <p className="text-center text-ink/60 mb-12 max-w-xl mx-auto">
                Do template ao documento final em menos de dois minutos.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    icon: '📋',
                    title: 'Templates prontos',
                    desc: 'Petições trabalhistas, contratos de honorários, procurações e muito mais. Modelos revisados e prontos para uso imediato.',
                    items: ['Petição Inicial Trabalhista', 'Contrato de Honorários', 'Procuração Ad Judicia', 'Notificação Extrajudicial'],
                  },
                  {
                    icon: '🤖',
                    title: 'Geração com IA',
                    desc: 'Preencha os dados do cliente e deixe a IA sugerir fundamentos jurídicos, cláusulas padrão e argumentações técnicas.',
                    items: ['Fundamentos jurídicos automáticos', 'Sugestão de cláusulas', 'Preview em tempo real', 'Revisão antes de gerar'],
                  },
                  {
                    icon: '⚖️',
                    title: 'Busca em jurisprudência',
                    desc: 'Em breve — consulte precedentes e jurisprudência diretamente no Lore para embasar suas peças com mais segurança.',
                    items: ['STF e STJ', 'TRT por região', 'Súmulas e OJs', 'Citação automática'],
                  },
                ].map(({ icon, title, desc, items }) => (
                  <div key={title} className="bg-white rounded-2xl p-8 border border-stone/30 shadow-sm">
                    <div className="text-4xl mb-4">{icon}</div>
                    <h3 className="text-xl font-bold text-ink mb-3" style={{ fontFamily: 'var(--font-serif)' }}>
                      {title}
                    </h3>
                    <p className="text-ink/70 text-sm mb-4 leading-relaxed">{desc}</p>
                    <ul className="text-sm text-ink/70 space-y-2">
                      {items.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="text-brand-mid mt-0.5">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </RevealSection>
          </div>
        </section>

        {/* Casos de uso */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <RevealSection>
            <h2
              className="text-3xl sm:text-4xl font-bold text-center text-ink mb-4"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Para todos os tipos de causa
            </h2>
            <p className="text-center text-ink/60 mb-12 max-w-xl mx-auto">
              Trabalhista, cível, família — templates para as demandas mais comuns.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { icon: '👷', label: 'Petições trabalhistas' },
                { icon: '📝', label: 'Contratos de honorários' },
                { icon: '✍️', label: 'Procurações' },
                { icon: '📨', label: 'Notificações extrajudiciais' },
                { icon: '🔄', label: 'Recursos e apelações' },
                { icon: '🤝', label: 'Acordos e transações' },
              ].map(({ icon, label }) => (
                <div
                  key={label}
                  className="bg-white rounded-xl p-5 border border-stone/30 flex items-center gap-3 shadow-sm hover:border-brand/30 hover:shadow-md transition-all duration-200"
                >
                  <span className="text-2xl">{icon}</span>
                  <span className="font-medium text-ink text-sm">{label}</span>
                </div>
              ))}
            </div>
          </RevealSection>
        </section>

        {/* Como funciona */}
        <section className="bg-brand-light py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <RevealSection>
              <h2
                className="text-3xl sm:text-4xl font-bold text-center text-ink mb-4"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Do template ao documento
              </h2>
              <p className="text-center text-ink/60 mb-14 max-w-lg mx-auto">
                Três passos. Menos de dois minutos.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  {
                    step: '01',
                    title: 'Escolha o template',
                    desc: 'Petição, contrato ou procuração — selecione o modelo adequado para o caso.',
                  },
                  {
                    step: '02',
                    title: 'Preencha as variáveis',
                    desc: 'Informe os dados do cliente. A IA sugere automaticamente fundamentos jurídicos e cláusulas técnicas.',
                  },
                  {
                    step: '03',
                    title: 'Gere e exporte',
                    desc: 'Documento gerado instantaneamente. Copie, exporte ou edite antes de protocolar.',
                  },
                ].map(({ step, title, desc }) => (
                  <div key={step} className="flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-brand text-white font-bold text-lg flex items-center justify-center shadow-md">
                      {step}
                    </div>
                    <h3 className="font-bold text-ink text-base leading-snug">{title}</h3>
                    <p className="text-ink/60 text-sm leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </RevealSection>
          </div>
        </section>

        {/* CTA final */}
        <section className="bg-brand py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <RevealSection>
              <h2
                className="text-3xl sm:text-4xl font-bold text-white mb-4"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Pronto para acelerar seu escritório?
              </h2>
              <p className="text-white/70 mb-10 text-lg">
                14 dias grátis · Sem cartão de crédito
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/auth/signup"
                  className="bg-white text-brand px-6 py-3 rounded-xl font-medium hover:bg-brand-light transition-colors duration-150 text-base"
                >
                  Começar grátis
                </Link>
                <button className="bg-white/10 text-white border border-white/30 px-6 py-3 rounded-xl font-medium hover:bg-white/20 transition-colors duration-150 text-base">
                  Falar com especialista
                </button>
              </div>
            </RevealSection>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
