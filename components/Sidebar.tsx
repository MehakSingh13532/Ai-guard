"use client"
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  PlayCircle,
  ShieldAlert,
  Target,
  Globe,
  Award,
  FileSpreadsheet,
  Database,
  BookOpen,
  Settings,
  Flame,
} from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Benchmark', path: '/benchmark', icon: PlayCircle },
    { name: 'Attack Families', path: '/attack-families', icon: ShieldAlert, count: '8' },
    { name: 'Probes', path: '/probes', icon: Target },
    { name: 'Scenarios', path: '/scenarios', icon: Globe, count: '12' },
    { name: 'Models & Ranking', path: '/comparison', icon: Award },
    { name: 'Reports & Results', path: '/reports', icon: FileSpreadsheet },
    { name: 'Datasets', path: '/datasets', icon: Database },
    { name: 'Documentation', path: '/policy', icon: BookOpen },
    { name: 'Settings', path: '/settings', icon: Settings },
  ]

  return (
    <aside className="w-64 border-r border-[var(--border-subtle)] bg-[var(--surface-raised)] flex flex-col h-[calc(100vh-3.5rem)] sticky top-14 transition-all duration-200 lg:w-64 shrink-0">
      {/* Section Header */}
      <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
        <span>Navigation</span>
        <span className="flex items-center gap-1 font-mono text-[10px] text-[var(--primary)] bg-[var(--primary)]/10 px-1.5 py-0.5 rounded">
          <Flame className="h-3 w-3" /> Academic
        </span>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 font-semibold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-base)] hover:text-[var(--text-primary)]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`h-4 w-4 ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`} />
                <span>{item.name}</span>
              </div>
              {item.count && (
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[var(--surface-base)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                  {item.count}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Academic Citation note */}
      <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--surface-base)] text-[11px] text-[var(--text-muted)]">
        <div className="font-semibold text-[var(--text-secondary)]">Ai-guard Benchmark</div>
        <div className="mt-0.5 font-mono text-[10px]">Citation: aiguard2024</div>
      </div>
    </aside>
  )
}
