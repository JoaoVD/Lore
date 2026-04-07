'use client'

import type { DashboardProject } from '@/types'

interface Props {
  icon: string
  title: string
  count: number
  projects: DashboardProject[]
  newLabel: string
  onNew: () => void
  renderCard: (project: DashboardProject) => React.ReactNode
}

export function DashboardSection({
  icon,
  title,
  count,
  projects,
  newLabel,
  onNew,
  renderCard,
}: Props) {
  return (
    <div className="mb-10">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h2 className="text-base font-bold text-ink">{title}</h2>
          <span className="text-xs text-ink/40 bg-stone/20 px-2 py-0.5 rounded-full font-medium">
            {count}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => renderCard(p))}

        {/* New project card */}
        <button
          onClick={onNew}
          className="group flex flex-col items-center justify-center p-6 border-2 border-dashed border-stone/40 rounded-2xl text-ink/30 hover:border-brand/40 hover:text-brand hover:bg-brand-light/40 transition-all duration-200 min-h-[140px]"
        >
          <span className="text-2xl mb-2 transition-transform group-hover:scale-110 duration-200">+</span>
          <span className="text-sm font-medium">{newLabel}</span>
        </button>
      </div>
    </div>
  )
}
