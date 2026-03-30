import Link from 'next/link'
import LoreLogo from '@/components/LoreLogo'

export default function Footer() {
  return (
    <footer className="bg-brand-dark text-white/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          <div className="flex flex-col gap-3">
            <div className="brightness-0 invert">
              <LoreLogo layout="inline" size="h-8 w-8" wordmarkSize="text-base" />
            </div>
            <p className="text-sm text-white/60 max-w-xs">
              Feito para PMEs brasileiras 🌱
            </p>
            <p className="text-sm font-medium text-white/70">uselore.com.br</p>
          </div>

          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <div className="flex flex-col gap-3">
              <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Produtos</p>
              <Link href="/docs" className="hover:text-white transition-colors duration-150">
                Lore Docs
              </Link>
              <Link href="/estoq" className="hover:text-white transition-colors duration-150">
                Lore Estoq
              </Link>
              <Link href="/#precos" className="hover:text-white transition-colors duration-150">
                Preços
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Empresa</p>
              <Link href="/blog" className="hover:text-white transition-colors duration-150">
                Blog
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors duration-150">
                Termos
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors duration-150">
                Privacidade
              </Link>
            </div>
          </nav>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 text-xs text-white/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>© {new Date().getFullYear()} Lore. Todos os direitos reservados.</span>
          <span>CNPJ 00.000.000/0001-00</span>
        </div>
      </div>
    </footer>
  )
}
