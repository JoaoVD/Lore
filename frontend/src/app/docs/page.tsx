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

function ChatMockup() {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-stone/30 overflow-hidden max-w-lg mx-auto md:mx-0">
      <div className="bg-brand px-4 py-3 flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
        <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
        <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
        <span className="text-white/80 text-xs ml-2 font-medium">Lore Docs — Menezes Contabilidade</span>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex justify-end">
          <div className="bg-brand-light text-ink text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-xs">
            Qual o prazo para entrega das obrigações do Simples Nacional em março?
          </div>
        </div>
        <div className="flex justify-start">
          <div className="space-y-2 max-w-sm">
            <div className="bg-parchment text-ink text-sm px-4 py-2.5 rounded-2xl rounded-tl-sm leading-relaxed">
              Conforme o calendário fiscal 2024 (pág. 12), o prazo é dia <strong>20 de março</strong>. O recolhimento deve ser feito via DAS até essa data.
            </div>
            <div className="inline-flex items-center gap-1.5 bg-brand-light text-brand text-xs px-3 py-1.5 rounded-full font-medium">
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
                <path d="M4 2a1 1 0 011-1h6a1 1 0 011 1v1h1a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1h1V2zM5 2v1h6V2H5zm8 2H3v10h10V4z" />
              </svg>
              Fonte: Calendário Fiscal 2024.pdf
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 border border-stone/40 rounded-xl px-4 py-2.5 mt-2">
          <input
            type="text"
            placeholder="Faça uma pergunta..."
            className="flex-1 text-sm text-ink/60 bg-transparent outline-none"
            readOnly
          />
          <button className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-white" fill="currentColor">
              <path d="M2 8l12-6-6 12V9L2 8z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DocsPage() {
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
                <span className="text-base">📄</span>
                Lore Docs
              </div>
              <h1
                className="text-4xl sm:text-5xl font-bold text-ink leading-tight mb-6"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Seus documentos internos viram{' '}
                <span className="text-brand">respostas instantâneas.</span>
              </h1>
              <p className="text-lg text-ink/70 mb-8 leading-relaxed">
                Sobe uma vez. Qualquer funcionário pergunta qualquer coisa. A resposta certa aparece em segundos — com a página exata de onde veio.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/auth/signup"
                  className="bg-brand text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-dark transition-colors duration-150 text-base text-center"
                >
                  Começar grátis →
                </Link>
                <button className="bg-white text-ink border border-stone/40 px-6 py-3 rounded-xl font-medium hover:bg-brand-light hover:border-brand/30 hover:text-brand transition-colors duration-150 text-base">
                  Ver demo
                </button>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <ChatMockup />
            </div>
          </div>
        </section>

        {/* O problema que resolve */}
        <section className="bg-brand-light py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <RevealSection>
              <h2
                className="text-3xl sm:text-4xl font-bold text-center text-ink mb-4"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Sua equipe perde tempo procurando informação todo dia.
              </h2>
              <p className="text-center text-ink/60 mb-12 max-w-xl mx-auto">
                O Lore Docs elimina essa fricção de uma vez por todas.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    problem: '"Qual o prazo do IRPF?" — liga pro contador',
                    solution: 'Pergunta pro Lore, resposta em 3 segundos com a fonte citada',
                  },
                  {
                    problem: 'Novo funcionário leva semanas aprendendo o negócio',
                    solution: 'Consulta o Lore e aprende na hora, do primeiro dia',
                  },
                  {
                    problem: 'Informação guardada só na cabeça do sócio',
                    solution: 'Documentada e acessível para toda a equipe, sempre',
                  },
                ].map(({ problem, solution }, i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 border border-stone/30 shadow-sm space-y-4">
                    <div className="flex items-start gap-3">
                      <span className="text-red-500 font-bold text-lg leading-none mt-0.5">✗</span>
                      <p className="text-ink/70 text-sm leading-relaxed">{problem}</p>
                    </div>
                    <div className="border-t border-stone/30 pt-4 flex items-start gap-3">
                      <span className="text-brand font-bold text-lg leading-none mt-0.5">✓</span>
                      <p className="text-ink text-sm leading-relaxed font-medium">{solution}</p>
                    </div>
                  </div>
                ))}
              </div>
            </RevealSection>
          </div>
        </section>

        {/* Funciona para */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <RevealSection>
            <h2
              className="text-3xl sm:text-4xl font-bold text-center text-ink mb-4"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Funciona para
            </h2>
            <p className="text-center text-ink/60 mb-12 max-w-xl mx-auto">
              Se a sua empresa trabalha com documentos, o Lore Docs funciona.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { icon: '📊', label: 'Contabilidade' },
                { icon: '⚖️', label: 'Advocacia' },
                { icon: '🏥', label: 'Clínicas' },
                { icon: '🎓', label: 'Escolas' },
                { icon: '🏢', label: 'Qualquer empresa' },
                { icon: '🔬', label: 'Consultorias' },
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

        {/* Como configurar */}
        <section className="bg-brand-light py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <RevealSection>
              <h2
                className="text-3xl sm:text-4xl font-bold text-center text-ink mb-4"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Como configurar
              </h2>
              <p className="text-center text-ink/60 mb-14 max-w-lg mx-auto">
                Três passos. Menos de 10 minutos.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  {
                    step: '01',
                    title: 'Cria um projeto no Lore',
                    desc: 'Dá um nome, escolhe quem vai ter acesso e está pronto para começar.',
                  },
                  {
                    step: '02',
                    title: 'Sobe PDFs, Word ou conecta Google Drive',
                    desc: 'Arrasta os arquivos ou sincroniza sua pasta do Drive. O Lore processa tudo automaticamente.',
                  },
                  {
                    step: '03',
                    title: 'Convida a equipe com o nível de acesso certo',
                    desc: 'Define quem pode ver o quê. Cada membro começa a perguntar imediatamente.',
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

        {/* Preços */}
        <section id="precos" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <RevealSection>
            <h2
              className="text-3xl sm:text-4xl font-bold text-center text-ink mb-4"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Preços simples e diretos
            </h2>
            <p className="text-center text-ink/60 mb-12 max-w-xl mx-auto">
              14 dias grátis em qualquer plano. Sem cartão de crédito.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <div className="bg-white rounded-2xl p-8 border border-stone/30 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-ink/40 mb-2">Pro</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-ink">R$ 180</span>
                  <span className="text-ink/50 text-sm">/mês</span>
                </div>
                <ul className="space-y-3 text-sm text-ink/70 mb-8">
                  {['5 projetos', 'Documentos ilimitados', '5 usuários', 'Suporte por e-mail'].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="text-brand">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/signup"
                  className="block w-full bg-brand-light text-brand text-center px-4 py-3 rounded-xl font-medium hover:bg-brand hover:text-white transition-colors duration-150 text-sm"
                >
                  Começar grátis
                </Link>
              </div>
              <div className="bg-brand rounded-2xl p-8 shadow-lg relative">
                <div className="absolute top-4 right-4 bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  Popular
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Business</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-white">R$ 290</span>
                  <span className="text-white/60 text-sm">/mês</span>
                </div>
                <ul className="space-y-3 text-sm text-white/80 mb-8">
                  {['Projetos ilimitados', 'Usuários ilimitados', 'Google Drive sync', 'Suporte prioritário'].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="text-brand-mid">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/signup"
                  className="block w-full bg-white text-brand text-center px-4 py-3 rounded-xl font-medium hover:bg-brand-light transition-colors duration-150 text-sm"
                >
                  Começar grátis
                </Link>
              </div>
            </div>
          </RevealSection>
        </section>

        {/* CTA final */}
        <section className="bg-brand py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <RevealSection>
              <h2
                className="text-3xl sm:text-4xl font-bold text-white mb-4"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Comece a responder perguntas em minutos.
              </h2>
              <p className="text-white/70 mb-8 text-lg">
                14 dias grátis · Sem cartão de crédito
              </p>
              <Link
                href="/auth/signup"
                className="inline-block bg-white text-brand px-8 py-4 rounded-xl font-medium hover:bg-brand-light transition-colors duration-150 text-base"
              >
                Começar 14 dias grátis →
              </Link>
            </RevealSection>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
