import React from 'react'
import Link from 'next/link'
import { Inbox, PlayCircle, BarChart2 } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  icon?: 'inbox' | 'play' | 'chart'
}

export default function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  icon = 'inbox',
}: EmptyStateProps) {
  const renderIcon = () => {
    switch (icon) {
      case 'play':
        return <PlayCircle className="h-10 w-10 text-[var(--primary)]" />
      case 'chart':
        return <BarChart2 className="h-10 w-10 text-[var(--accent)]" />
      default:
        return <Inbox className="h-10 w-10 text-[var(--text-muted)]" />
    }
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--surface-raised)] p-10 text-center">
      <div className="mb-4 rounded-full bg-[var(--surface-base)] p-3 border border-[var(--border-subtle)]">
        {renderIcon()}
      </div>
      <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-[var(--text-secondary)]">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
