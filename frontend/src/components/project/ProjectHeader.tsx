'use client'

import Link from 'next/link'
import LoreLogo from '@/components/LoreLogo'

interface Props {
  projectName: string
  projectId: string
  icon: string
}

export function ProjectHeader({ projectName, projectId, icon }: Props) {
  return (
    <header className="sticky top-0 z-30 bg-surface border-b border-stone shadow-sm shrink-0">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-stone/20 transition-colors shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
        <Link href="/dashboard" className="shrink-0">
          <LoreLogo layout="inline" size="h-7 w-7" showWordmark={false} />
        </Link>
        <div className="h-5 w-px bg-stone shrink-0" />
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">{icon}</span>
          <h1 className="font-semibold text-ink text-sm truncate">{projectName}</h1>
        </div>
        <div className="hidden sm:flex items-center gap-2 ml-auto">
          <Link
            href={`/project/${projectId}/settings`}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-stone/20 transition-colors"
            title="Configurações do projeto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  )
}
