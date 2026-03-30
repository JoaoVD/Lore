'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import LoreLogo from '@/components/LoreLogo'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [produtosOpen, setProdutosOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProdutosOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <header
      className={`sticky top-0 z-50 bg-parchment transition-shadow duration-200 ${
        scrolled ? 'shadow-md' : 'shadow-none'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link href="/" className="flex-shrink-0" onClick={() => setMobileOpen(false)}>
          <LoreLogo layout="inline" size="h-8 w-8" wordmarkSize="text-base" />
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-ink">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProdutosOpen((v) => !v)}
              className="flex items-center gap-1 hover:text-brand transition-colors duration-150 py-1"
              aria-expanded={produtosOpen}
            >
              Produtos
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${produtosOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div
              className={`absolute top-full left-0 mt-1 w-44 bg-parchment border border-stone/40 rounded-xl shadow-lg overflow-hidden transition-all duration-200 origin-top ${
                produtosOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-95 pointer-events-none'
              }`}
            >
              <Link
                href="/docs"
                className="flex items-center gap-2 px-4 py-3 hover:bg-brand-light transition-colors duration-150 text-ink"
                onClick={() => setProdutosOpen(false)}
              >
                <span className="text-base">📄</span>
                <span>Lore Docs</span>
              </Link>
              <Link
                href="/estoq"
                className="flex items-center gap-2 px-4 py-3 hover:bg-brand-light transition-colors duration-150 text-ink border-t border-stone/30"
                onClick={() => setProdutosOpen(false)}
              >
                <span className="text-base">📦</span>
                <span>Lore Estoq</span>
              </Link>
            </div>
          </div>

          <Link href="/#precos" className="hover:text-brand transition-colors duration-150">
            Preços
          </Link>
          <Link href="/auth/login" className="hover:text-brand transition-colors duration-150">
            Entrar
          </Link>
          <Link
            href="/auth/signup"
            className="bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors duration-150 font-medium"
          >
            Começar grátis
          </Link>
        </nav>

        <button
          className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-lg hover:bg-brand-light transition-colors duration-150"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={mobileOpen}
        >
          <span
            className={`block w-5 h-0.5 bg-ink transition-transform duration-200 ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`}
          />
          <span
            className={`block w-5 h-0.5 bg-ink transition-opacity duration-200 ${mobileOpen ? 'opacity-0' : ''}`}
          />
          <span
            className={`block w-5 h-0.5 bg-ink transition-transform duration-200 ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`}
          />
        </button>
      </div>

      <div
        className={`md:hidden bg-parchment border-t border-stone/30 overflow-hidden transition-all duration-300 ${
          mobileOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <nav className="px-4 py-4 flex flex-col gap-1 text-sm font-medium text-ink">
          <p className="text-xs uppercase tracking-widest text-stone font-medium px-3 py-1 mt-1">Produtos</p>
          <Link
            href="/docs"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-brand-light transition-colors duration-150"
            onClick={() => setMobileOpen(false)}
          >
            <span>📄</span> Lore Docs
          </Link>
          <Link
            href="/estoq"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-brand-light transition-colors duration-150"
            onClick={() => setMobileOpen(false)}
          >
            <span>📦</span> Lore Estoq
          </Link>
          <div className="border-t border-stone/30 my-2" />
          <Link
            href="/#precos"
            className="px-3 py-2.5 rounded-lg hover:bg-brand-light transition-colors duration-150"
            onClick={() => setMobileOpen(false)}
          >
            Preços
          </Link>
          <Link
            href="/auth/login"
            className="px-3 py-2.5 rounded-lg hover:bg-brand-light transition-colors duration-150"
            onClick={() => setMobileOpen(false)}
          >
            Entrar
          </Link>
          <Link
            href="/auth/signup"
            className="mt-2 bg-brand text-white px-4 py-3 rounded-lg text-center font-medium hover:bg-brand-dark transition-colors duration-150"
            onClick={() => setMobileOpen(false)}
          >
            Começar grátis
          </Link>
        </nav>
      </div>
    </header>
  )
}
