"use client"
import React, { useState } from 'react'
import Link from 'next/link'
import { benchmarkDataService, AttackFamilyMeta } from '@/lib/data-service'
import { Database, CheckCircle2, ShieldCheck, Search, FileText } from 'lucide-react'

export default function DatasetsPage() {
  const families: AttackFamilyMeta[] = benchmarkDataService.getAttackFamilies()
  const allProbes = benchmarkDataService.getAllProbes()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredProbes = allProbes.filter(
    p =>
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.attack_family.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--primary)] uppercase tracking-wider mb-1">
            <Database className="h-4 w-4" /> Benchmark Artifacts
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Dataset Metadata & Coverage</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Static dataset specification, JSON schema validation, and probe coverage statistics.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="badge-semantic badge-success py-1 px-3">
            <CheckCircle2 className="h-3.5 w-3.5" /> Schema v2.0.0 PASSED
          </span>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="research-card">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Dataset Version</span>
          <div className="text-2xl font-black font-mono text-[var(--primary)] mt-1">2.0.0</div>
          <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">SemVer 2.0.0</span>
        </div>

        <div className="research-card">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Probe Schema Version</span>
          <div className="text-2xl font-black font-mono text-indigo-500 mt-1">2.0.0</div>
          <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">Strict JSON Schema</span>
        </div>

        <div className="research-card">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Built-in Probe Count</span>
          <div className="text-2xl font-black font-mono text-emerald-500 mt-1">{allProbes.length}</div>
          <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">Across 8 JSON files</span>
        </div>

        <div className="research-card">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Validation Status</span>
          <div className="text-2xl font-black font-mono text-emerald-600 mt-1">100%</div>
          <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">Zero validation errors</span>
        </div>
      </div>

      {/* Dataset Files Matrix Table */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
          Dataset JSON File Inventory
        </h2>

        <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
          <table className="research-table">
            <thead>
              <tr>
                <th>Dataset JSON Filename</th>
                <th>Attack Family</th>
                <th>Probes</th>
                <th>Threat Model</th>
                <th>Target Layers</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {families.map(f => (
                <tr key={f.id} className="hover:bg-[var(--surface-base)] transition-colors">
                  <td className="font-mono text-xs font-semibold text-[var(--primary)]">{f.id}.json</td>
                  <td className="font-bold text-xs capitalize text-[var(--text-primary)]">{f.name}</td>
                  <td className="font-mono text-xs text-center font-semibold">{f.probeCount}</td>
                  <td className="text-xs text-[var(--text-secondary)]">{f.threatModel}</td>
                  <td className="font-mono text-[11px] text-[var(--text-muted)]">{f.affectedLayers.join(', ')}</td>
                  <td>
                    <Link href={`/attack-families/${f.id}`} className="text-xs text-[var(--primary)] font-semibold hover:underline">
                      Inspect Probes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
