'use client'

import { useState, useEffect, useRef } from 'react'

// ── Types ──────────────────────────────────────────────────────────
interface Plan {
  name: string
  badge: string
  badgeStyle: React.CSSProperties
  who: string
  monthlyPrice: string
  annualPrice: string
  annualNote: string
  features: { text: string; included: boolean }[]
  ctaLabel: string
  ctaStyle: React.CSSProperties
  featured: boolean
}

interface ChatMessage {
  role: 'user' | 'ai'
  text: string
  sources?: string[]
  initials?: string
}

// ── useScrollReveal ────────────────────────────────────────────────
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

// ── Logo ───────────────────────────────────────────────────────────
function Logo({ size = 'md', variant = 'default' }: { size?: 'sm' | 'md' | 'lg'; variant?: 'default' | 'white' }) {
  const sizes = { sm: { icon: 24, text: 16 }, md: { icon: 30, text: 20 }, lg: { icon: 38, text: 26 } }
  const s = sizes[size]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: s.icon, height: s.icon, borderRadius: Math.round(s.icon * 0.26),
        background: variant === 'white' ? 'rgba(255,255,255,0.15)' : '#0F6E56',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <span style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: s.icon * 0.57, fontWeight: 700, color: '#fff', lineHeight: 1 }}>L</span>
      </div>
      <span style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: s.text, fontWeight: 400, color: variant === 'white' ? 'rgba(255,255,255,0.9)' : '#085041' }}>Lore</span>
    </div>
  )
}

