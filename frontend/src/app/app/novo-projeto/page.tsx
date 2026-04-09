"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function NovoProjetoPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/app")
    // Small delay so the page loads then dispatches event
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("open-new-project"))
    }, 100)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}
