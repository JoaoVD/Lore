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
        <span className="text-white/80 text-xs ml-2 font-medium">Lore Estoq — Casa das Tintas</span>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex justify-end">
          <div className="bg-brand-light text-ink text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-xs">
            Tem cimento CP-II 50kg disponível?
          </div>
        </div>
        <div className="flex justify-start">
          <div className="space-y-2 max-w-sm">
            <div className="bg-parchment text-ink text-sm px-4 py-2.5 rounded-2xl rounded-tl-sm leading-relaxed">
              Sim! Temos <strong>147 sacos</strong> em estoque. Preço: <strong>R$ 38,90/saco</strong>. Disponível para pronta entrega.
            </div>
            <div className="inline-flex items-center gap-1.5 bg-brand-light text-brand text-xs px-3 py-1.5 rounded-full font-medium">
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1a6 6 0 110 12A6 6 0 018 2zm0 2a1 1 0 100 2 1 1 0 000-2zm0 3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 7z" />
              </svg>
              Fonte: Sistema de Estoque — consultado agora
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 border border-stone/40 rounded-xl px-4 py-2.5 mt-2">
          <input
            type="text"
            placeholder="Consulte o estoque..."
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

export default function EstoqPage() {
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
                <span className="text-base">📦</span>
                Lore Estoq
              </div>
              <h1
                className="text-4xl sm:text-5xl font-bold text-ink leading-tight mb-6"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Seu vendedor pergunta.{' '}
                <span className="text-brand">O estoque responde.</span>
              </h1>
              <p className="text-lg text-ink/70 mb-8 leading-relaxed">
                Conecta o Lore direto no seu sistema. Seus vendedores consultam disponibilidade e preço em linguagem natural — em segundos, sem navegar em tela nenhuma.
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
                Seu vendedor trava na hora de fechar a venda.
              </h2>
              <p className="text-center text-ink/60 mb-12 max-w-xl mx-auto">
                O Lore Estoq elimina o atrito entre o cliente e o fechamento.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    problem: '"Aguarda um momento..." — vai buscar no sistema',
                    solution: 'Digita pro Lore, resposta em 2 segundos. Cliente não espera.',
                  },
                  {
                    problem: 'Novo vendedor leva semanas aprendendo o sistema',
                    solution: 'Consulta em linguagem natural desde o primeiro dia de trabalho',
                  },
                  {
                    problem: 'Cliente esperando enquanto vendedor navega em 5 telas',
                    solution: 'Cliente recebe resposta imediata. Venda fechada na hora.',
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

        {/* Funciona com qualquer sistema */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <RevealSection>
            <h2
              className="text-3xl sm:text-4xl font-bold text-center text-ink mb-4"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Funciona com qualquer sistema
            </h2>
            <p className="text-center text-ink/60 mb-4 max-w-xl mx-auto">
              Se tem API, o Lore conecta.
            </p>
            <p className="text-center text-ink/50 text-sm mb-12 max-w-lg mx-auto">
              Configuração simples: URL da API, token de autenticação e nome dos campos. Pronto.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {['Bling', 'Omie', 'Totvs', 'Tiny', 'Mercos', 'Sistema próprio'].map((name) => (
                <div
                  key={name}
                  className="bg-white rounded-xl py-4 px-3 border border-stone/30 text-center shadow-sm hover:border-brand/30 hover:shadow-md transition-all duration-200"
                >
                  <p className="font-semibold text-ink text-sm">{name}</p>
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
                Três passos. Menos de 15 minutos.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  {
                    step: '01',
                    title: 'Cria um projeto no Lore Estoq',
                    desc: 'Dá um nome para o projeto e define quem vai ter acesso na sua equipe de vendas.',
                  },
                  {
                    step: '02',
                    title: 'Configura conexão com sua API',
                    desc: 'Informa a URL base, o token de autenticação e os nomes dos campos de estoque e preço.',
                  },
                  {
                    step: '03',
                    title: 'Vendedores já consultam em linguagem natural',
                    desc: 'Sem treinamento adicional. Qualquer pessoa da equipe já consegue perguntar e receber respostas.',
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

        {/* Para quais empresas */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <RevealSection>
            <h2
              className="text-3xl sm:text-4xl font-bold text-center text-ink mb-4"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Para quais empresas
            </h2>
            <p className="text-center text-ink/60 mb-12 max-w-xl mx-auto">
              Qualquer negócio com catálogo extenso e equipe de vendas se beneficia.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { icon: '🏗️', label: 'Material de construção' },
                { icon: '📦', label: 'Distribuidoras' },
                { icon: '🌾', label: 'Agropecuárias' },
                { icon: '💊', label: 'Farmácias' },
                { icon: '🔧', label: 'Peças e autopeças' },
                { icon: '🛒', label: 'Catálogo extenso' },
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

        {/* Preços */}
        <section id="precos" className="bg-brand-light py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
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
                    {['1 integração de API', '5 usuários', 'Consultas ilimitadas', 'Suporte por e-mail'].map((f) => (
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
                    {['Integrações ilimitadas', 'Usuários ilimitados', 'Múltiplos sistemas', 'Suporte prioritário'].map((f) => (
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
                Pronto para fechar mais vendas?
              </h2>
              <p className="text-white/70 mb-10 text-lg">
                14 dias grátis · Sem cartão de crédito
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/auth/signup"
                  className="bg-white text-brand px-6 py-3 rounded-xl font-medium hover:bg-brand-light transition-colors duration-150 text-base"
                >
                  Começar 14 dias grátis
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
