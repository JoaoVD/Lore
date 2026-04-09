"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const LINKS = [
  { label: "Início",    href: "/app" },
  { label: "Projetos",  href: "/app/projetos" },
  { label: "Clientes",  href: "/app/clientes" },
  { label: "Prazos",    href: "/app/prazos" },
  { label: "Templates", href: "/app/templates" },
  { label: "Planos",    href: "/app/planos" },
]

export function SubNav() {
  const pathname = usePathname()

  return (
    <nav style={{
      background: "#fff",
      borderBottom: "0.5px solid #d8d6d0",
      padding: "0 40px",
      display: "flex",
      gap: "2px",
      position: "sticky",
      top: "52px",
      zIndex: 99,
      overflowX: "auto",
      WebkitOverflowScrolling: "touch",
      scrollbarWidth: "none",
    }}>
      {LINKS.map(link => {
        const active =
          pathname === link.href ||
          (link.href !== "/app" && pathname.startsWith(link.href))
        return (
          <Link key={link.href} href={link.href} style={{ textDecoration: "none" }}>
            <div style={{
              padding: "10px 14px",
              fontSize: "13px",
              color: active ? "#0F6E56" : "#3a3a3a",
              fontWeight: active ? 500 : 400,
              borderBottom: active ? "2px solid #0F6E56" : "2px solid transparent",
              marginBottom: "-0.5px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "color .12s",
            }}>
              {link.label}
            </div>
          </Link>
        )
      })}
    </nav>
  )
}
