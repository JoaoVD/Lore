'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const G = {
  green:      '#0F6E56',
  greenDark:  '#085041',
  greenLight: '#f0f9f5',
  greenBorder:'#9FE1CB',
  text:       '#1a1a1a',
  text2:      '#666666',
  text3:      '#999999',
  border:     '#e0ddd6',
  borderSoft: '#e8e6e0',
  bg:         '#ffffff',
  bgAlt:      '#fafaf8',
}

function Logo({ light = false }: { light?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
      <div style={{
        width: 28, height: 28, background: G.green, borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 15, color: '#fff',
        flexShrink: 0,
      }}>L</div>
      <span style={{ fontSize: 15, fontWeight: 500, color: light ? '#fff' : G.text, fontFamily: 'system-ui, sans-serif' }}>
        Lore
      </span>
    </div>
  )
}

const FEATURES = [
  { n: '01', name: 'Templates de elite', desc: 'Petições, contratos e procurações com estrutura modular. Preencha as variáveis e gere o documento em minutos.' },
  { n: '02', name: 'Controle de prazos', desc: 'Alertas automáticos por e-mail antes do prazo vencer. Nunca mais um prazo processual esquecido.' },
  { n: '03', name: 'Busca inteligente', desc: 'Qualquer membro da equipe encontra qualquer informação nos documentos do escritório em segundos.' },
  { n: '04', name: 'Gestão de clientes', desc: 'Cada cliente com seus processos, documentos e prazos organizados e acessíveis com um clique.' },
  { n: '05', name: 'Exportar .docx e PDF', desc: 'Documentos gerados prontos para protocolar — baixe em .docx ou PDF formatado com um clique.' },
  { n: '06', name: 'Sincroniza com PJe', desc: 'Importe prazos automaticamente do PJe e e-SAJ pelo número do processo, sem digitação manual.' },
]

const BEFORE_AFTER = [
  {
    before: 'Redigir uma petição do zero leva 40 minutos. O advogado para tudo para fazer isso.',
    after:  'Template estruturado + IA + documento gerado em 3 minutos, pronto para protocolar.',
  },
  {
    before: 'Prazo processual perdido por falta de controle. Risco de processo disciplinar na OAB.',
    after:  'E-mail automático 3 dias antes. Toda a equipe vê os prazos no mesmo painel.',
  },
  {
    before: 'Estagiário interrompe o sócio para tirar dúvida sobre honorários ou procedimento interno.',
    after:  'Qualquer membro encontra a resposta nos documentos do escritório em segundos.',
  },
]

const PRO_FEATURES    = ['Templates ilimitados', 'Gestão de prazos + alertas', 'Geração de documentos com IA', 'Exportar .docx e PDF', 'Até 5 usuários']
const BIZ_FEATURES    = ['Tudo do Pro', 'Usuários ilimitados', 'Sincronização PJe/e-SAJ', 'Relatório de atividade', 'Suporte prioritário']

