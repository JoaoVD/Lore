'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ── Reveal animation ──────────────────────────────────────────────────────────

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useReveal()
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(18px)', transition: `opacity .5s ${delay}ms, transform .5s ${delay}ms` }}>
      {children}
    </div>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────────

function Navbar() {
  const [open, setOpen] = useState(false)
  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: '#fff', borderBottom: '0.5px solid #d8d6d0', height: '56px', display: 'flex', alignItems: 'center', paddingInline: '24px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', gap: '32px' }}>

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: '27px', height: '27px', background: '#0F6E56', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', fontWeight: 700, fontFamily: 'Georgia, serif' }}>L</div>
          <span style={{ fontSize: '15px', fontWeight: 500, color: '#1a1a1a' }}>Lore</span>
        </Link>

        {/* Links centro — desktop */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '28px' }} className="nav-links">
          {[['Como funciona', '#como-funciona'], ['Funcionalidades', '#funcionalidades'], ['Preços', '#precos']].map(([l, h]) => (
            <a key={l} href={h} style={{ fontSize: '13px', color: '#1a1a1a', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '.6')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>{l}</a>
          ))}
        </div>

        {/* Direita — desktop */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }} className="nav-links">
          <Link href="/login" style={{ fontSize: '13px', color: '#1a1a1a', textDecoration: 'none' }}>Entrar</Link>
          <Link href="/register" style={{ background: '#0F6E56', color: '#fff', fontSize: '13px', fontWeight: 500, padding: '8px 16px', borderRadius: '8px', textDecoration: 'none' }}>Começar grátis</Link>
        </div>

        {/* Hamburger — mobile */}
        <button onClick={() => setOpen(o => !o)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#1a1a1a' }} className="nav-burger">☰</button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div style={{ position: 'absolute', top: '56px', left: 0, right: 0, background: '#fff', borderBottom: '0.5px solid #d8d6d0', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '14px', zIndex: 50 }}>
          {[['Como funciona', '#como-funciona'], ['Funcionalidades', '#funcionalidades'], ['Preços', '#precos']].map(([l, h]) => (
            <a key={l} href={h} onClick={() => setOpen(false)} style={{ fontSize: '14px', color: '#1a1a1a', textDecoration: 'none' }}>{l}</a>
          ))}
          <Link href="/login" style={{ fontSize: '14px', color: '#1a1a1a', textDecoration: 'none' }}>Entrar</Link>
          <Link href="/register" style={{ background: '#0F6E56', color: '#fff', fontSize: '13px', fontWeight: 500, padding: '10px 16px', borderRadius: '8px', textDecoration: 'none', textAlign: 'center' }}>Começar grátis</Link>
        </div>
      )}

      <style>{`
        @media (max-width: 640px) { .nav-links { display: none !important; } }
        @media (min-width: 641px) { .nav-burger { display: none !important; } }
      `}</style>
    </nav>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section style={{ padding: '72px 24px', textAlign: 'center', background: '#F1EFE8' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px' }}>
        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#E1F5EE', border: '0.5px solid #9FE1CB', borderRadius: '99px', padding: '5px 14px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0F6E56' }} />
          <span style={{ fontSize: '12px', color: '#085041', fontWeight: 500 }}>Para escritórios de advocacia</span>
        </div>

        {/* H1 */}
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 46px)', fontWeight: 400, color: '#1a1a1a', fontFamily: 'Georgia, serif', lineHeight: 1.15, margin: 0 }}>
          Seu escritório.<br />
          Muito mais <em style={{ color: '#0F6E56', fontStyle: 'italic' }}>produtivo.</em>
        </h1>

        <p style={{ fontSize: '16px', color: '#1a1a1a', maxWidth: '560px', lineHeight: 1.7, margin: 0 }}>
          Geração de documentos com IA, controle de prazos e busca inteligente
          nos documentos do escritório — tudo em um lugar.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/register" style={{ background: '#0F6E56', color: '#fff', fontSize: '14px', fontWeight: 500, padding: '12px 24px', borderRadius: '8px', textDecoration: 'none' }}>
            Começar 14 dias grátis
          </Link>
          <a href="#como-funciona" style={{ background: 'transparent', color: '#1a1a1a', fontSize: '14px', fontWeight: 500, padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', border: '0.5px solid #9FE1CB' }}>
            Ver demonstração
          </a>
        </div>

        <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>Sem cartão de crédito · Cancele quando quiser</p>
      </div>
    </section>
  )
}

// ── Chat Mockup ───────────────────────────────────────────────────────────────

function ChatMockup() {
  return (
    <section id="como-funciona" style={{ background: '#F1EFE8', padding: '0 24px 72px' }}>
      <Reveal>
        <div style={{ maxWidth: '760px', margin: '0 auto', background: '#fff', border: '0.5px solid #d8d6d0', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '0.5px solid #d8d6d0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#0F6E56' }} />
            <span style={{ fontSize: '12px', color: '#888' }}>Assistente Lore · Escritório</span>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* User */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ background: '#0F6E56', color: '#fff', padding: '10px 14px', borderRadius: '12px 12px 2px 12px', fontSize: '13px', maxWidth: '75%' }}>
                Qual a multa por atraso na entrega de RAIS?
              </div>
            </div>
            {/* Assistant */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#0F6E56', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: 'Georgia, serif', color: '#fff', fontSize: '13px', fontWeight: 700 }}>L</span>
              </div>
              <div style={{ background: '#F8F7F4', padding: '10px 14px', borderRadius: '2px 12px 12px 12px', fontSize: '13px', color: '#1a1a1a', maxWidth: '80%', lineHeight: 1.6 }}>
                A multa por atraso na entrega da RAIS é de <strong>R$ 425,64</strong>, acrescida de R$ 106,40 por bimestre de atraso ou fração, limitada a 2% do total de salários pagos.
                <em style={{ color: '#888', display: 'block', marginTop: '6px', fontSize: '12px' }}>(Manual Tributário, p.14)</em>
                <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {['manual_tributario.pdf · p.14', 'procedimentos_dp.pdf · p.3'].map(s => (
                    <span key={s} style={{ background: '#E1F5EE', color: '#085041', fontSize: '11px', padding: '2px 8px', borderRadius: '99px' }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

// ── Funcionalidades ───────────────────────────────────────────────────────────

const FEATURES = [
  { icon: '📋', title: 'Templates jurídicos', desc: 'Petições, contratos e procurações prontos. Preenche as variáveis e gera o documento em segundos.' },
  { icon: '⏰', title: 'Controle de prazos', desc: 'Alertas automáticos por e-mail antes do prazo vencer. Nunca mais prazo esquecido.' },
  { icon: '💬', title: 'Busca inteligente', desc: 'Sobe os documentos do escritório e qualquer membro da equipe encontra qualquer informação em segundos.' },
  { icon: '👥', title: 'Gestão de clientes', desc: 'Cada cliente com seus processos, documentos e prazos organizados em um só lugar.' },
  { icon: '⬇️', title: 'Exportar .docx e PDF', desc: 'Documentos gerados prontos para protocolar — baixa em .docx ou PDF com um clique.' },
  { icon: '🔄', title: 'Sincroniza com PJe', desc: 'Importa prazos automaticamente do PJe e e-SAJ pelo número do processo.' },
]

function Features() {
  return (
    <section id="funcionalidades" style={{ background: '#fff', padding: '72px 24px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '10px', margin: '0 0 10px' }}>FUNCIONALIDADES</p>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 32px)', fontWeight: 400, color: '#1a1a1a', fontFamily: 'Georgia, serif', margin: 0 }}>
              Tudo que seu escritório precisa em um lugar
            </h2>
          </div>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 60}>
              <div style={{ background: '#fff', border: '0.5px solid #d8d6d0', borderRadius: '12px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', background: '#E1F5EE', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>{f.icon}</div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{f.title}</p>
                <p style={{ fontSize: '13px', color: '#1a1a1a', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Antes e Depois ────────────────────────────────────────────────────────────

const COMPARISONS = [
  { before: 'Redigir uma petição do zero leva 40 minutos.', after: 'Template pronto + variáveis preenchidas + documento gerado em 3 minutos.' },
  { before: 'Prazo processual perdido por falta de controle. Risco disciplinar na OAB.', after: 'E-mail automático 3 dias antes. Toda a equipe vê os prazos no mesmo painel.' },
  { before: 'Estagiário interrompe o sócio para tirar dúvida sobre honorários.', after: 'Qualquer membro encontra a resposta nos documentos do escritório em segundos.' },
]

function BeforeAfter() {
  return (
    <section style={{ background: '#F1EFE8', padding: '72px 24px' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <Reveal>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 400, color: '#1a1a1a', fontFamily: 'Georgia, serif', textAlign: 'center', marginBottom: '48px' }}>
            Antes e depois do Lore no escritório
          </h2>
        </Reveal>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {COMPARISONS.map((c, i) => (
            <Reveal key={i} delay={i * 80}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center' }}>
                <div style={{ background: '#FCEBEB', border: '0.5px solid #f5c6c6', borderRadius: '10px', padding: '16px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 600, color: '#791F1F', textTransform: 'uppercase', letterSpacing: '.07em', margin: '0 0 6px' }}>ANTES</p>
                  <p style={{ fontSize: '13px', color: '#791F1F', margin: 0, lineHeight: 1.5 }}>{c.before}</p>
                </div>
                <span style={{ fontSize: '18px', color: '#888' }}>→</span>
                <div style={{ background: '#E1F5EE', border: '0.5px solid #9FE1CB', borderRadius: '10px', padding: '16px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 600, color: '#085041', textTransform: 'uppercase', letterSpacing: '.07em', margin: '0 0 6px' }}>DEPOIS</p>
                  <p style={{ fontSize: '13px', color: '#085041', margin: 0, lineHeight: 1.5 }}>{c.after}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Preços ────────────────────────────────────────────────────────────────────

function Pricing() {
  return (
    <section id="precos" style={{ background: '#fff', padding: '72px 24px' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 400, color: '#1a1a1a', fontFamily: 'Georgia, serif', margin: '0 0 8px' }}>
              Planos simples, sem surpresa
            </h2>
            <p style={{ fontSize: '14px', color: '#1a1a1a', margin: 0 }}>14 dias grátis em qualquer plano. Sem cartão de crédito.</p>
          </div>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Pro */}
          <Reveal delay={0}>
            <div style={{ border: '0.5px solid #d8d6d0', borderRadius: '14px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 8px' }}>Pro</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#0F6E56', fontWeight: 600 }}>R$</span>
                  <span style={{ fontSize: '32px', fontWeight: 600, color: '#1a1a1a', lineHeight: 1 }}>247</span>
                  <span style={{ fontSize: '13px', color: '#888' }}>/mês</span>
                </div>
                <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0' }}>14 dias grátis</p>
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['Templates ilimitados', 'Gestão de prazos + alertas', 'Geração de documentos IA', 'Exportar .docx e PDF', 'Até 5 usuários'].map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1a1a1a' }}>
                    <span style={{ color: '#0F6E56', fontWeight: 700 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" style={{ display: 'block', background: '#0F6E56', color: '#fff', fontSize: '13px', fontWeight: 500, padding: '12px', borderRadius: '8px', textDecoration: 'none', textAlign: 'center' }}>
                Começar grátis
              </Link>
            </div>
          </Reveal>
          {/* Business */}
          <Reveal delay={80}>
            <div style={{ border: '2px solid #0F6E56', borderRadius: '14px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-12px', left: '20px', background: '#E1F5EE', border: '0.5px solid #9FE1CB', borderRadius: '99px', padding: '3px 10px' }}>
                <span style={{ fontSize: '11px', color: '#085041', fontWeight: 500 }}>Mais popular</span>
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 8px' }}>Business</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#0F6E56', fontWeight: 600 }}>R$</span>
                  <span style={{ fontSize: '32px', fontWeight: 600, color: '#1a1a1a', lineHeight: 1 }}>397</span>
                  <span style={{ fontSize: '13px', color: '#888' }}>/mês</span>
                </div>
                <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0' }}>14 dias grátis</p>
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['Tudo do Pro', 'Usuários ilimitados', 'Sincronização com PJe/e-SAJ', 'Relatório de atividade', 'Suporte prioritário'].map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1a1a1a' }}>
                    <span style={{ color: '#0F6E56', fontWeight: 700 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" style={{ display: 'block', background: '#0F6E56', color: '#fff', fontSize: '13px', fontWeight: 500, padding: '12px', borderRadius: '8px', textDecoration: 'none', textAlign: 'center' }}>
                Começar grátis
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{ background: '#fff', borderTop: '0.5px solid #d8d6d0', padding: '20px 24px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <span style={{ fontSize: '13px', color: '#1a1a1a' }}>Lore · Para escritórios de advocacia · uselore.com.br</span>
        <div style={{ display: 'flex', gap: '20px' }}>
          {[['Termos', '/terms'], ['Privacidade', '/privacy'], ['Contato', '/contact']].map(([label, href]) => (
            <Link key={label} href={href} style={{ fontSize: '13px', color: '#1a1a1a', textDecoration: 'none' }}>{label}</Link>
          ))}
        </div>
      </div>
    </footer>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <Hero />
      <ChatMockup />
      <Features />
      <BeforeAfter />
      <Pricing />
      <Footer />
    </>
  )
}
