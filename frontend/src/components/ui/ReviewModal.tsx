'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// Chave no localStorage por usuário para não repetir o pedido
export function reviewStorageKey(userId: string) {
  return `lore_review_${userId}`
}

interface ReviewModalProps {
  userId: string
  onClose: () => void
}

export default function ReviewModal({ userId, onClose }: ReviewModalProps) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [visible, setVisible] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function dismiss() {
    localStorage.setItem(reviewStorageKey(userId), 'dismissed')
    setVisible(false)
    setTimeout(onClose, 220)
  }

  async function handleSubmit() {
    if (!rating) return
    setLoading(true)
    try {
      await supabase.from('reviews').insert({
        user_id: userId,
        rating,
        comment: comment.trim() || null,
      })
    } catch {
      // Ignora erro silenciosamente — avaliação ainda é marcada como enviada
    } finally {
      localStorage.setItem(reviewStorageKey(userId), 'submitted')
      setLoading(false)
      setDone(true)
      setTimeout(() => {
        setVisible(false)
        setTimeout(onClose, 220)
      }, 2200)
    }
  }

  const filled = hover || rating

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: `rgba(0,0,0,${visible ? 0.45 : 0})`,
        transition: 'background-color 220ms ease',
        backdropFilter: visible ? 'blur(3px)' : 'blur(0px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss() }}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)',
          transition: 'opacity 220ms ease, transform 220ms ease',
        }}
      >
        {/* Faixa de cor no topo */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #0F6E56, #1a9e7a)' }} />

        <div className="p-6">
          {done ? (
            /* ── Estado de sucesso ── */
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#E1F5EE' }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-base font-semibold" style={{ color: '#1C1C1A' }}>Obrigado pelo feedback!</p>
              <p className="text-sm" style={{ color: '#7A7870' }}>Sua avaliação nos ajuda a melhorar o Lore.</p>
            </div>
          ) : (
            /* ── Formulário de avaliação ── */
            <>
              {/* Cabeçalho */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0"
                    style={{ backgroundColor: '#E1F5EE', color: '#0F6E56' }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-[15px] font-semibold leading-tight" style={{ color: '#1C1C1A' }}>
                      Como está sendo o Lore?
                    </h2>
                    <p className="text-[12px] mt-0.5" style={{ color: '#7A7870' }}>
                      Você usa o Lore há 14 dias 🎉
                    </p>
                  </div>
                </div>
                <button
                  onClick={dismiss}
                  className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
                  style={{ color: '#C8C6BC' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#3A3A38'; e.currentTarget.style.background = '#F1EFE8' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#C8C6BC'; e.currentTarget.style.background = 'transparent' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <p className="text-[13.5px] leading-relaxed mb-5" style={{ color: '#3A3A38' }}>
                Sua opinião é muito importante para continuarmos melhorando a ferramenta.
              </p>

              {/* Estrelas */}
              <div className="flex justify-center gap-2 mb-5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(star)}
                    style={{ transition: 'transform 120ms', transform: filled >= star ? 'scale(1.12)' : 'scale(1)' }}
                    aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
                  >
                    <svg
                      width="38"
                      height="38"
                      viewBox="0 0 24 24"
                      fill={filled >= star ? '#0F6E56' : 'none'}
                      stroke={filled >= star ? '#0F6E56' : '#C8C6BC'}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ transition: 'fill 120ms, stroke 120ms' }}
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                ))}
              </div>

              {/* Campo de comentário */}
              <textarea
                placeholder="Conta o que está achando (opcional)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full rounded-xl border px-4 py-3 text-sm resize-none outline-none transition-all duration-150 mb-4"
                style={{
                  borderColor: '#C8C6BC',
                  background: '#FAFAF8',
                  color: '#1C1C1A',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#0F6E56'; e.target.style.boxShadow = '0 0 0 3px rgba(15,110,86,0.12)' }}
                onBlur={(e) => { e.target.style.borderColor = '#C8C6BC'; e.target.style.boxShadow = 'none' }}
              />

              {/* Ações */}
              <div className="flex gap-2.5">
                <button
                  onClick={handleSubmit}
                  disabled={!rating || loading}
                  className="flex-1 py-2.5 rounded-xl text-[13.5px] font-semibold text-white transition-opacity"
                  style={{
                    backgroundColor: '#0F6E56',
                    opacity: !rating || loading ? 0.45 : 1,
                    cursor: !rating || loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Enviando...' : 'Enviar avaliação'}
                </button>
                <button
                  onClick={dismiss}
                  className="px-4 py-2.5 rounded-xl text-[13.5px] font-medium transition-colors"
                  style={{ color: '#3A3A38', backgroundColor: '#F1EFE8' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E1F5EE' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F1EFE8' }}
                >
                  Agora não
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
