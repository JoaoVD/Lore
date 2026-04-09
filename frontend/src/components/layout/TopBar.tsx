"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function TopBar() {
  const [firstName, setFirstName] = useState("Usuário")
  const [initials,  setInitials]  = useState("US")

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata
      const full =
        meta?.full_name || meta?.name || data.user?.email?.split("@")[0] || "Usuário"
      const first = full.split(" ")[0]
      setFirstName(first)
      setInitials(first.slice(0, 2).toUpperCase())
    })
  }, [])

  function openNewProject() {
    window.dispatchEvent(new CustomEvent("open-new-project"))
  }

  return (
    <header style={{
      background: "#fff",
      borderBottom: "0.5px solid #d8d6d0",
      height: "52px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 40px",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <Link href="/app" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{
          width: "24px", height: "24px", background: "#0F6E56",
          borderRadius: "5px", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "12px", fontWeight: 700,
          color: "#fff", fontFamily: "Georgia, serif",
        }}>L</div>
        <span style={{ fontSize: "14px", fontWeight: 500, color: "#1a1a1a" }}>Lore</span>
      </Link>

      {/* Direita */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <span style={{ fontSize: "12px", color: "#888" }}>{firstName}</span>
        <div style={{
          width: "28px", height: "28px", borderRadius: "50%",
          background: "#0F6E56", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "11px", fontWeight: 500, color: "#fff",
          flexShrink: 0,
        }}>{initials}</div>
        <button
          onClick={openNewProject}
          style={{
            background: "#0F6E56", color: "#fff", border: "none",
            padding: "6px 14px", borderRadius: "6px", fontSize: "12px",
            fontWeight: 500, cursor: "pointer",
          }}
        >
          + Novo projeto
        </button>
      </div>
    </header>
  )
}
