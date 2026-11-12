"use client"
import React, { useState, use } from 'react'
import Link from 'next/link'
import { benchmarkDataService, Probe, AttackFamilyMeta } from '@/lib/data-service'
import ProbeDrawer from '@/components/ProbeDrawer'
import { ShieldAlert, BookOpen, ExternalLink, ArrowLeft, Search, Filter } from 'lucide-react'

export default function AttackFamilyDetailPage({ params }: { params: Promise<{ familyId: string }> }) {
  const resolvedParams = use(params)
  const familyId = resolvedParams.familyId
  const families = benchmarkDataService.getAttackFamilies()
  const family: AttackFamilyMeta | undefined = families.find(f => f.id.toLowerCase() === familyId.toLowerCase())
  const probes: Probe[] = benchmarkDataService.getProbesByFamily(familyId)

  const [searchQuery, setSearchQuery] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [selectedProbe, setSelectedProbe] = useState<Probe | null>(null)

  if (!family) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold">Attack Family Not Found</h2>
        <p className="text-sm text-[var(--text-secondary)]">The requested attack family &quot;{familyId}&quot; does not exist in the benchmark.</p>
        <Link href="/attack-families" className="text-xs text-[var(--primary)] font-semibold hover:underline">
          ← Return to Attack Families
        </Link>
      </div>
    )
  }

  // Filter probes
  const filteredProbes = probes.filter(p => {
    const matchesSearch =
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.prompt.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesDifficulty = difficultyFilter === 'all' || p.difficulty.toLowerCase() === difficultyFilter.toLowerCase()

    return matchesSearch && matchesDifficulty
  })

  // Extract all unique references across probes in this family
  const allReferences = probes.flatMap(p => p.references || [])
  const uniqueReferences = Array.from(new Set(allReferences.map(r => r.title))).map(title =>
    allReferences.find(r => r.title === title)!
  )

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Header */}
      <div>
        <Link href="/attack-families" className="inline-flex items-center gap-1 text-xs text-[var(--primary)] font-semibold hover:underline mb-2">
          <ArrowLeft className="h-3 w-3" /> Back to Taxonomy
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                {family.id}
              </span>
              <span className="badge-semantic badge-neutral">Threat: {family.threatModel}</span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{family.name}</h1>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="research-card py-1 px-3 text-center">
              <span className="text-[var(--text-muted)] block text-[10px] uppercase">Probes Count</span>
              <span className="font-bold text-sm">{family.probeCount}</span>
            </span>
            <span className="research-card py-1 px-3 text-center">
              <span className="text-[var(--text-muted)] block text-[10px] uppercase">Research Citations</span>
              <span className="font-bold text-sm text-[var(--primary)]">{uniqueReferences.length}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Family Description & Overview */}
      <div className="research-card space-y-4">
        <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Threat Model & Vulnerability Overview</h2>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{family.description}</p>

        <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap gap-2 text-xs">
          <span className="font-semibold text-[var(--text-muted)]">Target Architecture Layers:</span>
          {family.affectedLayers.map((layer, idx) => (
            <span key={idx} className="font-mono text-[11px] px-2 py-0.5 rounded bg-[var(--surface-base)] border border-[var(--border-subtle)]">
              {layer}
            </span>
          ))}
        </div>
      </div>

      {/* Research Papers Section */}
      {uniqueReferences.length > 0 && (
        <div className="research-card space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-[var(--primary)]" /> Academic Research Citations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {uniqueReferences.map((ref, idx) => (
              <div key={idx} className="p-3 rounded-md bg-[var(--surface-base)] border border-[var(--border-subtle)] text-xs space-y-1">
                <div className="font-semibold text-[var(--text-primary)]">{ref.title}</div>
                <div className="text-[var(--text-secondary)]">
                  {ref.authors ? ref.authors.join(', ') : 'Researchers'} ({ref.year}) — <span className="italic">{ref.venue}</span>
                </div>
                {ref.url && (
                  <a href={ref.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--primary)] hover:underline text-[11px] font-medium pt-1">
                    arXiv Paper <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Probes Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search probes in this family..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-base)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          <select
            value={difficultyFilter}
            onChange={e => setDifficultyFilter(e.target.value)}
            className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-base)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none"
          >
            <option value="all">All Difficulties</option>
            <option value="trivial">Trivial</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="expert">Expert</option>
          </select>
        </div>
      </div>

      {/* Probes Table */}
      <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
        <table className="research-table">
          <thead>
            <tr>
              <th>Probe ID</th>
              <th>Probe Title</th>
              <th>Variant</th>
              <th>Scenario</th>
              <th>Difficulty</th>
              <th>Threat Model</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredProbes.map((p) => (
              <tr
                key={p.id}
                onClick={() => setSelectedProbe(p)}
                className="cursor-pointer hover:bg-[var(--surface-base)] transition-colors"
              >
                <td className="font-mono text-xs font-semibold text-[var(--primary)]">{p.id}</td>
                <td className="font-medium text-xs text-[var(--text-primary)]">{p.title}</td>
                <td className="font-mono text-xs text-[var(--text-secondary)]">{p.attack_variant}</td>
                <td className="capitalize text-xs text-[var(--text-secondary)]">{p.scenario}</td>
                <td>
                  <span className="badge-semantic badge-neutral uppercase text-[9px] font-mono">
                    {p.difficulty}
                  </span>
                </td>
                <td className="capitalize text-xs text-[var(--text-secondary)]">{p.threat_model.replace(/_/g, ' ')}</td>
                <td>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedProbe(p)
                    }}
                    className="text-xs text-[var(--primary)] font-semibold hover:underline"
                  >
                    Inspect Payload
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ProbeDrawer probe={selectedProbe} onClose={() => setSelectedProbe(null)} />
    </div>
  )
}
