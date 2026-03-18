'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import LoreLogo from '@/components/LoreLogo'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { toasts, toast, close } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  // Show errors passed via URL (e.g. from auth callback)
  useEffect(() => {
    const err = searchParams.get('error')
    if (err) toast(decodeURIComponent(err), 'error')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function validate() {
    const e: typeof errors = {}
    if (!email) e.email = 'Informe seu e-mail.'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'E-mail inválido.'
    if (!password) e.password = 'Informe sua senha.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast('E-mail ou senha incorretos. Verifique e tente novamente.', 'error')
      } else if (error.message.includes('Email not confirmed')) {
        toast('Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.', 'warning')
      } else {
        toast(error.message, 'error')
      }
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) toast(error.message, 'error')
  }

  return (
    <>
      <main className="min-h-screen bg-parchment flex items-center justify-center p-4">
        <div className="w-full max-w-md flex flex-col gap-6">

          {/* Logo + tagline */}
          <div className="flex flex-col items-center gap-3 text-center">
            <LoreLogo />
            <p
              className="text-muted text-center"
              style={{ fontFamily: 'var(--font-serif)', fontSize: '15px' }}
            >
              Your company, remembered.
            </p>
          </div>

          {/* Card */}
          <div className="bg-surface border border-stone rounded-2xl p-8 flex flex-col gap-5">

            <form onSubmit={handleLogin} noValidate className="flex flex-col gap-5">

              <Input
                id="email"
                type="email"
                label="E-mail"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors((p) => ({ ...p, email: undefined }))
                }}
                error={errors.email}
                autoComplete="email"
                autoFocus
                leftIcon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                }
              />

              <div className="flex flex-col gap-1">
                <Input
                  id="password"
                  type="password"
                  label="Senha"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errors.password) setErrors((p) => ({ ...p, password: undefined }))
                  }}
                  error={errors.password}
                  autoComplete="current-password"
                />
                <div className="flex justify-end mt-1">
                  <Link
                    href="/forgot-password"
                    className="text-xs text-brand hover:text-brand-dark hover:underline transition-colors"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
              </div>

              <Button type="submit" loading={loading} fullWidth size="lg">
                Entrar
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-stone/50" />
                <span className="text-xs text-muted font-medium">ou</span>
                <div className="flex-1 h-px bg-stone/50" />
              </div>

              {/* Google */}
              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={handleGoogleLogin}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continuar com Google
              </Button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-muted">
            Não tem uma conta?{' '}
            <Link
              href="/register"
              className="text-brand font-semibold hover:text-brand-dark hover:underline transition-colors"
            >
              Criar conta
            </Link>
          </p>
        </div>
      </main>

      <ToastContainer toasts={toasts} onClose={close} />
    </>
  )
}
