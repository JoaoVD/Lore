'use client'

import { useEffect } from 'react'

interface MobileMenuProps {
  open: boolean
  onClose: () => void
}

export default function MobileMenu({ open, onClose }: MobileMenuProps) {
  // Bloqueia scroll do body quando menu aberto
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <style>{`
        .mm-overlay {
          display: none;
          position: fixed;
          top: 60px;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9999;
          pointer-events: none;
        }
        .mm-overlay.mm-open {
          display: block;
          pointer-events: auto;
        }
        .mm-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(28, 28, 26, 0.4);
        }
        .mm-panel {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          background: #F1EFE8;
          border-bottom: 1px solid #D1D0CC;
          box-shadow: 0 8px 32px rgba(28, 28, 26, 0.12);
          transform: translateY(-8px);
          opacity: 0;
          transition: transform 300ms ease, opacity 300ms ease;
          overflow: hidden;
        }
        .mm-overlay.mm-open .mm-panel {
          transform: translateY(0);
          opacity: 1;
        }
        .mm-section-label {
          padding: 16px 24px 6px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #7A7870;
          font-family: 'DM Sans', sans-serif;
        }
        .mm-link {
          display: block;
          padding: 14px 24px;
          font-size: 16px;
          font-family: 'DM Sans', sans-serif;
          color: #1C1C1A;
          text-decoration: none;
          transition: background 150ms;
        }
        .mm-link:hover, .mm-link:active {
          background: rgba(15, 110, 86, 0.06);
        }
        .mm-link-green {
          color: #0F6E56;
          font-weight: 500;
        }
        .mm-divider {
          height: 1px;
          background: #D1D0CC;
          margin: 4px 0;
        }
        .mm-cta-wrap {
          padding: 16px 24px 24px;
        }
        .mm-cta {
          display: block;
          width: 100%;
          padding: 13px 24px;
          background: #0F6E56;
          color: #fff;
          font-size: 15px;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          text-align: center;
          text-decoration: none;
          border-radius: 8px;
          transition: background 200ms;
        }
        .mm-cta:hover, .mm-cta:active {
          background: #085041;
        }
      `}</style>

      <div className={`mm-overlay${open ? ' mm-open' : ''}`}>
        {/* Backdrop — clica fora para fechar */}
        <div className="mm-backdrop" onClick={onClose} />

        {/* Painel do menu */}
        <div className="mm-panel" role="dialog" aria-modal="true" aria-label="Menu de navegação">
          {/* PRODUTO */}
          <p className="mm-section-label">Produto</p>
          <a href="#demo" className="mm-link" onClick={onClose}>O que é o Lore</a>
          <a href="#how"  className="mm-link" onClick={onClose}>Como funciona</a>
          <a href="#pricing" className="mm-link" onClick={onClose}>Preços</a>

          <div className="mm-divider" />

          {/* CONTA */}
          <p className="mm-section-label">Conta</p>
          <a href="/login" className="mm-link mm-link-green" onClick={onClose}>Entrar</a>

          <div className="mm-cta-wrap">
            <a href="/register" className="mm-cta" onClick={onClose}>Criar conta grátis</a>
          </div>
        </div>
      </div>
    </>
  )
}
