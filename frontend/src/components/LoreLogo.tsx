/**
 * LoreLogo — shared brand mark used on auth pages and headers.
 * Icon: an open book with a leaf (knowledge + nature).
 * Wordmark: "Lore" in Playfair Display (--font-serif).
 *
 * layout="stack"  → icon above wordmark  (auth pages, default)
 * layout="inline" → icon left of wordmark (headers, nav)
 */

interface LoreLogoProps {
  /** Show the text "Lore" next to/below the mark. Default: true */
  showWordmark?: boolean
  /** Icon container size class. Default: 'h-12 w-12' */
  size?: string
  /** Layout direction. Default: 'stack' */
  layout?: 'stack' | 'inline'
  /** Wordmark text size class. Default depends on layout */
  wordmarkSize?: string
}

export default function LoreLogo({
  showWordmark = true,
  size = 'h-12 w-12',
  layout = 'stack',
  wordmarkSize,
}: LoreLogoProps) {
  const isInline = layout === 'inline'
  const defaultWordmarkSize = isInline ? 'text-lg' : 'text-2xl'
  const wSize = wordmarkSize ?? defaultWordmarkSize

  return (
    <div
      className={
        isInline
          ? 'flex flex-row items-center gap-2'
          : 'flex flex-col items-center gap-2'
      }
    >
      {/* Icon mark */}
      <div
        className={`${size} rounded-2xl bg-brand flex items-center justify-center shadow-md shrink-0`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          fill="none"
          className="w-[58%] h-[58%]"
          aria-hidden="true"
        >
          {/* Open book */}
          <path
            d="M16 8 C12 6 7 6.5 4 8 L4 25 C7 23.5 12 23 16 25 C20 23 25 23.5 28 25 L28 8 C25 6.5 20 6 16 8 Z"
            stroke="white"
            strokeWidth="1.8"
            strokeLinejoin="round"
            fill="none"
          />
          <line x1="16" y1="8" x2="16" y2="25" stroke="white" strokeWidth="1.8" />
          {/* Small leaf on top */}
          <path
            d="M16 4 C16 4 19 1 22 3 C20 5 17 5.5 16 4 Z"
            fill="white"
            opacity="0.9"
          />
        </svg>
      </div>

      {/* Wordmark */}
      {showWordmark && (
        <span
          className={`${wSize} font-bold tracking-tight text-ink`}
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Lore
        </span>
      )}
    </div>
  )
}
