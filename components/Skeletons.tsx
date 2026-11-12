import React from 'react'

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-md border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
      <div className="animate-pulse space-y-3">
        <div className="h-6 w-full rounded bg-[var(--border-subtle)] opacity-40" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="h-4 flex-1 rounded bg-[var(--border-subtle)] opacity-30" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5">
          <div className="h-3 w-1/2 rounded bg-[var(--border-subtle)] opacity-40" />
          <div className="mt-3 h-8 w-3/4 rounded bg-[var(--border-subtle)] opacity-60" />
          <div className="mt-2 h-3 w-1/3 rounded bg-[var(--border-subtle)] opacity-30" />
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6">
      <div className="h-4 w-1/4 rounded bg-[var(--border-subtle)] opacity-50 mb-4" />
      <div className="h-64 w-full rounded bg-[var(--border-subtle)] opacity-20" />
    </div>
  )
}
