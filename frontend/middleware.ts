import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rotas que não exigem assinatura ativa
const PUBLIC_PATHS = [
  '/billing',
  '/login',
  '/register',
  '/auth',
  '/api',
  '/_next',
  '/favicon.ico',
  '/terms',
  '/privacy',
  '/contact',
]

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname === '/'
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Sem sessão → redireciona para login (exceto rotas públicas)
  if (!user) {
    if (!isPublic(pathname)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  // Com sessão mas rota pública → segue normalmente
  if (isPublic(pathname)) {
    return response
  }

  // Verifica assinatura — ausência de registro = plano gratuito (permitido)
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle()

  // null = plano gratuito; status canceled/past_due = redireciona para billing
  const isBlocked =
    sub !== null && sub.status !== 'active' && sub.status !== 'trialing'

  if (isBlocked) {
    return NextResponse.redirect(new URL('/billing', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Exclui arquivos estáticos e imagens
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