function FeatureDot({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: G.green, flexShrink: 0, marginTop: 5 }} />
      <span style={{ fontSize: 12, color: '#555', lineHeight: 1.6, fontFamily: 'system-ui, sans-serif' }}>{text}</span>
    </div>
  )
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: G.text, background: G.bg }}>

      {/* ── NAVBAR ─────────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        height: 60, background: '#fff',
        borderBottom: `0.5px solid ${G.borderSoft}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '0 24px' : '0 64px',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}><Logo /></Link>

        {!isMobile && (
          <div style={{ display: 'flex', gap: 28 }}>
            {['Funcionalidades', 'Como funciona', 'Preços'].map((label, i) => (
              <button key={label} onClick={() => scrollTo(['funcionalidades', 'antes-depois', 'precos'][i])}
                style={{ background: 'none', border: 'none', fontSize: 13, color: '#555', cursor: 'pointer', padding: 0, fontFamily: 'system-ui, sans-serif' }}>
                {label}
              </button>
            ))}
          </div>
        )}

        {!isMobile && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/login" style={{
              background: 'transparent', color: G.text,
              border: `0.5px solid #d0cec8`, padding: '7px 18px',
              borderRadius: 6, fontSize: 13, textDecoration: 'none',
              fontFamily: 'system-ui, sans-serif',
            }}>Entrar</Link>
            <Link href="/cadastro" style={{
              background: G.green, color: '#fff',
              border: 'none', padding: '7px 18px',
              borderRadius: 6, fontSize: 13, fontWeight: 500, textDecoration: 'none',
              fontFamily: 'system-ui, sans-serif',
            }}>Começar grátis</Link>
          </div>
        )}

        {isMobile && (
          <button onClick={() => setMenuOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <div style={{ width: 20, height: 1.5, background: G.text, marginBottom: 5 }} />
            <div style={{ width: 20, height: 1.5, background: G.text, marginBottom: 5 }} />
            <div style={{ width: 20, height: 1.5, background: G.text }} />
          </button>
        )}
      </nav>

      {/* Mobile menu */}
      {isMobile && menuOpen && (
        <div style={{
          position: 'fixed', top: 60, left: 0, right: 0, zIndex: 99,
          background: '#fff', borderBottom: `0.5px solid ${G.borderSoft}`,
          padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {['Funcionalidades', 'Como funciona', 'Preços'].map((label, i) => (
            <button key={label} onClick={() => scrollTo(['funcionalidades', 'antes-depois', 'precos'][i])}
              style={{ background: 'none', border: 'none', fontSize: 14, color: G.text, cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'system-ui, sans-serif' }}>
              {label}
            </button>
          ))}
          <div style={{ borderTop: `0.5px solid ${G.borderSoft}`, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link href="/login" onClick={() => setMenuOpen(false)} style={{
              background: 'transparent', color: G.text, border: `0.5px solid #d0cec8`,
              padding: '9px 18px', borderRadius: 6, fontSize: 13, textDecoration: 'none',
              textAlign: 'center', fontFamily: 'system-ui, sans-serif',
            }}>Entrar</Link>
            <Link href="/cadastro" onClick={() => setMenuOpen(false)} style={{
              background: G.green, color: '#fff', border: 'none',
              padding: '9px 18px', borderRadius: 6, fontSize: 13, fontWeight: 500,
              textDecoration: 'none', textAlign: 'center', fontFamily: 'system-ui, sans-serif',
            }}>Começar grátis</Link>
          </div>
        </div>
      )}

      {/* ── HERO ───────────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '48px 24px' : '88px 64px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: isMobile ? 40 : 64,
          alignItems: 'center',
        }}>
          {/* Left */}
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: G.greenLight, border: `0.5px solid ${G.greenBorder}`,
              borderRadius: 99, padding: '4px 12px', marginBottom: 20,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: G.green }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: G.greenDark, fontFamily: 'system-ui, sans-serif' }}>
                Software jurídico com IA
              </span>
            </div>

            <h1 style={{
              fontFamily: 'Georgia, serif', fontSize: isMobile ? 34 : 44,
              color: G.text, lineHeight: 1.12, marginBottom: 18,
              fontWeight: 400, margin: '0 0 18px 0',
            }}>
              O escritório que trabalha<br />
              <span style={{ fontWeight: 700 }}>mais inteligente.</span>
            </h1>

            <p style={{
              fontSize: 15, color: G.text2, lineHeight: 1.75,
              marginBottom: 32, margin: '0 0 32px 0',
            }}>
              Templates de elite, controle de prazos com alertas automáticos
              e busca inteligente nos documentos do escritório. Tudo em uma
              plataforma feita para advogados brasileiros.
            </p>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
              <Link href="/cadastro" style={{
                background: G.green, color: '#fff',
                padding: '10px 24px', borderRadius: 7, fontSize: 14,
                fontWeight: 500, textDecoration: 'none', border: 'none',
                fontFamily: 'system-ui, sans-serif',
              }}>Começar 14 dias grátis →</Link>
              <button onClick={() => scrollTo('funcionalidades')} style={{
                background: '#fff', color: G.text, border: `0.5px solid #d0cec8`,
                padding: '10px 24px', borderRadius: 7, fontSize: 14,
                cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
              }}>Ver demonstração</button>
            </div>

            <p style={{ fontSize: 11, color: G.text3, margin: 0 }}>
              Sem cartão de crédito · Cancele quando quiser
            </p>
          </div>

          {/* Right — chat mockup */}
          <div style={{
            background: G.bgAlt, border: `0.5px solid ${G.border}`,
            borderRadius: 14, padding: 20,
          }}>
            {/* Traffic lights */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {['#ff5f56', '#ffbd2e', '#27c93f'].map(c => (
                <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
              ))}
            </div>

            {/* Header bar */}
            <div style={{
              background: '#fff', border: `0.5px solid ${G.borderSoft}`,
              borderRadius: 8, padding: '8px 12px', marginBottom: 16,
              fontSize: 11, color: G.text3, textAlign: 'center',
              fontFamily: 'system-ui, sans-serif',
            }}>
              Lore — Assistente Jurídico
            </div>

            {/* User message */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <div style={{
                background: G.green, color: '#fff',
                borderRadius: '12px 12px 3px 12px',
                padding: '9px 13px', fontSize: 12, maxWidth: '85%',
                fontFamily: 'system-ui, sans-serif', lineHeight: 1.5,
              }}>
                Qual a multa por atraso na entrega da RAIS?
              </div>
            </div>

            {/* AI response */}
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
              <div style={{
                background: '#fff', border: `0.5px solid ${G.borderSoft}`,
                borderRadius: '3px 12px 12px 12px',
                padding: '11px 13px', fontSize: 12, color: G.text,
                lineHeight: 1.6, maxWidth: '92%',
                fontFamily: 'system-ui, sans-serif',
              }}>
                A multa por atraso na entrega da RAIS é de <strong>R$ 425,64</strong> acrescida
                de R$ 106,40 por bimestre de atraso. Para omissão de informações,
                a multa é de R$ 425,64 por empregado omitido.
              </div>
            </div>

            {/* Sources */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['manual_tributario.pdf · p.14', 'circular_mte_2024.pdf'].map(tag => (
                <span key={tag} style={{
                  background: G.greenLight, borderRadius: 5,
                  padding: '3px 8px', fontSize: 10, color: G.greenDark,
                  fontWeight: 500, fontFamily: 'system-ui, sans-serif',
                }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div style={{ borderTop: `0.5px solid ${G.borderSoft}`, margin: `0 ${isMobile ? '24px' : '64px'}` }} />

      {/* ── FEATURES ───────────────────────────────────────────────────────────── */}
      <section id="funcionalidades" style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '56px 24px' : '72px 64px' }}>
        <p style={{ fontSize: 11, color: G.green, textTransform: 'uppercase', letterSpacing: '.1em', margin: '0 0 10px 0', fontWeight: 500 }}>
          Funcionalidades
        </p>
        <h2 style={{
          fontFamily: 'Georgia, serif', fontSize: isMobile ? 26 : 32,
          color: G.text, fontWeight: 400, margin: '0 0 48px 0',
        }}>
          Tudo que um escritório moderno<br />precisa em um só lugar
        </h2>

        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          background: G.borderSoft, gap: 1,
          border: `0.5px solid ${G.borderSoft}`, borderRadius: 12, overflow: 'hidden',
        }}>
          {FEATURES.map(f => (
            <div key={f.n} style={{ background: '#fff', padding: '28px 24px' }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: G.green, marginBottom: 12, fontFamily: 'system-ui, sans-serif' }}>{f.n}</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 14, fontWeight: 500, color: G.text, marginBottom: 8 }}>{f.name}</div>
              <div style={{ fontSize: 12, color: '#777', lineHeight: 1.65, fontFamily: 'system-ui, sans-serif' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BEFORE / AFTER ─────────────────────────────────────────────────────── */}
      <section id="antes-depois" style={{ background: G.green, padding: isMobile ? '56px 24px' : '72px 64px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{
            fontFamily: 'Georgia, serif', fontSize: isMobile ? 24 : 30,
            color: '#fff', fontWeight: 400, margin: '0 0 40px 0',
          }}>
            O que muda no dia a dia<br />do seu escritório
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: 16,
          }}>
            {BEFORE_AFTER.map((c, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.08)',
                border: '0.5px solid rgba(255,255,255,0.15)',
                borderRadius: 10, padding: 20,
              }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '.07em', margin: '0 0 8px 0', fontWeight: 500 }}>Antes</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: 0, fontFamily: 'system-ui, sans-serif' }}>{c.before}</p>
                <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.15)', margin: '14px 0' }} />
                <p style={{ fontSize: 11, color: G.greenBorder, textTransform: 'uppercase', letterSpacing: '.07em', margin: '0 0 8px 0', fontWeight: 500 }}>Com Lore</p>
                <p style={{ fontSize: 13, color: '#fff', lineHeight: 1.6, margin: 0, fontFamily: 'system-ui, sans-serif' }}>{c.after}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────────────────────────── */}
      <section id="precos" style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '56px 24px' : '72px 64px' }}>
        <p style={{ fontSize: 11, color: G.green, textTransform: 'uppercase', letterSpacing: '.1em', margin: '0 0 10px 0', fontWeight: 500 }}>Planos</p>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: isMobile ? 26 : 32, color: G.text, fontWeight: 400, margin: '0 0 8px 0' }}>
          Simples, sem surpresa
        </h2>
        <p style={{ fontSize: 14, color: '#777', margin: '0 0 40px 0', fontFamily: 'system-ui, sans-serif' }}>
          14 dias grátis em qualquer plano. Sem cartão de crédito.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: 16, maxWidth: 700,
        }}>
          {/* Pro */}
          <div style={{ border: `0.5px solid ${G.border}`, borderRadius: 12, padding: 24, background: '#fff' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: G.text, marginBottom: 16, fontFamily: 'system-ui, sans-serif' }}>Pro</div>
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: 32, color: G.text }}>R$ 247</span>
              <span style={{ fontSize: 14, color: G.text3 }}>/mês</span>
            </div>
            <div style={{ fontSize: 11, color: G.text3, marginBottom: 20, fontFamily: 'system-ui, sans-serif' }}>14 dias grátis</div>
            <div style={{ marginBottom: 24 }}>{PRO_FEATURES.map(f => <FeatureDot key={f} text={f} />)}</div>
            <Link href="/cadastro?plan=pro" style={{
              display: 'block', textAlign: 'center',
              background: '#fff', color: G.text,
              border: `0.5px solid #d0cec8`, padding: '10px',
              borderRadius: 7, fontSize: 13, fontWeight: 500,
              textDecoration: 'none', fontFamily: 'system-ui, sans-serif',
            }}>Começar grátis</Link>
          </div>

          {/* Business */}
          <div style={{ border: `1.5px solid ${G.green}`, borderRadius: 12, padding: 24, background: '#fff' }}>
            <div style={{
              display: 'inline-block',
              background: G.greenLight, color: G.greenDark,
              fontSize: 10, fontWeight: 500, padding: '2px 8px',
              borderRadius: 99, marginBottom: 10, fontFamily: 'system-ui, sans-serif',
            }}>Mais completo</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: G.text, marginBottom: 16, fontFamily: 'system-ui, sans-serif' }}>Business</div>
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: 32, color: G.text }}>R$ 397</span>
              <span style={{ fontSize: 14, color: G.text3 }}>/mês</span>
            </div>
            <div style={{ fontSize: 11, color: G.text3, marginBottom: 20, fontFamily: 'system-ui, sans-serif' }}>14 dias grátis</div>
            <div style={{ marginBottom: 24 }}>{BIZ_FEATURES.map(f => <FeatureDot key={f} text={f} />)}</div>
            <Link href="/cadastro?plan=business" style={{
              display: 'block', textAlign: 'center',
              background: G.green, color: '#fff',
              border: 'none', padding: '10px',
              borderRadius: 7, fontSize: 13, fontWeight: 500,
              textDecoration: 'none', fontFamily: 'system-ui, sans-serif',
            }}>Começar grátis</Link>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ──────────────────────────────────────────────────────────── */}
      <section style={{
        background: '#1a1a1a', padding: isMobile ? '64px 24px' : '80px 64px',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontFamily: 'Georgia, serif', fontSize: isMobile ? 28 : 36,
          color: '#fff', fontWeight: 400, margin: '0 0 16px 0',
        }}>
          Pronto para modernizar seu escritório?
        </h2>
        <p style={{ fontSize: 15, color: '#888', margin: '0 0 36px 0', fontFamily: 'system-ui, sans-serif' }}>
          Junte-se a advogados que já trabalham de forma mais inteligente.
        </p>
        <Link href="/cadastro" style={{
          display: 'inline-block',
          background: G.green, color: '#fff',
          padding: '12px 32px', borderRadius: 7,
          fontSize: 15, fontWeight: 500, textDecoration: 'none',
          fontFamily: 'system-ui, sans-serif',
        }}>Começar 14 dias grátis</Link>
        <p style={{ fontSize: 12, color: '#666', marginTop: 12, fontFamily: 'system-ui, sans-serif' }}>
          Sem cartão de crédito · Cancele quando quiser
        </p>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────────── */}
      <footer style={{
        background: '#1a1a1a', borderTop: '0.5px solid #2a2a2a',
        padding: isMobile ? '32px 24px' : '40px 64px',
        display: 'flex', flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? 20 : 0,
      }}>
        <div>
          <Logo light />
          <p style={{ fontSize: 11, color: '#666', marginTop: 6, margin: '6px 0 0 0', fontFamily: 'system-ui, sans-serif' }}>
            Software jurídico para advogados brasileiros
          </p>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Termos de Uso', href: '/termos' },
            { label: 'Política de Privacidade', href: '/privacidade' },
            { label: 'Contato', href: 'mailto:contato@uselore.com.br' },
          ].map(l => (
            <Link key={l.label} href={l.href} style={{
              fontSize: 12, color: '#888', textDecoration: 'none',
              fontFamily: 'system-ui, sans-serif',
            }}>{l.label}</Link>
          ))}
        </div>
      </footer>

    </div>
  )
}
