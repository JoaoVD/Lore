'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import LoreLogo from '@/components/LoreLogo'

type Step = 'form' | 'confirm'

export default function RegisterPage() {
  const supabase = createClient()
  const { toasts, toast, close } = useToast()

  const [step, setStep] = useState<Step>('form')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string; email?: string; password?: string; confirm?: string
  }>({})

  function validate() {
    const e: typeof errors = {}
    if (!name.trim()) e.name = 'Informe seu nome.'
    if (!email) e.email = 'Informe seu e-mail.'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'E-mail inválido.'
    if (!password) e.password = 'Crie uma senha.'
    else if (password.length < 8) e.password = 'A senha deve ter ao menos 8 caracteres.'
    if (!confirm) e.confirm = 'Confirme sua senha.'
    else if (confirm !== password) e.confirm = 'As senhas não coincidem.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        toast('Este e-mail já está cadastrado. Tente fazer login.', 'warning')
      } else {
        toast(error.message, 'error')
      }
      return
    }

    setStep('confirm')
  }

  async function handleGoogleSignUp() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) toast(error.message, 'error')
  }

  /* ── Confirm step ── */
  if (step === 'confirm') {
    return (
      <>
        <main className="min-h-screen bg-parchment flex items-center justify-center p-4">
          <div className="w-full max-w-md flex flex-col gap-6">

            {/* Logo */}
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
            <div className="bg-surface border border-stone rounded-2xl p-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="h-14 w-14 rounded-full bg-brand-light border border-brand/30 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-ink">Verifique seu e-mail</h2>
                  <p className="text-sm text-muted mt-1 leading-relaxed">
                    Enviamos um link de confirmação para{' '}
                    <span className="font-semibold text-ink">{email}</span>.
                    Clique no link para ativar sua conta.
                  </p>
                </div>
                <div className="w-full p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Não encontrou o e-mail? Verifique a pasta de spam ou lixo eletrônico.
                  </p>
                </div>
                <Link href="/login" className="w-full">
                  <Button variant="outline" fullWidth>
                    Ir para o login
                  </Button>
                </Link>
              </div>
            </div>

          </div>
        </main>
        <ToastContainer toasts={toasts} onClose={close} />
      </>
    )
  }

  /* ── Form step ── */
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
          <div className="bg-surface border border-stone rounded-2xl p-8 flex flex-col gap-4">

            <form onSubmit={handleSignUp} noValidate className="flex flex-col gap-4">

              <Input
                id="name"
                type="text"
                label="Nome completo"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (errors.name) setErrors((p) => ({ ...p, name: undefined }))
                }}
                error={errors.name}
                autoComplete="name"
                autoFocus
                leftIcon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                }
              />

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
                leftIcon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                }
              />

              <Input
                id="password"
                type="password"
                label="Senha"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors((p) => ({ ...p, password: undefined }))
                }}
                error={errors.password}
                hint="Use letras, números e símbolos para uma senha forte."
                autoComplete="new-password"
              />

              <Input
                id="confirm"
                type="password"
                label="Confirmar senha"
                placeholder="Repita a senha"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value)
                  if (errors.confirm) setErrors((p) => ({ ...p, confirm: undefined }))
                }}
                error={errors.confirm}
                autoComplete="new-password"
              />

              <Button type="submit" loading={loading} fullWidth size="lg" className="mt-1">
                Criar conta
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
                onClick={handleGoogleSignUp}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continuar com Google
              </Button>

              <p className="text-center text-xs text-muted leading-relaxed">
                Ao criar sua conta você concorda com nossos{' '}
                <Link href="/terms" className="text-brand hover:underline">Termos de Uso</Link>
                {' '}e{' '}
                <Link href="/privacy" className="text-brand hover:underline">Política de Privacidade</Link>.
              </p>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-muted">
            Já tem uma conta?{' '}
            <Link
              href="/login"
              className="text-brand font-semibold hover:text-brand-dark hover:underline transition-colors"
            >
              Entrar
            </Link>
          </p>
        </div>
      </main>

      <ToastContainer toasts={toasts} onClose={close} />
    </>
  )
}
