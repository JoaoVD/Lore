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
      { threshold: 0.12 }
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

export default function HomePage() {
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
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 bg-brand-light text-brand text-xs font-semibold px-3 py-1.5 rounded-full mb-6 tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-mid inline-block" />
            Nova plataforma
          </div>
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-ink leading-tight mb-6 max-w-3xl mx-auto"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Sua empresa pergunta.{' '}
            <span className="text-brand">O Lore responde.</span>
          </h1>
          <p className="text-lg sm:text-xl text-ink/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            Dois produtos. Uma plataforma. Zero tempo perdido procurando informação.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/docs"
              className="bg-brand text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-dark transition-colors duration-150 text-base"
            >
              Conhecer Lore Docs →
            </Link>
            <Link
              href="/estoq"
              className="bg-white text-brand border border-brand/30 px-6 py-3 rounded-xl font-medium hover:bg-brand-light transition-colors duration-150 text-base"
            >
              Conhecer Lore Estoq →
            </Link>
          </div>
        </section>

        {/* Dois produtos */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <RevealSection>
            <h2
              className="text-3xl sm:text-4xl font-bold text-center text-ink mb-4"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Dois produtos, um problema
            </h2>
            <p className="text-center text-ink/60 mb-12 max-w-xl mx-auto">
              Informação espalhada custa tempo e dinheiro. O Lore centraliza tudo.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-8 border border-stone/30 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="text-4xl mb-4">📄</div>
                <div className="inline-block bg-brand-light text-brand text-xs font-semibold px-2.5 py-1 rounded-full mb-3 uppercase tracking-wide">
                  Para qualquer empresa
                </div>
                <h3 className="text-xl font-bold text-ink mb-3" style={{ fontFamily: 'var(--font-serif)' }}>
                  Lore Docs
                </h3>
                <p className="text-ink/70 text-sm mb-4 leading-relaxed">
                  Seus documentos internos viram respostas instantâneas. Sobe uma vez, qualquer funcionário pergunta qualquer coisa.
                </p>
                <ul className="text-sm text-ink/70 space-y-2 mb-6">
                  {['Manuais e procedimentos internos', 'Calendários fiscais e prazos', 'Onboarding de novos funcionários', 'Base de conhecimento da empresa'].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-brand-mid mt-0.5">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/docs" className="text-brand font-medium text-sm hover:text-brand-dark transition-colors duration-150">
                  Ver Lore Docs →
                </Link>
              </div>

              <div className="bg-white rounded-2xl p-8 border border-stone/30 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="text-4xl mb-4">📦</div>
                <div className="inline-block bg-brand-light text-brand text-xs font-semibold px-2.5 py-1 rounded-full mb-3 uppercase tracking-wide">
                  Para varejo e atacado
                </div>
                <h3 className="text-xl font-bold text-ink mb-3" style={{ fontFamily: 'var(--font-serif)' }}>
                  Lore Estoq
                </h3>
                <p className="text-ink/70 text-sm mb-4 leading-relaxed">
                  Conecta direto no seu sistema. Seus vendedores consultam disponibilidade e preço em linguagem natural.
                </p>
                <ul className="text-sm text-ink/70 space-y-2 mb-6">
                  {['Consulta de estoque em tempo real', 'Preços e condições de pagamento', 'Disponibilidade para pronta entrega', 'Integração com Bling, Omie, Totvs e mais'].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-brand-mid mt-0.5">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/estoq" className="text-brand font-medium text-sm hover:text-brand-dark transition-colors duration-150">
                  Ver Lore Estoq →
                </Link>
              </div>
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
                Como funciona
              </h2>
              <p className="text-center text-ink/60 mb-14 max-w-xl mx-auto">
                Simples de configurar. Poderoso no dia a dia.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  {
                    step: '01',
                    icon: (
                      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none" stroke="white" strokeWidth="1.8">
                        <rect x="8" y="6" width="24" height="28" rx="3" />
                        <path d="M14 14h12M14 20h12M14 26h8" strokeLinecap="round" />
                        <circle cx="28" cy="28" r="6" fill="#0F6E56" stroke="white" strokeWidth="1.8" />
                        <path d="M25.5 28l2 2 3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ),
                    title: 'Conecta sua fonte de dados',
                    desc: 'Sobe PDFs, documentos Word, ou conecta sua API de estoque. Configuração em minutos.',
                  },
                  {
                    step: '02',
                    icon: (
                      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none" stroke="white" strokeWidth="1.8">
                        <path d="M7 27h26a2 2 0 002-2V11a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        <path d="M13 31h14M20 27v4" strokeLinecap="round" />
                        <path d="M12 16h16M12 21h10" strokeLinecap="round" />
                      </svg>
                    ),
                    title: 'Qualquer funcionário pergunta em português',
                    desc: 'Sem treinamento, sem comandos especiais. Só digitar a pergunta como falaria com um colega.',
                  },
                  {
                    step: '03',
                    icon: (
                      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none" stroke="white" strokeWidth="1.8">
                        <circle cx="20" cy="20" r="13" />
                        <path d="M20 13v7l4 2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ),
                    title: 'Resposta em segundos com a fonte citada',
                    desc: 'O Lore responde e mostra de onde veio a informação. Transparente e confiável.',
                  },
                ].map(({ step, icon, title, desc }) => (
                  <div key={step} className="flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-brand flex items-center justify-center shadow-md">
                      {icon}
                    </div>
                    <span className="text-xs font-bold text-brand/60 tracking-widest uppercase">{step}</span>
                    <h3 className="font-bold text-ink text-lg leading-snug">{title}</h3>
                    <p className="text-ink/60 text-sm leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </RevealSection>
          </div>
        </section>

        {/* Prova social */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <RevealSection>
            <h2
              className="text-3xl sm:text-4xl font-bold text-center text-ink mb-4"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Feito para PMEs brasileiras
            </h2>
            <p className="text-center text-ink/60 mb-12 max-w-xl mx-auto">
              Empresas reais economizando tempo real todo dia.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  quote: 'Antes eu atendia 5 ligações por dia com dúvidas sobre prazos fiscais. Agora minha equipe consulta o Lore direto. Economizei horas toda semana.',
                  name: 'Carlos Menezes',
                  role: 'Menezes Contabilidade',
                  initial: 'CM',
                },
                {
                  quote: 'Minha equipe jurídica encontra qualquer cláusula de contrato em segundos. O Lore cita a página exata. É como ter um assistente que leu tudo.',
                  name: 'Dra. Beatriz Leal',
                  role: 'Leal & Associados',
                  initial: 'BL',
                },
                {
                  quote: 'Meus vendedores consultam estoque sem precisar abrir o sistema. Cliente pergunta, vendedor responde na hora. Minhas vendas aumentaram 20%.',
                  name: 'Roberto Alves',
                  role: 'Casa das Tintas',
                  initial: 'RA',
                },
              ].map(({ quote, name, role, initial }) => (
                <div key={name} className="bg-white rounded-2xl p-7 border border-stone/30 shadow-sm flex flex-col gap-4">
                  <p className="text-ink/70 text-sm leading-relaxed flex-1">&ldquo;{quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-light text-brand font-bold text-sm flex items-center justify-center flex-shrink-0">
                      {initial}
                    </div>
                    <div>
                      <p className="font-semibold text-ink text-sm">{name}</p>
                      <p className="text-ink/50 text-xs">{role}</p>
                    </div>
                  </div>
                </div>
              ))}
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
                Pronto para testar?
              </h2>
              <p className="text-white/70 mb-10 text-lg">
                14 dias grátis · Sem cartão de crédito
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/docs"
                  className="bg-white text-brand px-6 py-3 rounded-xl font-medium hover:bg-brand-light transition-colors duration-150 text-base"
                >
                  Começar com Lore Docs
                </Link>
                <Link
                  href="/estoq"
                  className="bg-white/10 text-white border border-white/30 px-6 py-3 rounded-xl font-medium hover:bg-white/20 transition-colors duration-150 text-base"
                >
                  Começar com Lore Estoq
                </Link>
              </div>
            </RevealSection>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
