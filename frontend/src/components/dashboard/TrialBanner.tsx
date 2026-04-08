"use client"
import { useEffect, useState } from "react"
import Link from "next/link"

export function TrialBanner({ product }: { product: string }) {
  const [sub, setSub] = useState<{ plan: string; trial_ends_at: string } | null>(null)

  useEffect(() => {
    fetch(`/api/subscriptions/${product}`)
      .then(r => r.json())
      .then(setSub)
      .catch(() => {})
  }, [product])

  if (!sub || sub.plan !== "trial") return null

  const days = Math.max(0, Math.ceil(
    (new Date(sub.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ))

  return (
    <div style={{
      background: "#E1F5EE", border: "0.5px solid #9FE1CB",
      borderRadius: "8px", padding: "9px 14px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      marginBottom: "24px"
    }}>
      <span style={{ fontSize: "12px", color: "#1a1a1a" }}>
        ⏳ Seu trial do Lore Docs termina em {days} dia{days !== 1 ? "s" : ""} — aproveite todos os recursos!
      </span>
      <Link href={`/app/${product}/planos`} style={{
        fontSize: "11px", fontWeight: 500, color: "#0F6E56",
        background: "#fff", border: "0.5px solid #9FE1CB",
        padding: "4px 10px", borderRadius: "8px", textDecoration: "none",
        whiteSpace: "nowrap"
      }}>
        Ver planos →
      </Link>
    </div>
  )
}
