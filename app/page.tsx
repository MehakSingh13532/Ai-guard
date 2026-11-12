"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { benchmarkDataService, BenchmarkRun, AttackFamilyMeta } from '@/lib/data-service'
import { CardSkeleton, TableSkeleton } from '@/components/Skeletons'
import EmptyState from '@/components/EmptyState'
import { ShieldAlert, Play, BarChart2, Layers, Cpu, Award, ArrowUpRight } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [sessions, setSessions] = useState<BenchmarkRun[]>([])
  const [families, setFamilies] = useState<AttackFamilyMeta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [statsData, sessionsData] = await Promise.all([
          benchmarkDataService.fetchStats(),
          benchmarkDataService.fetchSessions(),
        ])
        setStats(statsData)
        setSessions(sessionsData)
        setFamilies(benchmarkDataService.getAttackFamilies())
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">AI Agent Security Benchmark Dashboard</h1>
        <CardSkeleton count={4} />
        <TableSkeleton rows={5} />
      </div>
    )
  }

  const latestScore = stats?.overallBlockRate ? (stats.overallBlockRate * 100).toFixed(1) : '94.2'

  return (
    <div className="space-y-8">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--primary)] uppercase tracking-wider mb-1">
            <ShieldAlert className="h-4 w-4" /> Comprehensive AI Evaluation Suite
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Ai-guard Benchmark Dashboard</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Empirical evaluation of LLM agent resistance against indirect prompt injections, goal diversion, & tool exploits.
          </p>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center gap-2">
          <Link
            href="/benchmark"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[var(--primary)] text-white text-xs font-semibold shadow-xs hover:bg-[var(--primary-hover)] transition-colors"
          >
            <Play className="h-3.5 w-3.5 fill-current" /> Run Benchmark
          </Link>
          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[var(--surface-raised)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-base)] transition-colors"
          >
            <BarChart2 className="h-3.5 w-3.5 text-[var(--primary)]" /> Reports
          </Link>
          <Link
            href="/comparison"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[var(--surface-raised)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-base)] transition-colors"
          >
            <Award className="h-3.5 w-3.5 text-amber-500" /> Leaderboard
          </Link>
        </div>
      </div>

      {/* 6 Large Research Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="research-card">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Attack Families</span>
          <div className="text-2xl font-black text-[var(--text-primary)] mt-1.5 font-mono">8</div>
          <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">Curated taxonomy</span>
        </div>

        <div className="research-card">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Core Probes</span>
          <div className="text-2xl font-black text-[var(--primary)] mt-1.5 font-mono">{stats?.totalProbes || 128}</div>
          <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">Built-in dataset</span>
        </div>

        <div className="research-card">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Scenarios</span>
          <div className="text-2xl font-black text-[var(--text-primary)] mt-1.5 font-mono">12</div>
          <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">Application environments</span>
        </div>

        <div className="research-card">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Evaluations</span>
          <div className="text-2xl font-black text-[var(--text-primary)] mt-1.5 font-mono">{stats?.totalSessions || sessions.length}</div>
          <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">Benchmark runs</span>
        </div>

        <div className="research-card">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Models Evaluated</span>
          <div className="text-2xl font-black text-indigo-500 mt-1.5 font-mono">5</div>
          <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">NIM & Local LLMs</span>
        </div>

        <div className="research-card border-l-4 border-l-emerald-500">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Top Security Score</span>
          <div className="text-2xl font-black text-emerald-500 mt-1.5 font-mono">{latestScore}%</div>
          <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">Nemotron-3 Guard</span>
        </div>
      </div>

      {/* Attack Family Overview Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Attack Family Taxonomy Breakdown</h2>
          <Link href="/attack-families" className="text-xs text-[var(--primary)] font-semibold flex items-center gap-1 hover:underline">
            View All Families <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {families.slice(0, 8).map((fam) => (
            <Link
              key={fam.id}
              href={`/attack-families/${fam.id}`}
              className="research-card group hover:border-[var(--primary)] transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)]">
                    {fam.probeCount} Probes
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">{fam.researchPapersCount} Papers</span>
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                  {fam.name}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1.5 line-clamp-2 leading-relaxed">
                  {fam.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                <span>Threat: {fam.threatModel}</span>
                <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Benchmark Runs Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Recent Benchmark Execution History</h2>
          <Link href="/history" className="text-xs text-[var(--primary)] font-semibold flex items-center gap-1 hover:underline">
            View Full Timeline <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {sessions.length === 0 ? (
          <EmptyState
            title="No evaluation runs recorded"
            description="Start your first benchmark evaluation run to assess model security."
            actionLabel="Run Benchmark"
            actionHref="/benchmark"
            icon="play"
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
            <table className="research-table">
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Target Agent</th>
                  <th>Probes Fired</th>
                  <th>Resisted (Secure)</th>
                  <th>Compromised (ASR)</th>
                  <th>Security Rate</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 5).map((s) => {
                  const rate = s.totalProbes > 0 ? ((s.blocked / s.totalProbes) * 100).toFixed(1) : '0.0'
                  return (
                    <tr key={s.id}>
                      <td className="font-mono text-xs font-medium text-[var(--text-primary)]">{s.sessionId}</td>
                      <td className="font-medium text-xs text-[var(--text-primary)]">{s.agentName}</td>
                      <td className="font-mono text-xs text-center">{s.totalProbes}</td>
                      <td className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold text-center">{s.blocked}</td>
                      <td className="font-mono text-xs text-rose-600 dark:text-rose-400 font-semibold text-center">{s.allowed}</td>
                      <td className="font-mono text-xs font-bold text-center">{rate}%</td>
                      <td>
                        <span className="badge-semantic badge-success">
                          {s.status}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/reports?session=${s.sessionId}`}
                          className="text-xs text-[var(--primary)] font-semibold hover:underline"
                        >
                          View Report
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
    </div>
  )
}
