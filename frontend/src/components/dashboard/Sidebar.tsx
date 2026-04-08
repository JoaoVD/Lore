"use client"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Features } from "@/lib/features"

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside style={{
      width: "210px",
      background: "#fff",
      borderRight: "0.5px solid #d8d6d0",
      padding: "20px 10px",
      display: "flex",
      flexDirection: "column",
      gap: "2px",
      position: "sticky",
      top: 0,
      height: "100vh",
      flexShrink: 0,
    }}>

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "9px", padding: "6px 10px", marginBottom: "18px" }}>
        <div style={{
          width: "27px", height: "27px", background: "#0F6E56",
          borderRadius: "7px", display: "flex", alignItems: "center",
          justifyContent: "center", color: "#fff", fontSize: "14px",
          fontWeight: 700, fontFamily: "Georgia, serif"
        }}>L</div>
        <span style={{ fontSize: "15px", fontWeight: 500, color: "#1a1a1a" }}>Lore</span>
      </div>

      {/* Nav principal */}
      <NavItem href="/app" icon="⊞" label="Início" active={pathname === "/app"} />
      <NavItem href="/app" icon="◷" label="Recentes" active={false} />

      {/* Produtos */}
      <NavSection label="Produtos" />
      <NavItem
        href="/docs"
        dot="#0F6E56"
        label="Lore Docs"
        active={pathname.startsWith("/docs")}
      />
      {Features.ESTOQ && (
        <NavItem
          href="/estoq"
          dot="#378ADD"
          label="Lore Estoq"
          active={pathname.startsWith("/estoq")}
        />
      )}
      {Features.JURIDICO && (
        <NavItem
          href="/juridico"
          dot="#7F77DD"
          label="Lore Jurídico"
          active={pathname.startsWith("/juridico")}
        />
      )}

      {/* Conta */}
      <NavSection label="Conta" />
      <NavItem href="/billing" icon="◇" label="Planos" active={pathname === "/billing"} />
      <NavItem href="/ajuda" icon="⚙" label="Ajuda" active={pathname === "/ajuda"} />

      {/* User info */}
      <UserFooter />
    </aside>
  )
}

function NavSection({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: "10px", fontWeight: 500, color: "#888",
      letterSpacing: ".07em", textTransform: "uppercase",
      padding: "10px 10px 3px"
    }}>{label}</div>
  )
}

function NavItem({ href, icon, dot, label, active }: {
  href: string; icon?: string; dot?: string; label: string; active: boolean
}) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "6px 10px", borderRadius: "8px",
          fontSize: "13px",
          color: active ? "#1a1a1a" : "#3a3a3a",
          fontWeight: active ? 500 : 400,
          background: active ? "#E1F5EE" : "transparent",
          cursor: "pointer",
          transition: "background .1s",
        }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#f5f5f3" }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent" }}
      >
        {dot && (
          <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: dot, flexShrink: 0 }} />
        )}
        {icon && (
          <span style={{ fontSize: "13px", width: "16px", textAlign: "center", flexShrink: 0 }}>{icon}</span>
        )}
        {label}
      </div>
    </Link>
  )
}

function UserFooter() {
  const [name, setName] = useState("")
  const [initials, setInitials] = useState("?")
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      const fullName =
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        session.user.email?.split("@")[0] ||
        "Usuário"
      setName(fullName)
      setInitials(
        fullName.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()
      )
    })
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace("/login")
  }

  return (
    <div style={{ marginTop: "auto", borderTop: "0.5px solid #d8d6d0", paddingTop: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px" }}>
        <div style={{
          width: "26px", height: "26px", borderRadius: "50%",
          background: "#E1F5EE", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "11px", fontWeight: 500,
          color: "#0F6E56", flexShrink: 0
        }}>{initials}</div>
        <div style={{ overflow: "hidden", flex: 1 }}>
          <div style={{ fontSize: "12px", fontWeight: 500, color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {name || "…"}
          </div>
        </div>
        <button
          onClick={handleLogout}
          title="Sair"
          style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "4px", borderRadius: "6px", color: "#888",
            display: "flex", alignItems: "center", flexShrink: 0,
            transition: "color .1s"
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#1a1a1a"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#888"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
