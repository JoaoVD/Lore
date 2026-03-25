'use client'

import { useEffect } from 'react'
import Link from 'next/link'

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#0F6E56', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1 }}>L</span>
      </div>
      <span style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 20, fontWeight: 400, color: '#085041' }}>Lore</span>
    </div>
  )
}

export default function ContactPage() {
  useEffect(() => {
    const fonts = document.createElement('link')
    fonts.rel = 'stylesheet'
    fonts.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap'
    document.head.appendChild(fonts)
  }, [])

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', system-ui, sans-serif; background: #F1EFE8; color: #1C1C1A; line-height: 1.6; }
    ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #F1EFE8; } ::-webkit-scrollbar-thumb { background: #C8C6BC; border-radius: 3px; }
    .contact-card { background: #FAFAF8; border: 1px solid #C8C6BC; border-radius: 14px; padding: 28px; transition: transform .2s, box-shadow .2s; }
    .contact-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
    .email-link { display: inline-flex; align-items: center; gap: 8px; color: #0F6E56; font-size: 18px; font-weight: 500; text-decoration: none; transition: color .2s; }
    .email-link:hover { color: #085041; text-decoration: underline; }
    @media (max-width: 768px) { .two-cols { grid-template-columns: 1fr !important; } }
  `

  return (
    <>
      <style>{css}</style>

      {/* Nav */}
      <nav style={{ background: 'rgba(241,239,232,0.93)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(200,198,188,0.6)', height: 60, display: 'flex', alignItems: 'center', padding: '0 40px', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ textDecoration: 'none' }}><Logo /></Link>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 720, margin: '0 auto', padding: '64px 40px 0' }}>
        <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0F6E56', marginBottom: 12 }}>Fale conosco</p>
        <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 400, lineHeight: 1.15, color: '#1C1C1A', marginBottom: 16 }}>
          Como podemos <em style={{ fontStyle: 'italic', color: '#085041' }}>ajudar?</em>
        </h1>
        <p style={{ fontSize: 17, color: '#7A7870', maxWidth: 480, lineHeight: 1.7, fontWeight: 300, marginBottom: 56 }}>
          Nossa equipe está disponível para responder suas dúvidas, ajudar com sua conta ou discutir como o Lore pode funcionar para o seu negócio.
        </p>
      </section>

      {/* Cards */}
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '0 40px 100px' }}>
        {/* Main contact */}
        <div style={{ background: '#0F6E56', borderRadius: 16, padding: '40px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(93,202,165,0.15)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, position: 'relative' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(93,202,165,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="4" width="16" height="12" rx="2" stroke="#5DCAA5" strokeWidth="1.5" />
                <path d="M2 7l8 5 8-5" stroke="#5DCAA5" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>Suporte por e-mail</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Respondemos em até 24 horas úteis</p>
            </div>
          </div>
          <a href="mailto:suporte@uselore.com.br" style={{ display: 'inline-block', fontSize: 22, fontWeight: 500, color: '#fff', textDecoration: 'none', letterSpacing: '-0.01em', position: 'relative', transition: 'color .2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#5DCAA5')}
            onMouseLeave={e => (e.currentTarget.style.color = '#fff')}>
            suporte@uselore.com.br
          </a>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginTop: 10, position: 'relative', fontWeight: 300 }}>
            Para dúvidas sobre sua conta, planos, documentos ou qualquer aspecto da plataforma.
          </p>
        </div>

        {/* Info cards */}
        <div className="two-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 48 }}>
          <div className="contact-card">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="6" stroke="#0F6E56" strokeWidth="1.5" />
                <path d="M9 6v3l2 2" stroke="#0F6E56" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#1C1C1A', marginBottom: 6 }}>Horário de atendimento</p>
            <p style={{ fontSize: 13, color: '#7A7870', lineHeight: 1.65, fontWeight: 300 }}>
              Segunda a sexta<br />
              das 9h às 18h (BRT)<br />
              <span style={{ fontSize: 12, color: '#0F6E56', marginTop: 4, display: 'block' }}>Planos Business: suporte prioritário em 12h</span>
            </p>
          </div>

          <div className="contact-card">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2l2.09 4.26L16 7.27l-3.5 3.41.83 4.82L9 13.27l-4.33 2.23.83-4.82L2 7.27l4.91-.71L9 2z" stroke="#0F6E56" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#1C1C1A', marginBottom: 6 }}>Trial gratuito</p>
            <p style={{ fontSize: 13, color: '#7A7870', lineHeight: 1.65, fontWeight: 300 }}>
              Experimente por 14 dias sem cartão de crédito. Nossa equipe pode ajudar na configuração inicial.
            </p>
            <Link href="/register" style={{ fontSize: 13, color: '#0F6E56', textDecoration: 'none', fontWeight: 500, display: 'inline-block', marginTop: 8 }}>
              Criar conta grátis →
            </Link>
          </div>
        </div>

        {/* FAQ hint */}
        <div style={{ background: '#FAFAF8', border: '1px solid #C8C6BC', borderRadius: 14, padding: '28px', display: 'flex', alignItems: 'flex-start', gap: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#F1EFE8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="7" stroke="#7A7870" strokeWidth="1.5" />
              <path d="M10 14v-1M10 11c0-1.5 2-1.5 2-3a2 2 0 10-4 0" stroke="#7A7870" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#1C1C1A', marginBottom: 6 }}>Dúvidas sobre planos e recursos?</p>
            <p style={{ fontSize: 13, color: '#7A7870', lineHeight: 1.65, fontWeight: 300, marginBottom: 12 }}>
              Confira nossa seção de preços para entender o que cada plano oferece, ou envie sua pergunta diretamente por e-mail.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/#pricing" style={{ fontSize: 13, color: '#0F6E56', textDecoration: 'none', fontWeight: 500 }}>Ver planos →</Link>
              <a href="mailto:suporte@uselore.com.br" style={{ fontSize: 13, color: '#7A7870', textDecoration: 'none', fontWeight: 400 }}>Enviar e-mail →</a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ background: '#1C1C1A', padding: '32px 40px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'Início', href: '/' },
              { label: 'Termos de uso', href: '/terms' },
              { label: 'Privacidade', href: '/privacy' },
              { label: 'Contato', href: '/contact' },
            ].map((l) => (
              <Link key={l.label} href={l.href} style={{ fontSize: 13, color: l.href === '/contact' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)', textDecoration: 'none', transition: 'color .2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                onMouseLeave={e => (e.currentTarget.style.color = l.href === '/contact' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)')}>{l.label}</Link>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>© 2026 Lore. Todos os direitos reservados.</p>
        </div>
      </footer>
    </>
  )
}
