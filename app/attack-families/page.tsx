"use client"
import React, { useState } from 'react'
import Link from 'next/link'
import { benchmarkDataService, AttackFamilyMeta, Probe } from '@/lib/data-service'
import ProbeDrawer from '@/components/ProbeDrawer'
import { ShieldAlert, BookOpen, Layers, ArrowUpRight } from 'lucide-react'

export default function AttackFamiliesPage() {
  const families: AttackFamilyMeta[] = benchmarkDataService.getAttackFamilies()
  const [selectedProbe, setSelectedProbe] = useState<Probe | null>(null)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-[var(--border-subtle)] pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--primary)] uppercase tracking-wider mb-1">
          <ShieldAlert className="h-4 w-4" /> Security Taxonomy
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Attack Family Taxonomy</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Ai-guard categorizes evaluation probes into 8 primary attack vectors targeting LLM agent architectures.
        </p>
      </div>

      {/* Attack Families Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {families.map((fam) => {
          const probes = benchmarkDataService.getProbesByFamily(fam.id)
          return (
            <div key={fam.id} className="research-card space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                    {fam.probeCount} Probes
                  </span>
                  <span className="text-xs text-[var(--text-muted)] font-mono">{fam.researchPapersCount} Publications</span>
                </div>

                <Link href={`/attack-families/${fam.id}`}>
                  <h2 className="text-lg font-bold text-[var(--text-primary)] hover:text-[var(--primary)] transition-colors flex items-center gap-1">
                    {fam.name} <ArrowUpRight className="h-4 w-4" />
                  </h2>
                </Link>

                <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                  {fam.description}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="badge-semantic badge-neutral">Threat: {fam.threatModel}</span>
                  {fam.affectedLayers.map((layer, idx) => (
                    <span key={idx} className="badge-semantic badge-neutral font-mono text-[10px]">
                      {layer}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sample Probes preview */}
              <div className="pt-3 border-t border-[var(--border-subtle)] space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
                  Sample Probes
                </span>
                <div className="space-y-1">
                  {probes.slice(0, 3).map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProbe(p)}
                      className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-[var(--surface-base)] cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <span className="font-mono text-[11px] font-semibold text-[var(--primary)]">{p.id}</span>
                      <span className="truncate max-w-[200px]">{p.title}</span>
                      <span className="badge-semantic badge-neutral uppercase text-[9px]">{p.difficulty}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href={`/attack-families/${fam.id}`}
                  className="block text-center text-xs font-semibold text-[var(--primary)] hover:underline mt-2"
                >
                  View All {fam.probeCount} Probes in {fam.name} →
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      <ProbeDrawer probe={selectedProbe} onClose={() => setSelectedProbe(null)} />
    </div>
  )
}