// ── Reveal wrapper ─────────────────────────────────────────────────
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useScrollReveal()
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity 0.65s ${delay}ms ease, transform 0.65s ${delay}ms ease`,
    }}>
      {children}
    </div>
  )
}

// ── CheckIcon ──────────────────────────────────────────────────────
function CheckIcon({ on }: { on: boolean }) {
  return (
    <div style={{
      width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
      background: on ? '#E1F5EE' : '#F1EFE8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {on
        ? <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2 4-4" stroke="#0F6E56" strokeWidth="1.5" strokeLinecap="round" /></svg>
        : <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M2 2l5 5M7 2l-5 5" stroke="#C8C6BC" strokeWidth="1.5" strokeLinecap="round" /></svg>
      }
    </div>
  )
}

// ── DATA ──────────────────────────────────────────────────────────
const CHAT_MESSAGES: ChatMessage[] = [
  { role: 'user', initials: 'VS', text: 'O frete para Campinas está incluso nos pedidos acima de R$800?' },
  {
    role: 'ai', text: 'Sim. Pedidos acima de R$800 têm frete grátis para Campinas e região metropolitana. Para pedidos menores, o frete é calculado por peso — média de R$18 para até 10kg.',
    sources: ['tabela-fretes-2025.pdf · p.3', 'política-comercial.pdf · p.8'],
  },
  { role: 'user', initials: 'VS', text: 'E qual é o prazo de entrega?' },
  {
    role: 'ai', text: 'Para Campinas: 2 dias úteis em pedidos feitos até as 14h. Pedidos após esse horário contam a partir do próximo dia útil.',
    sources: ['prazo-entrega.pdf · p.1'],
  },
]

const PLANS: Plan[] = [
  {
    name: 'Starter', badge: 'Gratuito',
    badgeStyle: { background: '#F1EFE8', color: '#888780' },
    who: 'Para experimentar',
    monthlyPrice: 'R$0', annualPrice: 'R$0', annualNote: 'para sempre',
    features: [
      { text: '1 projeto', included: true },
      { text: 'Até 5 documentos', included: true },
      { text: '50 perguntas/mês', included: true },
      { text: 'Widget embeddable', included: false },
      { text: 'Suporte prioritário', included: false },
    ],
    ctaLabel: 'Começar grátis',
    ctaStyle: { background: 'transparent', color: '#3A3A38', border: '1px solid #C8C6BC' },
    featured: false,
  },
  {
    name: 'Pro', badge: 'Mais popular',
    badgeStyle: { background: '#0F6E56', color: '#fff' },
    who: 'Para pequenas empresas',
    monthlyPrice: 'R$180', annualPrice: 'R$150', annualNote: 'cobrado R$1.800/ano',
    features: [
      { text: '5 projetos', included: true },
      { text: 'Até 50 documentos', included: true },
      { text: '1.000 perguntas/mês', included: true },
      { text: 'Widget embeddable', included: true },
      { text: 'Suporte por e-mail', included: true },
    ],
    ctaLabel: 'Começar trial grátis',
    ctaStyle: { background: '#0F6E56', color: '#fff', border: 'none' },
    featured: true,
  },
  {
    name: 'Business', badge: 'Para times',
    badgeStyle: { background: '#EEEDFE', color: '#3C3489' },
    who: 'Para médias empresas',
    monthlyPrice: 'R$290', annualPrice: 'R$242', annualNote: 'cobrado R$2.900/ano',
    features: [
      { text: 'Projetos ilimitados', included: true },
      { text: 'Documentos ilimitados', included: true },
      { text: '5.000 perguntas/mês', included: true },
      { text: 'Widget embeddable', included: true },
      { text: 'Suporte prioritário (12h)', included: true },
      { text: 'Até 10 usuários + API', included: true },
    ],
    ctaLabel: 'Começar trial grátis',
    ctaStyle: { background: '#3C3489', color: '#fff', border: 'none' },
    featured: false,
  },
]

const TESTIMONIALS = [
  { initials: 'MF', name: 'Maria F.', role: 'Clínica odontológica, SP', quote: '"Minha recepcionista parou de me ligar a cada 10 minutos. Agora ela consulta o Lore e resolve sozinha. Economizei pelo menos 2 horas por dia."' },
  { initials: 'CR', name: 'Carlos R.', role: 'Distribuidora de alimentos, MG', quote: '"Meus vendedores consultam no celular enquanto estão com o cliente. Paramos de perder venda por falta de informação na hora certa."' },
  { initials: 'RT', name: 'Rafael T.', role: 'Escritório de contabilidade, RJ', quote: '"Coloquei o widget no meu site e os clientes tiram dúvidas sozinhos, até de madrugada. Reduzi 60% das perguntas por WhatsApp."' },
]

// ── MAIN COMPONENT ─────────────────────────────────────────────────
export default function LandingPage() {
  const [annual, setAnnual] = useState(false)
  const [navScrolled, setNavScrolled] = useState(false)

  useEffect(() => {
    const fonts = document.createElement('link')
    fonts.rel = 'stylesheet'
    fonts.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400&display=swap'
    document.head.appendChild(fonts)

    const onScroll = () => setNavScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { font-family: 'DM Sans', system-ui, sans-serif; background: #F1EFE8; color: #1C1C1A; line-height: 1.6; }
    ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #F1EFE8; } ::-webkit-scrollbar-thumb { background: #C8C6BC; border-radius: 3px; }
    .nav-link { font-size: 14px; color: #3A3A38; text-decoration: none; transition: color .2s; }
    .nav-link:hover { color: #0F6E56; }
    .btn-primary { display: inline-flex; align-items: center; gap: 8px; background: #0F6E56; color: #fff; padding: 13px 26px; border-radius: 10px; font-size: 15px; font-weight: 500; text-decoration: none; border: none; cursor: pointer; transition: background .2s, transform .15s; font-family: 'DM Sans', sans-serif; }
    .btn-primary:hover { background: #085041; transform: translateY(-1px); }
    .btn-secondary { display: inline-flex; align-items: center; gap: 8px; background: transparent; color: #3A3A38; padding: 13px 26px; border-radius: 10px; font-size: 15px; border: 1px solid #C8C6BC; cursor: pointer; text-decoration: none; transition: border-color .2s, background .2s; font-family: 'DM Sans', sans-serif; }
    .btn-secondary:hover { border-color: #0F6E56; background: #E1F5EE; }
    .plan-card { background: #FAFAF8; border: 1px solid #C8C6BC; border-radius: 14px; overflow: hidden; transition: transform .2s; }
    .plan-card:hover { transform: translateY(-3px); }
    .plan-cta { display: block; width: 100%; padding: 11px; text-align: center; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: opacity .15s, transform .15s; font-family: 'DM Sans', sans-serif; text-decoration: none; }
    .plan-cta:hover { opacity: .88; transform: translateY(-1px); }
    .testi-card { background: #FAFAF8; border: 1px solid #C8C6BC; border-radius: 12px; padding: 22px; }
    .step-card { text-align: center; }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .anim-0 { animation: fadeUp .6s ease both; }
    .anim-1 { animation: fadeUp .6s .1s ease both; }
    .anim-2 { animation: fadeUp .6s .2s ease both; }
    .anim-3 { animation: fadeUp .6s .3s ease both; }
    .anim-4 { animation: fadeUp .6s .4s ease both; }
    @media (max-width: 768px) {
      .nav-links-desk { display: none !important; }
      .hero-h1 { font-size: 42px !important; }
      .hero-actions { flex-direction: column; align-items: center; }
      .three-cols { grid-template-columns: 1fr !important; }
      .two-cols { grid-template-columns: 1fr !important; }
    }
  `

  return (
    <>
      <style>{css}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: navScrolled ? 'rgba(241,239,232,0.93)' : 'rgba(241,239,232,0.75)',
        backdropFilter: 'blur(12px)',
        borderBottom: navScrolled ? '1px solid rgba(200,198,188,0.6)' : '1px solid transparent',
        height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', transition: 'background .3s, border-color .3s',
      }}>
        <a href="#" style={{ textDecoration: 'none' }}><Logo size="md" /></a>
        <div className="nav-links-desk" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <a href="#demo" className="nav-link">Produto</a>
          <a href="#how" className="nav-link">Como funciona</a>
          <a href="#pricing" className="nav-link">Preços</a>
          <a href="/login" className="nav-link">Entrar</a>
          <a href="/register" className="btn-primary" style={{ padding: '7px 18px', fontSize: 14 }}>Começar grátis</a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '100px 40px 80px', position: 'relative', overflow: 'hidden',
      }}>
        {/* bg grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.04,
          backgroundImage: 'linear-gradient(#1C1C1A 1px, transparent 1px), linear-gradient(90deg, #1C1C1A 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
        {/* bg glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(15,110,86,0.07) 0%, transparent 70%)',
        }} />

        <div className="anim-0" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: '#E1F5EE', border: '1px solid rgba(15,110,86,0.2)',
          borderRadius: 99, padding: '5px 14px',
          fontSize: 12, fontWeight: 500, color: '#085041', marginBottom: 32,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#5DCAA5' }} />
          Sem configuração técnica. Pronto em 15 minutos.
        </div>

        <h1 className="hero-h1 anim-1" style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: 'clamp(48px, 7vw, 88px)', fontWeight: 400,
          lineHeight: 1.08, letterSpacing: '-0.02em',
          color: '#1C1C1A', maxWidth: 820, marginBottom: 0,
        }}>
          Your company,{' '}
          <em style={{ color: '#085041', fontStyle: 'italic' }}>remembered.</em>
        </h1>

        <p className="anim-2" style={{
          fontSize: 'clamp(16px, 2vw, 19px)', color: '#7A7870',
          maxWidth: 520, margin: '24px auto 40px', lineHeight: 1.65, fontWeight: 300,
        }}>
          Suba seus documentos. Qualquer funcionário faz qualquer pergunta.
          A resposta certa aparece em segundos — com a fonte exata de onde veio.
        </p>

        <div className="hero-actions anim-3" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="/register" className="btn-primary">
            Começar grátis
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
          <a href="#demo" className="btn-secondary">Ver como funciona</a>
        </div>
        <p className="anim-4" style={{ fontSize: 12, color: '#7A7870', marginTop: 16 }}>
          Sem cartão de crédito · Trial de 14 dias grátis
        </p>
      </section>

      {/* ── DEMO ── */}
      <section id="demo" style={{ padding: '80px 40px', maxWidth: 960, margin: '0 auto' }}>
        <Reveal>
          <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0F6E56', marginBottom: 12 }}>Demonstração ao vivo</p>
          <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 400, lineHeight: 1.2, marginBottom: 12 }}>
            Qualquer pergunta.<br />Resposta em segundos.
          </h2>
          <p style={{ fontSize: 16, color: '#7A7870', maxWidth: 480, lineHeight: 1.65, marginBottom: 48, fontWeight: 300 }}>
            Veja o Lore respondendo com base nos documentos reais de uma empresa.
          </p>
        </Reveal>

        <Reveal delay={100}>
          <div style={{ background: '#FAFAF8', border: '1px solid #C8C6BC', borderRadius: 16, overflow: 'hidden' }}>
            {/* chat topbar */}
            <div style={{ background: '#085041', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: 5, background: '#5DCAA5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 13, fontWeight: 700, color: '#fff' }}>L</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Lore</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>· Distribuidora Silva</span>
            </div>
            {/* messages */}
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {CHAT_MESSAGES.map((msg, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: msg.role === 'ai' ? '#E1F5EE' : '#F1EFE8',
                    border: msg.role === 'user' ? '1px solid #C8C6BC' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: msg.role === 'ai' ? 13 : 11, fontWeight: 500,
                    color: msg.role === 'ai' ? '#085041' : '#7A7870',
                    fontFamily: msg.role === 'ai' ? '"Playfair Display", Georgia, serif' : 'inherit',
                  }}>
                    {msg.role === 'ai' ? 'L' : msg.initials}
                  </div>
                  <div style={{ maxWidth: '72%' }}>
                    <div style={{
                      padding: '11px 14px', fontSize: 14, lineHeight: 1.6,
                      background: msg.role === 'user' ? '#E1F5EE' : '#fff',
                      color: msg.role === 'user' ? '#085041' : '#3A3A38',
                      border: msg.role === 'ai' ? '1px solid #C8C6BC' : 'none',
                      borderRadius: msg.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                    }}>
                      {msg.text}
                    </div>
                    {msg.sources && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                        {msg.sources.map((s, j) => (
                          <span key={j} style={{ fontSize: 10, fontWeight: 500, fontFamily: '"DM Mono", monospace', background: '#E1F5EE', color: '#085041', padding: '2px 8px', borderRadius: 4 }}>{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* input */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid #C8C6BC', display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ flex: 1, height: 38, border: '1px solid #C8C6BC', borderRadius: 8, padding: '0 14px', fontSize: 13, color: '#7A7870', display: 'flex', alignItems: 'center', background: '#F1EFE8' }}>
                Pergunte sobre sua empresa...
              </div>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: '#0F6E56', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M3 7.5h9M9 4l3 3.5-3 3.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── PROBLEM / SOLUTION ── */}
      <section style={{ padding: '80px 40px', background: '#1C1C1A' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <Reveal>
            <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5DCAA5', marginBottom: 12 }}>O problema que todo negócio tem</p>
            <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 400, color: '#fff', lineHeight: 1.2, marginBottom: 12 }}>
              Seu negócio já tem as respostas.<br />Só ninguém consegue achá-las.
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', maxWidth: 480, lineHeight: 1.65, marginBottom: 48, fontWeight: 300 }}>
              15 anos de manuais, políticas e conhecimento acumulado — presos em pastas que ninguém acha rápido.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <div className="two-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Before */}
              <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24 }}>
                <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', display: 'inline-block', marginBottom: 16 }}>Sem o Lore</span>
                <h3 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 22, fontWeight: 400, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>A busca que trava tudo</h3>
                {['Funcionário passa 20 min procurando no Drive', 'Cliente fica em espera enquanto alguém "vai verificar"', 'Gerente vira gargalo — todo mundo pergunta pra ele', 'Se o gerente sai, o conhecimento vai junto', 'Fora do horário: ninguém responde nada'].map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, background: 'rgba(163,45,45,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="#f09595" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    </div>
                    {t}
                  </div>
                ))}
              </div>
              {/* After */}
              <div style={{ background: 'rgba(15,110,86,0.15)', border: '1px solid rgba(93,202,165,0.2)', borderRadius: 12, padding: 24 }}>
                <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 99, background: 'rgba(93,202,165,0.2)', color: '#5DCAA5', display: 'inline-block', marginBottom: 16 }}>Com o Lore</span>
                <h3 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 22, fontWeight: 400, color: '#fff', marginBottom: 16 }}>A resposta que já estava lá</h3>
                {['Resposta em 3 segundos — com a fonte exata citada', 'Qualquer funcionário resolve sem precisar perguntar', 'Conhecimento da empresa não depende de pessoas', 'Widget no seu site atende clientes 24h', 'Cada resposta cita de onde veio — você pode conferir'].map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, background: 'rgba(93,202,165,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2 4-4" stroke="#5DCAA5" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    </div>
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" style={{ padding: '80px 40px', background: '#FAFAF8', borderTop: '1px solid #C8C6BC', borderBottom: '1px solid #C8C6BC' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <Reveal>
            <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0F6E56', marginBottom: 12 }}>Como funciona</p>
            <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 400, lineHeight: 1.2, marginBottom: 12 }}>
              Três passos.<br />Quinze minutos.
            </h2>
            <p style={{ fontSize: 16, color: '#7A7870', maxWidth: 480, lineHeight: 1.65, marginBottom: 48, fontWeight: 300 }}>
              Sem configuração técnica, sem precisar de TI, sem treinamento.
            </p>
          </Reveal>
          <div className="three-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 32 }}>
            {[
              { num: '01', title: 'Suba seus documentos', desc: 'PDFs, planilhas, Word. Arraste e solte — o Lore lê tudo automaticamente.', icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 4h14v14H4V4z" stroke="#0F6E56" strokeWidth="1.5" strokeLinejoin="round" /><path d="M8 8h6M8 12h4" stroke="#0F6E56" strokeWidth="1.5" strokeLinecap="round" /></svg> },
              { num: '02', title: 'Faça qualquer pergunta', desc: 'Em português, da forma que você fala. Sem comandos especiais.', icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="7" stroke="#0F6E56" strokeWidth="1.5" /><path d="M11 8v3l2 2" stroke="#0F6E56" strokeWidth="1.5" strokeLinecap="round" /></svg> },
              { num: '03', title: 'Receba a resposta certa', desc: 'Com a fonte exata — nome do arquivo e página. Sempre verificável.', icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 11l4 4 8-8" stroke="#0F6E56" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg> },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="step-card">
                  <div style={{ width: 52, height: 52, borderRadius: 12, background: '#E1F5EE', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
                  <p style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#0F6E56', marginBottom: 6 }}>{s.num}</p>
                  <h3 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 18, fontWeight: 400, color: '#1C1C1A', marginBottom: 8 }}>{s.title}</h3>
                  <p style={{ fontSize: 14, color: '#7A7870', lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: '80px 40px', maxWidth: 960, margin: '0 auto' }}>
        <Reveal>
          <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0F6E56', marginBottom: 12 }}>Quem já usa</p>
          <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 400, lineHeight: 1.2, marginBottom: 12 }}>
            O que nossos clientes dizem
          </h2>
          <p style={{ fontSize: 16, color: '#7A7870', maxWidth: 480, lineHeight: 1.65, marginBottom: 48, fontWeight: 300 }}>
            PMEs de diferentes segmentos que pararam de perder tempo buscando informação.
          </p>
        </Reveal>
        <div className="three-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={i} delay={i * 80}>
              <div className="testi-card">
                <p style={{ fontSize: 14, color: '#3A3A38', lineHeight: 1.7, marginBottom: 16, fontStyle: 'italic' }}>{t.quote}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: '#085041' }}>{t.initials}</div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#1C1C1A' }}>{t.name}</p>
                    <p style={{ fontSize: 11, color: '#7A7870' }}>{t.role}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: '80px 40px', maxWidth: 1000, margin: '0 auto' }}>
        <Reveal>
          <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0F6E56', marginBottom: 12 }}>Preços</p>
          <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 400, lineHeight: 1.2, marginBottom: 12 }}>
            Simples.<br />Sem surpresas.
          </h2>
          <p style={{ fontSize: 16, color: '#7A7870', maxWidth: 480, lineHeight: 1.65, marginBottom: 36, fontWeight: 300 }}>
            Todos os planos incluem trial de 14 dias grátis. Cancele quando quiser.
          </p>

          {/* toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
            <span style={{ fontSize: 14, color: annual ? '#7A7870' : '#1C1C1A', fontWeight: annual ? 400 : 500 }}>Mensal</span>
            <div
              onClick={() => setAnnual(!annual)}
              style={{ width: 44, height: 24, borderRadius: 12, background: annual ? '#0F6E56' : '#C8C6BC', position: 'relative', cursor: 'pointer', transition: 'background .2s' }}
            >
              <div style={{ position: 'absolute', top: 3, left: annual ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
            </div>
            <span style={{ fontSize: 14, color: annual ? '#1C1C1A' : '#7A7870', fontWeight: annual ? 500 : 400 }}>Anual</span>
            {annual && <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: '#E1F5EE', color: '#085041' }}>2 meses grátis</span>}
          </div>
        </Reveal>

        <div className="three-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {PLANS.map((plan, i) => (
            <Reveal key={i} delay={i * 80}>
              <div className="plan-card" style={plan.featured ? { border: '2px solid #0F6E56', boxShadow: '0 0 0 4px rgba(15,110,86,0.06)' } : {}}>
                <div style={{ padding: '22px 22px 18px', background: plan.featured ? '#E1F5EE' : 'transparent' }}>
                  <span style={{ ...plan.badgeStyle, fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 99, display: 'inline-block', marginBottom: 12 }}>{plan.badge}</span>
                  <p style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 22, fontWeight: 400, color: plan.featured ? '#085041' : '#1C1C1A', marginBottom: 4 }}>{plan.name}</p>
                  <p style={{ fontSize: 12, color: plan.featured ? '#0F6E56' : '#7A7870', marginBottom: 16 }}>{plan.who}</p>
                  <p style={{ fontSize: 36, fontWeight: 500, color: plan.featured ? '#085041' : '#1C1C1A', lineHeight: 1 }}>
                    {annual ? plan.annualPrice : plan.monthlyPrice}
                    <span style={{ fontSize: 15, fontWeight: 400, color: '#7A7870' }}>{plan.monthlyPrice === 'R$0' ? '' : '/mês'}</span>
                  </p>
                  {annual && plan.monthlyPrice !== 'R$0' && (
                    <p style={{ fontSize: 12, color: '#0F6E56', marginTop: 4 }}>{plan.annualNote}</p>
                  )}
                </div>
                <div style={{ padding: '18px 22px 22px', borderTop: '1px solid #C8C6BC' }}>
                  {plan.features.map((f, j) => (
                    <div key={j} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13, color: f.included ? '#3A3A38' : '#C8C6BC', alignItems: 'flex-start' }}>
                      <CheckIcon on={f.included} />
                      {f.text}
                    </div>
                  ))}
                  <a href={`/register${plan.name !== 'Starter' ? `?plan=${plan.name.toLowerCase()}` : ''}`} className="plan-cta" style={{ ...plan.ctaStyle, marginTop: 16 }}>
                    {plan.ctaLabel}
                  </a>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: '100px 40px', textAlign: 'center', background: '#085041', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(93,202,165,0.15) 0%, transparent 70%)' }} />
        <Reveal>
          <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 400, color: '#fff', marginBottom: 16, position: 'relative' }}>
            Comece hoje.<br /><em style={{ color: '#5DCAA5', fontStyle: 'italic' }}>Sem cartão de crédito.</em>
          </h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.55)', marginBottom: 36, position: 'relative' }}>14 dias grátis. Configure em 15 minutos. Cancele quando quiser.</p>
          <a href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#5DCAA5', color: '#085041', padding: '16px 36px', borderRadius: 10, fontSize: 16, fontWeight: 600, textDecoration: 'none', transition: 'background .2s', position: 'relative' }}>
            Criar conta grátis
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 14, position: 'relative' }}>Mais de 200 empresas já usam o Lore</p>
        </Reveal>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#1C1C1A', padding: '40px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Logo size="md" variant="white" />
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Your company, remembered.</p>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {['Produto', 'Preços', 'Termos de uso', 'Privacidade', 'Contato'].map((l) => (
              <a key={l} href="#" style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', transition: 'color .2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}>{l}</a>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>© 2026 Lore. Todos os direitos reservados.</p>
        </div>
      </footer>
    </>
  )
}
