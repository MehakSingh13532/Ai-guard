"use client"
import React, { useState } from 'react'
import Link from 'next/link'
import { Probe } from '@/lib/data-service'
import { X, ExternalLink, ShieldAlert, CheckCircle2, Copy, Check } from 'lucide-react'

interface ProbeDrawerProps {
  probe: Probe | null
  onClose: () => void
}

export default function ProbeDrawer({ probe, onClose }: ProbeDrawerProps) {
  const [copied, setCopied] = useState(false)

  if (!probe) return null

  const copyPrompt = () => {
    navigator.clipboard.writeText(probe.prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer content */}
      <div className="relative w-full max-w-2xl bg-[var(--surface-overlay)] border-l border-[var(--border-default)] p-6 shadow-2xl overflow-y-auto flex flex-col h-full text-[var(--text-primary)]">
        {/* Top bar */}
        <div className="flex items-start justify-between pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                {probe.id}
              </span>
              <span className="badge-semantic badge-neutral capitalize">
                {probe.attack_family.replace(/_/g, ' ')}
              </span>
              <span className="badge-semantic badge-neutral capitalize">
                {probe.difficulty}
              </span>
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">{probe.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="py-5 space-y-6 flex-1">
          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-4 bg-[var(--surface-base)] p-4 rounded-lg border border-[var(--border-subtle)] text-xs">
            <div>
              <span className="text-[var(--text-muted)] block uppercase font-medium">Scenario Context</span>
              <span className="font-semibold capitalize text-[var(--text-primary)]">{probe.scenario}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block uppercase font-medium">Threat Model</span>
              <span className="font-semibold capitalize text-[var(--text-primary)]">{probe.threat_model.replace(/_/g, ' ')}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block uppercase font-medium">Affected Layers</span>
              <span className="font-mono text-[var(--text-primary)]">{(probe.affected_layers || []).join(', ')}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block uppercase font-medium">Attacker Capability</span>
              <span className="font-semibold capitalize text-[var(--text-primary)]">{probe.attacker_capability || 'Prompt Level'}</span>
            </div>
          </div>

          {/* Prompt Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Adversarial Prompt Payload
              </h3>
              <button
                onClick={copyPrompt}
                className="flex items-center gap-1 text-xs text-[var(--primary)] hover:underline font-medium"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy Payload'}
              </button>
            </div>
            <div className="relative font-mono text-xs bg-[var(--surface-base)] border border-[var(--border-subtle)] p-4 rounded-lg text-[var(--text-primary)] whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
              {probe.prompt}
            </div>
          </div>

          {/* Expected vs Failure Behavior */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Expected Secure Behavior
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{probe.expected_behavior}</p>
            </div>

            <div className="p-4 rounded-lg bg-rose-500/5 border border-rose-500/20">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 mb-1.5">
                <ShieldAlert className="h-4 w-4" />
                Failure / Compromise Behavior
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{probe.failure_behavior}</p>
            </div>
          </div>

          {/* Research References */}
          {probe.references && probe.references.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                Research Citations & Publications
              </h3>
              <div className="space-y-2">
                {probe.references.map((ref, idx) => (
                  <div key={idx} className="p-3 rounded-md bg-[var(--surface-base)] border border-[var(--border-subtle)] text-xs">
                    <div className="font-semibold text-[var(--text-primary)]">{ref.title}</div>
                    <div className="text-[var(--text-secondary)] mt-0.5">
                      {ref.authors ? ref.authors.join(', ') : 'Research Team'} ({ref.year}) — <span className="italic">{ref.venue}</span>
                    </div>
                    {ref.url && (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[var(--primary)] mt-1 hover:underline font-medium"
                      >
                        Read Paper <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Link */}
        <div className="pt-4 border-t border-[var(--border-subtle)] flex justify-between items-center text-xs">
          <span className="text-[var(--text-muted)]">Canonical Deep Link available</span>
          <Link
            href={`/probes/${probe.id}`}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 font-semibold text-[var(--primary)] hover:underline"
          >
            Open Full Probe Page <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
