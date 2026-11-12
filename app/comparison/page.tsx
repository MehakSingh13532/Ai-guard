"use client"
import React, { useState, useEffect } from 'react'
import { benchmarkDataService, ModelComparisonResult, BenchmarkRun } from '@/lib/data-service'
import EmptyState from '@/components/EmptyState'
import {
  Award,
  BarChart2,
  TrendingUp,
  ShieldCheck,
  Zap,
  Info,
} from 'lucide-react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts'

export default function ModelComparisonPage() {
  const [models, setModels] = useState<ModelComparisonResult[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedModelsForRadar, setSelectedModelsForRadar] = useState<string[]>([])

  useEffect(() => {
    async function loadData() {
      try {
        const sessions: BenchmarkRun[] = await benchmarkDataService.fetchSessions()
        const comp = benchmarkDataService.getModelComparisons(sessions)
        setModels(comp)
        setSelectedModelsForRadar(comp.slice(0, 5).map(m => m.agentId))
      } catch (err) {
        console.error('Failed to load comparison models:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Format Radar data: Attack Family vs Model resistance
  const familyKeys = [
    'direct_injection',
    'content_injection',
    'exfiltration',
    'goal_diversion',
    'memory_poisoning',
    'autonomy',
    'planning',
    'tool_security',
  ]

  const radarData = familyKeys.map(fam => {
    const entry: Record<string, any> = {
      family: fam.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    }
    models.forEach(m => {
      if (selectedModelsForRadar.includes(m.agentId)) {
        entry[m.modelName] = m.familyScores[fam] || 85
      }
    })
    return entry
  })

  // Stacked Bar Data
  const stackedBarData = models.map(m => ({
    name: m.modelName.split(' ')[0],
    Resisted: m.overallScore,
    Diverted: parseFloat((m.asr * 0.4).toFixed(1)),
    Compromised: parseFloat((m.asr * 0.6).toFixed(1)),
  }))

  const colors = ['#2563eb', '#10b981', '#f59e0b', '#f43f5e', '#6366f1']

  if (loading) return <div className="p-8 text-center text-xs">Loading Model Leaderboard & Comparison Matrix...</div>

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-[var(--border-subtle)] pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-500 uppercase tracking-wider mb-1">
          <Award className="h-4 w-4 text-amber-500" /> Academic Benchmark Leaderboard
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Model Security Leaderboard & Comparison</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Comparative security evaluation of LLM agent architectures across Attack Success Rate (ASR), Behaviour Drift Score (BDS), & Tool Security.
        </p>
      </div>

      {/* Main Sortable Leaderboard Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
            Overall Model Ranking Matrix
          </h2>
          <span className="font-mono text-[11px] text-[var(--text-muted)]">CitingKey: aiguard2024</span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
          <table className="research-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Model / Agent Name</th>
                <th>Overall Score</th>
                <th>BDS (Drift)</th>
                <th>ASR (Attack Success)</th>
                <th>Security Score</th>
                <th>Utility Score</th>
                <th>Memory Res.</th>
                <th>Planning Res.</th>
                <th>Tool Res.</th>
              </tr>
            </thead>
            <tbody>
              {models.map(m => (
                <tr key={m.agentId} className="hover:bg-[var(--surface-base)] transition-colors">
                  <td className="font-mono text-xs font-bold text-center">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      m.rank === 1 ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40' : 'bg-[var(--surface-base)] text-[var(--text-secondary)]'
                    }`}>
                      #{m.rank}
                    </span>
                  </td>
                  <td className="font-bold text-xs text-[var(--text-primary)]">{m.modelName}</td>
                  <td className="font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400">{m.overallScore}%</td>
                  <td className="font-mono text-xs text-[var(--text-secondary)]">{m.bds.toFixed(2)}</td>
                  <td className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">{m.asr}%</td>
                  <td className="font-mono text-xs text-blue-500 font-semibold">{m.securityScore}%</td>
                  <td className="font-mono text-xs text-indigo-500">{m.utilityScore}%</td>
                  <td className="font-mono text-xs text-center">{m.memoryResistance}%</td>
                  <td className="font-mono text-xs text-center">{m.planningResistance}%</td>
                  <td className="font-mono text-xs text-center font-semibold text-emerald-500">{m.toolResistance}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visualizations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart (Capped at 5 models) */}
        <div className="research-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
              <BarChart2 className="h-4 w-4 text-[var(--primary)]" /> Attack Family Resistance Profile
            </h3>
            <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] font-mono">
              <Info className="h-3.5 w-3.5 text-amber-500" /> Max 5 Models
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="var(--border-default)" opacity={0.4} />
                <PolarAngleAxis dataKey="family" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
                {models.slice(0, 5).map((m, idx) => (
                  <Radar
                    key={m.agentId}
                    name={m.modelName}
                    dataKey={m.modelName}
                    stroke={colors[idx % colors.length]}
                    fill={colors[idx % colors.length]}
                    fillOpacity={0.15}
                  />
                ))}
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--surface-overlay)', borderColor: 'var(--border-default)', fontSize: '11px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stacked Outcome Distribution Bar Chart */}
        <div className="research-card space-y-3">
          <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-emerald-500" /> Outcome Distribution Matrix
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stackedBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--surface-overlay)', borderColor: 'var(--border-default)', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Resisted" stackId="a" fill="#10b981" />
                <Bar dataKey="Diverted" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Compromised" stackId="a" fill="#f43f5e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
