/**
 * app/api/integrations/google/callback/route.ts
 *
 * Proxy para o callback OAuth do Google Drive.
 *
 * Por que existe esta rota:
 *   O Google só aceita redirect_uri registrados no Cloud Console.
 *   Como o Next.js frontend roda em :3000 e o FastAPI em :8000, o Google
 *   redireciona para :3000. Esta rota recebe o código de autorização e
 *   redireciona para o FastAPI (:8000) que faz a troca pelo token.
 *
 * Fluxo completo:
 *   Google → localhost:3000/api/integrations/google/callback?code=…&state=…
 *         → (302) localhost:8000/api/integrations/google/callback?code=…&state=…
 *         → FastAPI salva tokens no banco
 *         → (302) localhost:3000/project/{id}/settings?gdrive_connected=1
 */

import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Usuário cancelou ou Google retornou erro
  if (error || !code || !state) {
    const dest = new URL('/', request.url)
    dest.searchParams.set('gdrive_error', error ?? 'cancelled')
    return NextResponse.redirect(dest)
  }

  // Encaminha os parâmetros ao FastAPI com um redirect simples
  // (mantém os mesmos query params que o Google enviou)
  const backendCallback = new URL(`${BACKEND_URL}/api/integrations/google/callback`)
  backendCallback.searchParams.set('code', code)
  backendCallback.searchParams.set('state', state)

  return NextResponse.redirect(backendCallback.toString())
}
