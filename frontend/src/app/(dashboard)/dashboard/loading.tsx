import { ProjectGridSkeleton } from './page'
import LoreLogo from '@/components/LoreLogo'

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-parchment">

      {/* Header skeleton */}
      <header className="sticky top-0 z-30 bg-surface border-b border-stone shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <LoreLogo layout="inline" size="h-8 w-8" wordmarkSize="text-lg" />

          {/* Right side skeleton */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-stone/30 animate-pulse" />
              <div className="flex flex-col gap-1.5">
                <div className="h-3 w-24 bg-stone/30 rounded animate-pulse" />
                <div className="h-2.5 w-32 bg-stone/30 rounded animate-pulse" />
              </div>
            </div>
            <div className="sm:hidden h-8 w-8 rounded-full bg-stone/30 animate-pulse" />
            <div className="h-9 w-16 rounded-xl bg-stone/30 animate-pulse" />
          </div>
        </div>
      </header>

      {/* Main skeleton */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex flex-col gap-2">
            <div className="h-7 w-44 bg-stone/40 rounded-lg animate-pulse" />
            <div className="h-4 w-32 bg-stone/30 rounded animate-pulse" />
          </div>
          <div className="h-11 w-36 bg-stone/40 rounded-xl animate-pulse" />
        </div>

        <ProjectGridSkeleton />
      </main>
    </div>
  )
}
