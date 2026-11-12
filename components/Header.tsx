"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Moon, Sun, Play, Shield, Layers } from 'lucide-react'

interface HeaderProps {
  onOpenSearch: () => void
}

export default function Header({ onOpenSearch }: HeaderProps) {
  const [isDark, setIsDark] = useState(true)
  const [selectedModel, setSelectedModel] = useState('nemotron_3_ultra')

  useEffect(() => {
    // Check document class
    if (document.documentElement.classList.contains('dark')) {
      setIsDark(true)
    } else {
      setIsDark(false)
    }
  }, [])

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark')
      setIsDark(false)
    } else {
      document.documentElement.classList.add('dark')
      setIsDark(true)
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]/95 px-6 backdrop-blur-md">
      {/* Left: Brand logo & version tags */}
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2.5 text-sm font-bold tracking-tight text-[var(--text-primary)]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/15 p-1 border border-[var(--primary)]/30">
            <img src="/shield.svg" alt="Ai-guard Shield Logo" className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black leading-none text-[var(--text-primary)] tracking-tight">Ai-guard</span>
            <span className="text-[10px] font-mono text-[var(--primary)] leading-none mt-0.5 font-semibold">AI Security Benchmark</span>
          </div>
        </Link>

        <div className="hidden sm:flex items-center gap-2 border-l border-[var(--border-subtle)] pl-4 text-xs font-mono">
          <span className="inline-flex items-center gap-1 rounded bg-[var(--surface-base)] px-2 py-0.5 text-[var(--text-secondary)] border border-[var(--border-subtle)]">
            <Layers className="h-3 w-3 text-[var(--primary)]" /> Benchmark v2.0.0
          </span>
          <span className="inline-flex items-center gap-1 rounded bg-[var(--surface-base)] px-2 py-0.5 text-[var(--text-secondary)] border border-[var(--border-subtle)]">
            Dataset v2.0.0
          </span>
        </div>
      </div>

      {/* Middle: Search bar trigger */}
      <div className="flex-1 max-w-md mx-6">
        <button
          onClick={onOpenSearch}
          className="flex w-full items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--border-default)]"
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5" />
            <span>Search probes, attack families, scenarios, models...</span>
          </div>
          <kbd className="hidden sm:inline-block font-mono text-[10px] bg-[var(--surface-raised)] border border-[var(--border-subtle)] px-1.5 py-0.5 rounded text-[var(--text-muted)]">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Model selector, theme toggle, and Run CTA */}
      <div className="flex items-center gap-3">
        <select
          value={selectedModel}
          onChange={e => setSelectedModel(e.target.value)}
          className="hidden md:block rounded-md border border-[var(--border-subtle)] bg-[var(--surface-base)] px-2.5 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
        >
          <option value="nemotron_3_ultra">Nemotron-3 Ultra (550B)</option>
          <option value="nemotron_super_agent">Nemotron-3 Super (120B)</option>
          <option value="llama3_3_70b_agent">Llama 3.3 70B Instruct</option>
          <option value="deepseek_flash_agent">DeepSeek Flash 2.5</option>
          <option value="ollama_local_agent">Ollama Local Agent</option>
        </select>

        <button
          onClick={toggleTheme}
          title="Toggle Light/Dark Theme"
          className="p-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
        </button>

        <Link
          href={`/benchmark?agent=${encodeURIComponent(selectedModel)}`}
          className="flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[var(--primary-hover)]"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>Run Benchmark</span>
        </Link>
      </div>
    </header>
  )
}
