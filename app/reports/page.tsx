"use client"
import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { benchmarkDataService, BenchmarkRun } from '@/lib/data-service'
import { FileText, Download, ShieldCheck, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

function ReportsContent() {
  const searchParams = useSearchParams()
  const initialSession = searchParams.get('session')

  const [sessions, setSessions] = useState<BenchmarkRun[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(initialSession)
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    async function loadSessions() {
      try {
        const data = await benchmarkDataService.fetchSessions()
        setSessions(data)
        if (!selectedSession && data.length > 0) {
          setSelectedSession(data[0].sessionId)
        }
      } catch (err) {
        console.error('Failed to load sessions:', err)
      } finally {
        setLoading(false)
      }
    }
    loadSessions()
  }, [])

  useEffect(() => {
    if (!selectedSession) return
    async function loadReport() {
      try {
        const rep = await benchmarkDataService.fetchReport(selectedSession!)
        setReport(rep)
      } catch (err) {
        console.error('Failed to load report:', err)
        setReport(null)
      }
    }
    loadReport()
  }, [selectedSession])

  if (loading) return <div className="p-8 text-center text-xs">Loading benchmark reports...</div>

  const overall = report?.reportJson?.overall
  const categoryBreakdown = report?.reportJson?.category_breakdown || []
  const highRiskAllowed = report?.reportJson?.high_risk_allowed || []
  const currentSessionObj = sessions.find(s => s.sessionId === selectedSession)

  const downloadCSV = () => {
    if (!report) return
    const headers = ['Category', 'Probes', 'Blocked', 'Allowed', 'HighestRiskScore']
    const rows = categoryBreakdown.map((cb: any) => [
      cb.category,
      cb.probes,
      cb.blocked,
      cb.allowed,
      cb.highest_risk_score || 0,
    ])
    const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `ai-guard-report-${selectedSession}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--primary)] uppercase tracking-wider mb-1">
            <FileText className="h-4 w-4" /> Academic Evaluation Report
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Benchmark Security Report</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Empirical evaluation results, category breakdown, & threat analysis per LLM agent configuration.
          </p>
        </div>

        {/* Session selector & Download Export Buttons */}
        <div className="flex items-center gap-2">
          <select
            value={selectedSession || ''}
            onChange={e => setSelectedSession(e.target.value)}
            className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
          >
            {sessions.map(s => (
              <option key={s.id} value={s.sessionId}>
                {s.agentName || s.sessionId} ({new Date(s.startedAt).toLocaleString()})
              </option>
            ))}
          </select>

          {report && (
            <div className="flex items-center gap-1.5">
              <a
                href={`data:text/markdown;charset=utf-8,${encodeURIComponent(report.reportMarkdown || '')}`}
                download={`ai-guard-report-${selectedSession}.md`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Markdown
              </a>
              <button
                onClick={downloadCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--surface-raised)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-base)] transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-emerald-500" /> CSV
              </button>
            </div>
          )}
        </div>
      </div>

      {!report ? (
        <div className="research-card p-10 text-center text-xs text-[var(--text-muted)]">
          No report generated for this session yet. Run a benchmark to view results.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Target Metadata Card */}
          <div className="research-card border-l-4 border-l-[var(--primary)] space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-semibold text-[var(--primary)] uppercase tracking-wider block">
                  Evaluated Target Agent
                </span>
                <h2 className="text-xl font-extrabold text-[var(--text-primary)] mt-0.5">
                  {overall?.agent_name || currentSessionObj?.agentName || 'Default Guard'}
                </h2>
                <div className="text-xs text-[var(--text-secondary)] mt-1 font-mono">
                  Endpoint: {overall?.model_name || 'NVIDIA NIM'} | Agent ID: {overall?.agent_id || 'nemotron_3_ultra'}
                </div>
              </div>

              <div className="text-right text-xs font-mono text-[var(--text-muted)] space-y-0.5">
                <div>Session: <span className="text-[var(--text-primary)]">{overall?.session_id}</span></div>
                <div>Integrity Hash: <span className="text-[var(--primary)]">{report.manifestSha256?.substring(0, 16)}...</span></div>
              </div>
            </div>

            {/* System Prompt Drawer */}
            {overall?.system_prompt && (
              <div className="pt-3 border-t border-[var(--border-subtle)]">
                <button
                  onClick={() => setShowPrompt(!showPrompt)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline"
                >
                  {showPrompt ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {showPrompt ? 'Hide Configured System Prompt' : 'Inspect Configured System Prompt'}
                </button>

                {showPrompt && (
                  <pre className="mt-3 p-4 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)] font-mono text-xs text-[var(--text-secondary)] whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {overall.system_prompt}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* 3 Executive Metric Scorecards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="research-card text-center border-t-2 border-t-emerald-500">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Security Resistance Score</span>
              <div className="text-3xl font-black text-emerald-500 mt-2 font-mono">
                {((overall?.block_rate || 0) * 100).toFixed(1)}%
              </div>
              <span className="text-xs text-[var(--text-secondary)] mt-1 block font-mono">{overall?.blocked} / {overall?.total_probes} Resisted</span>
            </div>

            <div className="research-card text-center border-t-2 border-t-rose-500">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Attack Success Rate (ASR)</span>
              <div className="text-3xl font-black text-rose-500 mt-2 font-mono">
                {(((overall?.allowed || 0) / (overall?.total_probes || 1)) * 100).toFixed(1)}%
              </div>
              <span className="text-xs text-[var(--text-secondary)] mt-1 block font-mono">{overall?.allowed} Compromised</span>
            </div>

            <div className="research-card text-center border-t-2 border-t-blue-500">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Total Probes Fired</span>
              <div className="text-3xl font-black text-[var(--text-primary)] mt-2 font-mono">{overall?.total_probes || 0}</div>
              <span className="text-xs text-[var(--text-secondary)] mt-1 block">Across 8 Attack Families</span>
            </div>
          </div>

          {/* Category Breakdown Table */}
          <div className="research-card space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Attack Family Category Breakdown
            </h3>

            <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
              <table className="research-table">
                <thead>
                  <tr>
                    <th>Attack Family Category</th>
                    <th className="text-center">Probes</th>
                    <th className="text-center">Resisted (Secure)</th>
                    <th className="text-center">Compromised (ASR)</th>
                    <th className="text-center">Max Risk Score</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryBreakdown.map((cb: any, idx: number) => (
                    <tr key={idx}>
                      <td className="font-bold capitalize text-xs text-[var(--text-primary)]">{cb.category.replace(/_/g, ' ')}</td>
                      <td className="font-mono text-xs text-center">{cb.probes}</td>
                      <td className="font-mono text-xs text-center text-emerald-600 dark:text-emerald-400 font-semibold">{cb.blocked}</td>
                      <td className="font-mono text-xs text-center text-rose-600 dark:text-rose-400 font-semibold">{cb.allowed}</td>
                      <td className="font-mono text-xs text-center font-bold">{cb.highest_risk_score ? cb.highest_risk_score.toFixed(2) : '0.00'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs">Loading report interface...</div>}>
      <ReportsContent />
    </Suspense>
  )
}
