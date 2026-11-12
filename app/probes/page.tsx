"use client"
import React, { useState } from 'react'
import Link from 'next/link'
import { benchmarkDataService, Probe } from '@/lib/data-service'
import ProbeDrawer from '@/components/ProbeDrawer'
import { Target, Search, Filter, ExternalLink } from 'lucide-react'

export default function ProbesIndexPage() {
  const allProbes: Probe[] = benchmarkDataService.getAllProbes()
  const families = benchmarkDataService.getAttackFamilies()
  const scenarios = benchmarkDataService.getScenarios()

  const [searchQuery, setSearchQuery] = useState('')
  const [familyFilter, setFamilyFilter] = useState('all')
  const [scenarioFilter, setScenarioFilter] = useState('all')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [selectedProbe, setSelectedProbe] = useState<Probe | null>(null)

  const filteredProbes = allProbes.filter(p => {
    const matchesSearch =
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.prompt.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFamily = familyFilter === 'all' || p.attack_family.toLowerCase() === familyFilter.toLowerCase()
    const matchesScenario = scenarioFilter === 'all' || p.scenario.toLowerCase() === scenarioFilter.toLowerCase()
    const matchesDifficulty = difficultyFilter === 'all' || p.difficulty.toLowerCase() === difficultyFilter.toLowerCase()

    return matchesSearch && matchesFamily && matchesScenario && matchesDifficulty
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[var(--border-subtle)] pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--primary)] uppercase tracking-wider mb-1">
          <Target className="h-4 w-4" /> Benchmark Probes Directory
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Core Security Evaluation Probes</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Browse all {allProbes.length} empirical security probes across 8 attack families and 12 application scenarios.
        </p>
      </div>

      {/* Multi-facet Filter Toolbar */}
      <div className="research-card space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Filter by Probe ID (RG-DI-001), keywords, or payload..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-base)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          {/* Family Dropdown */}
          <select
            value={familyFilter}
            onChange={e => setFamilyFilter(e.target.value)}
            className="w-full md:w-auto rounded-md border border-[var(--border-subtle)] bg-[var(--surface-base)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none"
          >
            <option value="all">All Attack Families</option>
            {families.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>

          {/* Scenario Dropdown */}
          <select
            value={scenarioFilter}
            onChange={e => setScenarioFilter(e.target.value)}
            className="w-full md:w-auto rounded-md border border-[var(--border-subtle)] bg-[var(--surface-base)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none"
          >
            <option value="all">All Scenarios</option>
            {scenarios.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Difficulty Dropdown */}
          <select
            value={difficultyFilter}
            onChange={e => setDifficultyFilter(e.target.value)}
            className="w-full md:w-auto rounded-md border border-[var(--border-subtle)] bg-[var(--surface-base)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none"
          >
            <option value="all">All Difficulties</option>
            <option value="trivial">Trivial</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="expert">Expert</option>
          </select>
        </div>

        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-1">
          <span>Showing <strong className="text-[var(--text-primary)]">{filteredProbes.length}</strong> of {allProbes.length} probes</span>
          {(searchQuery || familyFilter !== 'all' || scenarioFilter !== 'all' || difficultyFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setFamilyFilter('all')
                setScenarioFilter('all')
                setDifficultyFilter('all')
              }}
              className="text-[var(--primary)] hover:underline font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Probes Data Table */}
      <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
        <table className="research-table">
          <thead>
            <tr>
              <th>Probe ID</th>
              <th>Probe Title</th>
              <th>Attack Family</th>
              <th>Variant</th>
              <th>Scenario</th>
              <th>Difficulty</th>
              <th>Affected Layers</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredProbes.map(p => (
              <tr
                key={p.id}
                onClick={() => setSelectedProbe(p)}
                className="cursor-pointer hover:bg-[var(--surface-base)] transition-colors"
              >
                <td className="font-mono text-xs font-semibold text-[var(--primary)]">{p.id}</td>
                <td className="font-medium text-xs text-[var(--text-primary)]">{p.title}</td>
                <td className="capitalize text-xs text-[var(--text-secondary)]">{p.attack_family.replace(/_/g, ' ')}</td>
                <td className="font-mono text-xs text-[var(--text-muted)]">{p.attack_variant}</td>
                <td className="capitalize text-xs text-[var(--text-secondary)]">{p.scenario}</td>
                <td>
                  <span className="badge-semantic badge-neutral uppercase text-[9px] font-mono">
                    {p.difficulty}
                  </span>
                </td>
                <td className="font-mono text-[11px] text-[var(--text-muted)]">{(p.affected_layers || []).join(', ')}</td>
                <td>
                  <Link
                    href={`/probes/${p.id}`}
                    onClick={e => e.stopPropagation()}
                    className="text-xs text-[var(--primary)] font-semibold hover:underline"
                  >
                    View Page
                  </Link>
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
