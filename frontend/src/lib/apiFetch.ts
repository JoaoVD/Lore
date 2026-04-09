/**
 * apiFetch — helper autenticado para o backend FastAPI.
 * Usa o token da sessão Supabase passado como argumento.
 */
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000") + "/api"

export async function apiFetch<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const detail = body.detail
    if (res.status === 402 && typeof detail === "object" && detail !== null) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("upgrade-required", { detail }))
      }
    }
    throw new Error(
      typeof detail === "object" && detail?.message
        ? detail.message
        : (detail ?? `Erro ${res.status}`)
    )
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}
