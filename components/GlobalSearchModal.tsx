"use client"
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { searchBenchmark, SearchResultItem } from '@/lib/search-index'
import { Search, X, Shield, FileText, ArrowRight, CornerDownLeft } from 'lucide-react'

interface GlobalSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()

  useEffect(() => {
    if (query.trim()) {
      const res = searchBenchmark(query)
      setResults(res)
      setSelectedIndex(0)
    } else {
      setResults([])
    }
  }, [query])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (results.length > 0 ? (prev + 1) % results.length : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (results[selectedIndex]) {
          router.push(results[selectedIndex].link)
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex, router, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="flex-1" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-[var(--surface-overlay)] border border-[var(--border-default)] rounded-xl shadow-2xl overflow-hidden flex flex-col mx-4 my-auto">
        {/* Search input header */}
        <div className="flex items-center px-4 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]">
          <Search className="h-5 w-5 text-[var(--text-muted)] mr-3" />
          <input
            type="text"
            autoFocus
            placeholder="Search probes (RG-DI-001), attack families, scenarios, models..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full py-4 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results list */}
        <div className="max-h-96 overflow-y-auto p-2">
          {query.trim() === '' ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              Type to search Probe IDs, Attack Families, Scenarios, Models, and Reports
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              No matching benchmark items found for &quot;{query}&quot;
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((item, idx) => {
                const isSelected = idx === selectedIndex
                return (
                  <div
                    key={`${item.type}-${item.id}-${idx}`}
                    onClick={() => {
                      router.push(item.link)
                      onClose()
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors text-xs ${
                      isSelected ? 'bg-[var(--primary)]/10 border border-[var(--primary)]/30' : 'hover:bg-[var(--surface-base)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-md ${item.type === 'probe' ? 'bg-blue-500/10 text-blue-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                        {item.type === 'probe' ? <Shield className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--text-primary)]">{item.title}</div>
                        <div className="text-[var(--text-secondary)] text-[11px] mt-0.5">{item.subtitle}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--surface-base)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                        {item.badgeText}
                      </span>
                      {isSelected && <CornerDownLeft className="h-3.5 w-3.5 text-[var(--primary)]" />}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--surface-base)] border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
          <span>Navigate with <kbd className="px-1 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border-subtle)] font-mono">↑</kbd> <kbd className="px-1 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border-subtle)] font-mono">↓</kbd></span>
          <span>Select with <kbd className="px-1 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border-subtle)] font-mono">↵</kbd></span>
          <span>Close with <kbd className="px-1 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border-subtle)] font-mono">ESC</kbd></span>
        </div>
      </div>
    </div>
  )
}
