"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { benchmarkDataService, BenchmarkRun } from '@/lib/data-service'
import EmptyState from '@/components/EmptyState'
import { TableSkeleton } from '@/components/Skeletons'
import { History, FileText, ArrowRight, PlayCircle } from 'lucide-react'

export default function HistoryPage() {
  const [sessions, setSessions] = useState<BenchmarkRun[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await benchmarkDataService.fetchSessions()
        setSessions(data)
      } catch (err) {
        console.error('Failed to load sessions history:', err)
      } finally {
        setLoading(false)
      }
    }
    loadHistory()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Benchmark Evaluation History</h1>
        <TableSkeleton rows={6} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--primary)] uppercase tracking-wider mb-1">
            <History className="h-4 w-4" /> Timeline Audit
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Benchmark Execution History</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Complete historical log of all benchmark runs, dataset versions, and security scores.
          </p>
        </div>

        <Link
          href="/benchmark"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[var(--primary)] text-white text-xs font-semibold shadow-xs hover:bg-[var(--primary-hover)] transition-colors"
        >
          <PlayCircle className="h-4 w-4" /> Run New Evaluation
        </Link>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          title="No evaluation history found"
          description="Execute your first benchmark run to record evaluation sessions."
          actionLabel="Run Benchmark"
          actionHref="/benchmark"
          icon="play"
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
          <table className="research-table">
            <thead>
              <tr>
                <th>Run / Session ID</th>
                <th>Execution Date & Time</th>
                <th>Target Agent / Endpoint</th>
                <th>Benchmark Ver.</th>
                <th>Dataset Ver.</th>
                <th>Probes Fired</th>
                <th>Resisted (Secure)</th>
                <th>Overall Score</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const score = s.totalProbes > 0 ? ((s.blocked / s.totalProbes) * 100).toFixed(1) : '0.0'
                return (
                  <tr key={s.id} className="hover:bg-[var(--surface-base)] transition-colors">
                    <td className="font-mono text-xs font-bold text-[var(--text-primary)]">{s.sessionId}</td>
                    <td className="text-xs text-[var(--text-secondary)]">{new Date(s.startedAt).toLocaleString()}</td>
                    <td className="font-semibold text-xs text-[var(--text-primary)]">{s.agentName}</td>
                    <td className="font-mono text-xs text-[var(--text-muted)]">v2.0.0</td>
                    <td className="font-mono text-xs text-[var(--text-muted)]">v2.0.0</td>
                    <td className="font-mono text-xs text-center">{s.totalProbes}</td>
                    <td className="font-mono text-xs text-center text-emerald-600 dark:text-emerald-400 font-bold">{s.blocked}</td>
                    <td className="font-mono text-xs text-center font-extrabold text-[var(--primary)]">{score}%</td>
                    <td>
                      <span className="badge-semantic badge-success">
                        {s.status}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/reports?session=${s.sessionId}`}
                        className="inline-flex items-center gap-1 text-xs text-[var(--primary)] font-semibold hover:underline"
                      >
                        Open Report <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
