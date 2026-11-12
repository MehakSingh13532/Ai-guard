"use client"
import React, { useState } from 'react'
import Link from 'next/link'
import { benchmarkDataService, ScenarioMeta } from '@/lib/data-service'
import { Globe, ArrowRight, ShieldAlert, Cpu } from 'lucide-react'

export default function ScenariosPage() {
  const scenarios: ScenarioMeta[] = benchmarkDataService.getScenarios()
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[var(--border-subtle)] pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--primary)] uppercase tracking-wider mb-1">
          <Globe className="h-4 w-4" /> Application Context Environments
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Benchmark Scenarios</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          12 realistic application scenarios simulating LLM agent integrations across enterprise workflows.
        </p>
      </div>

      {/* Scenarios 12 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scenarios.map((scen) => (
          <div key={scen.id} className="research-card flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                  {scen.probeCount} Probes
                </span>
                <span
                  className={`badge-semantic ${
                    scen.riskLevel === 'Critical'
                      ? 'badge-danger'
                      : scen.riskLevel === 'High'
                      ? 'badge-warning'
                      : 'badge-neutral'
                  }`}
                >
                  {scen.riskLevel} Risk
                </span>
              </div>

              <h2 className="text-base font-bold text-[var(--text-primary)]">{scen.name}</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">{scen.description}</p>

              <div className="mt-3 space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
                  Primary Threat Vectors
                </span>
                <div className="flex flex-wrap gap-1">
                  {scen.primaryVectors.map((v, idx) => (
                    <span key={idx} className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)]">
              <Link
                href={`/probes?scenario=${scen.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] hover:underline"
              >
                Filter Probes for {scen.name} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
