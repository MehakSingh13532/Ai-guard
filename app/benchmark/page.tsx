"use client"
import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Play, RefreshCw, FileText, AlertTriangle, CheckCircle2, Server, KeyRound } from 'lucide-react'
import { benchmarkDataService, normalizeFamily } from '@/lib/data-service'

interface FamilyProgress {
  name: string
  total: number
  current: number
  blocked: number
  allowed: number
}

interface AgentItem {
  id: string
  name: string
  description?: string
  category?: 'nvidia' | 'ollama' | string
  badge?: string
  model_name?: string
  configured?: boolean
  is_default?: boolean
}

interface ProbeTraceItem {
  probeId: string
  probeTitle: string
  category: string
  status: 'BLOCKED' | 'ALLOWED' | string
  evaluationReason?: string
  responseExcerpt?: string
}

const FALLBACK_AGENTS: AgentItem[] = [
  { id: 'nemotron_3_ultra', name: 'Nemotron-3 Ultra (550B)', category: 'nvidia', badge: 'NVIDIA NIM', model_name: 'nvidia/nemotron-3-ultra-550b-a55b', configured: false },
  { id: 'nemotron_super_agent', name: 'Nemotron-3 Super (120B)', category: 'nvidia', badge: 'NVIDIA NIM', model_name: 'nvidia/nemotron-3-super-120b-a12b', configured: false },
  { id: 'llama3_3_70b_agent', name: 'Llama 3.3 70B Instruct', category: 'nvidia', badge: 'NVIDIA NIM', model_name: 'meta/llama-3.3-70b-instruct', configured: false },
  { id: 'deepseek_flash_agent', name: 'DeepSeek V4 Flash', category: 'nvidia', badge: 'NVIDIA NIM', model_name: 'deepseek-ai/deepseek-v4-flash', configured: false },
  { id: 'ollama_local_agent', name: 'Ollama Local Agent', category: 'ollama', badge: 'Local Ollama', model_name: 'llama3.2', configured: true },
]

export default function BenchmarkPage() {
  const [running, setRunning] = useState(false)
  const [families, setFamilies] = useState<FamilyProgress[]>([])
  const [progress, setProgress] = useState({ current: 0, total: 0, blocked: 0, allowed: 0 })
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<string>('nemotron_3_ultra')
  const [activeCategory, setActiveCategory] = useState<'nvidia' | 'ollama'>('nvidia')
  const [agents, setAgents] = useState<AgentItem[]>(FALLBACK_AGENTS)
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)
  const [ollamaReachable, setOllamaReachable] = useState<boolean>(false)
  const [nvidiaKeyInput, setNvidiaKeyInput] = useState('')
  const [savingConfig, setSavingConfig] = useState(false)
  const [configFeedback, setConfigFeedback] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [probeTrace, setProbeTrace] = useState<ProbeTraceItem[]>([])

  // Filters
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([
    'direct_injection', 'content_injection', 'exfiltration', 'goal_diversion',
    'memory_poisoning', 'autonomy', 'planning', 'tool_security'
  ])

  const loadBackendState = async () => {
    const [health, agentsData, stats, cfg] = await Promise.all([
      benchmarkDataService.fetchHealth(),
      benchmarkDataService.fetchAgents(),
      benchmarkDataService.fetchStats(),
      benchmarkDataService.fetchConfig(),
    ])

    setBackendOnline(health.status === 'ok')
    setOllamaReachable(cfg.ollamaReachable)
    if (agentsData && agentsData.length > 0) {
      setAgents(agentsData)
    }
    if (stats) {
      setProgress(p => ({ ...p, total: stats.totalProbes || 50 }))
    }
  }

  const handleQuickSaveKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nvidiaKeyInput.trim()) {
      setConfigFeedback('Enter your NVIDIA API key first (starts with nvapi-...).')
      return
    }
    setSavingConfig(true)
    setConfigFeedback(null)
    const res = await benchmarkDataService.saveConfig({ nvidiaApiKey: nvidiaKeyInput.trim() })
    setSavingConfig(false)
    if (!res.ok) {
      setConfigFeedback(res.error || 'Failed to save NVIDIA_API_KEY.')
      return
    }
    setNvidiaKeyInput('')
    setScanError(null)
    setConfigFeedback('NVIDIA API key saved. You can now run the evaluation.')
    if (Array.isArray(res.data?.agents) && res.data.agents.length > 0) {
      setAgents(res.data.agents)
    } else {
      await loadBackendState()
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const agentFromQuery = params.get('agent')
    if (agentFromQuery) {
      setSelectedAgent(agentFromQuery)
      setActiveCategory(agentFromQuery === 'ollama_local_agent' ? 'ollama' : 'nvidia')
    }
    loadBackendState()
  }, [])

  const visibleAgents = useMemo(() => {
    const filtered = agents.filter(a => (a.category || (a.id.includes('ollama') ? 'ollama' : 'nvidia')) === activeCategory)
    return filtered.length > 0 ? filtered : agents
  }, [agents, activeCategory])

  const selectedAgentMeta = useMemo(
    () => agents.find(a => a.id === selectedAgent),
    [agents, selectedAgent]
  )

  const handleCategoryChange = (cat: 'nvidia' | 'ollama') => {
    if (running) return
    setActiveCategory(cat)
    const firstInCategory = agents.find(
      a => (a.category || (a.id.includes('ollama') ? 'ollama' : 'nvidia')) === cat
    )
    if (firstInCategory) {
      setSelectedAgent(firstInCategory.id)
    }
  }

  const startScan = async () => {
    if (selectedFamilies.length === 0) {
      setScanError('Select at least one attack family before starting an evaluation run.')
      return
    }

    setRunning(true)
    setScanError(null)
    setProbeTrace([])
    setFamilies([])
    setProgress(p => ({ ...p, current: 0, blocked: 0, allowed: 0 }))
    setSessionId(null)

    let activeSessionId: string | null = null
    let abortedError: string | null = null

    try {
      // 1. Start scan session
      let res: Response
      try {
        res = await fetch('/api/scan/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: selectedAgent,
            model: selectedAgentMeta?.model_name || undefined,
          }),
        })
      } catch {
        setScanError(
          'Cannot reach FastAPI backend at http://127.0.0.1:8000. Start both servers with "npm run dev:all" and try again.'
        )
        setBackendOnline(false)
        setRunning(false)
        return
      }

      if (!res.ok) {
        let detail = `Backend returned HTTP ${res.status}`
        try {
          const errBody = await res.json()
          if (errBody?.detail) detail = errBody.detail
          else if (errBody?.error) detail = errBody.error
        } catch {
          if (res.status >= 500) {
            detail = 'FastAPI backend is offline or returned a proxy error (HTTP 500). Ensure "npm run dev:all" is running.'
            setBackendOnline(false)
          }
        }
        setScanError(detail)
        setRunning(false)
        return
      }

      const data = await res.json()
      activeSessionId = data.sessionId
      setSessionId(data.sessionId)
      setBackendOnline(true)

      let fams: FamilyProgress[] = []
      if (data.families) {
        fams = Object.entries(data.families)
          .filter(([name]) => selectedFamilies.some(f => normalizeFamily(f) === normalizeFamily(name)))
          .map(([name, total]) => ({
            name,
            total: total as number,
            current: 0,
            blocked: 0,
            allowed: 0,
          }))
        setFamilies(fams)
      }

      const selectedTotal = fams.reduce((sum, f) => sum + f.total, 0)
      setProgress(p => ({ ...p, total: selectedTotal || data.total_probes || 0 }))

      // 2. Stream family scans dynamically
      let overallBlocked = 0
      let overallAllowed = 0
      let overallCurrent = 0

      for (let i = 0; i < fams.length; i++) {
        if (abortedError) break
        const familyName = fams[i].name
        const modelQuery = selectedAgentMeta?.model_name
          ? `&model=${encodeURIComponent(selectedAgentMeta.model_name)}`
          : ''

        await new Promise<void>((resolve) => {
          const evtSource = new EventSource(
            `/api/scan/family?sessionId=${encodeURIComponent(data.sessionId)}&agentId=${encodeURIComponent(selectedAgent)}&category=${encodeURIComponent(familyName)}${modelQuery}`
          )
          let finishedCleanly = false

          evtSource.addEventListener('probe_result', (e) => {
            const payload = JSON.parse(e.data)
            overallCurrent += 1
            const deltaBlocked = payload.status === 'BLOCKED' ? 1 : 0
            const deltaAllowed = payload.status === 'ALLOWED' ? 1 : 0
            setProgress(p => ({
              ...p,
              current: overallCurrent,
              blocked: p.blocked + deltaBlocked,
              allowed: p.allowed + deltaAllowed,
            }))

            setFamilies(prev => {
              const updated = [...prev]
              updated[i] = {
                ...updated[i],
                current: payload.index,
                blocked: payload.blocked,
                allowed: payload.allowed,
              }
              return updated
            })

            if (payload.probeId) {
              setProbeTrace(prev => [
                {
                  probeId: payload.probeId,
                  probeTitle: payload.probeTitle || payload.probeId,
                  category: payload.category || familyName,
                  status: payload.status,
                  evaluationReason: payload.evaluationReason,
                  responseExcerpt: payload.responseExcerpt,
                },
                ...prev.slice(0, 49),
              ])
            }
          })

          evtSource.addEventListener('family_complete', (e) => {
            finishedCleanly = true
            const payload = JSON.parse(e.data)
            overallBlocked += payload.blocked
            overallAllowed += payload.allowed

            setProgress(p => ({
              ...p,
              blocked: overallBlocked,
              allowed: overallAllowed,
            }))

            setFamilies(prev => {
              const updated = [...prev]
              updated[i] = {
                ...updated[i],
                blocked: payload.blocked,
                allowed: payload.allowed,
              }
              return updated
            })

            evtSource.close()
            resolve()
          })

          evtSource.addEventListener('scan_error', (e) => {
            finishedCleanly = true
            try {
              const payload = JSON.parse((e as MessageEvent).data)
              abortedError = payload.error || 'Agent execution error during scan.'
            } catch {
              abortedError = 'Agent execution error during scan.'
            }
            evtSource.close()
            resolve()
          })

          evtSource.onerror = () => {
            if (!finishedCleanly && !abortedError) {
              abortedError = 'SSE stream disconnected from backend during probe evaluation.'
            }
            evtSource.close()
            resolve()
          }
        })
      }

      // 3. Finalize scan
      if (activeSessionId) {
        const finalRes = await fetch('/api/scan/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: activeSessionId,
            status: abortedError ? 'FAILED' : 'COMPLETED',
          }),
        })
        if (!finalRes.ok && !abortedError) {
          abortedError = `Failed to finalize benchmark session (HTTP ${finalRes.status}).`
        }
      }

      if (abortedError) {
        setScanError(abortedError)
      }

      benchmarkDataService.invalidateCache()
      setRunning(false)
    } catch {
      setScanError('Unexpected network error while communicating with the Ai-guard backend.')
      setRunning(false)
    }
  }

  const isComplete = !running && !scanError && sessionId && progress.current > 0

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--primary)] uppercase tracking-wider mb-1">
            <Play className="h-4 w-4 fill-current" /> Live Execution Suite
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Run AI Benchmark Evaluation</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Execute probes dynamically against the selected target agent endpoint via live SSE streaming.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {backendOnline !== null && (
            <span className={`badge-semantic ${backendOnline ? 'badge-success' : 'badge-danger'}`}>
              <Server className="h-3 w-3" />
              {backendOnline ? 'Backend Online' : 'Backend Offline'}
            </span>
          )}

          {isComplete && (
            <Link
              href={`/reports?session=${sessionId}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-emerald-600 text-white text-xs font-semibold shadow-xs hover:bg-emerald-700 transition-colors"
            >
              <FileText className="h-4 w-4" /> View Benchmark Report
            </Link>
          )}

          <button
            onClick={startScan}
            disabled={running}
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-md text-xs font-bold text-white shadow-xs transition-all ${
              running
                ? 'bg-blue-400 cursor-not-allowed opacity-75'
                : 'bg-[var(--primary)] hover:bg-[var(--primary-hover)] cursor-pointer'
            }`}
          >
            {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
            {running ? 'Evaluating Probes...' : '▶ Start Evaluation Run'}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {scanError && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-400 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
              <div>
                <div className="font-bold text-rose-300">Evaluation Run Error</div>
                <div className="mt-0.5">{scanError}</div>
              </div>
            </div>
            <button
              onClick={() => {
                setScanError(null)
                loadBackendState()
              }}
              className="text-[11px] font-semibold underline hover:text-rose-200 shrink-0"
            >
              Recheck Backend
            </button>
          </div>
          {scanError.includes('NVIDIA_API_KEY') && (
            <form onSubmit={handleQuickSaveKey} className="flex flex-wrap items-center gap-2 pt-2 border-t border-rose-500/20">
              <KeyRound className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <input
                type="password"
                value={nvidiaKeyInput}
                onChange={(e) => setNvidiaKeyInput(e.target.value)}
                placeholder="Paste real NVIDIA_API_KEY (nvapi-...)"
                className="flex-1 min-w-[240px] px-2.5 py-1.5 rounded bg-[var(--surface-base)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
              />
              <button
                type="submit"
                disabled={savingConfig}
                className="px-3 py-1.5 rounded bg-[var(--primary)] text-white font-semibold text-xs hover:bg-[var(--primary-hover)] disabled:opacity-60 cursor-pointer"
              >
                {savingConfig ? 'Saving...' : 'Save Key'}
              </button>
            </form>
          )}
        </div>
      )}

      {configFeedback && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-300">
          {configFeedback}
        </div>
      )}

      {/* Target Agent & Configuration Panel */}
      <div className="research-card space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Target Model & Agent Selection</h2>
          <span className="font-mono text-[11px] text-[var(--text-muted)]">Benchmark Version: v2.0.0</span>
        </div>

        {/* Agent Category Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => handleCategoryChange('nvidia')}
            className={`p-3 rounded-lg border text-left text-xs font-semibold transition-all ${
              activeCategory === 'nvidia'
                ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                : 'border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-secondary)] hover:border-[var(--border-default)]'
            }`}
          >
            🛡️ NVIDIA NIM Guards
            <span className="block text-[10px] font-normal text-[var(--text-muted)] mt-1">Nemotron, Llama-3.3, DeepSeek</span>
          </button>

          <button
            onClick={() => handleCategoryChange('ollama')}
            className={`p-3 rounded-lg border text-left text-xs font-semibold transition-all ${
              activeCategory === 'ollama'
                ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                : 'border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-secondary)] hover:border-[var(--border-default)]'
            }`}
          >
            🦙 Local Ollama Runner
            <span className="block text-[10px] font-normal text-[var(--text-muted)] mt-1">Local mistral / llama endpoints</span>
          </button>
        </div>

        {/* Dynamic Agent Sub-option selector */}
        <div className="p-3 bg-[var(--surface-base)] rounded-lg border border-[var(--border-subtle)] space-y-2">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
            Select Evaluation Target Model ({agents.length} Discovered Agents)
          </span>
          <div className="flex flex-wrap gap-2">
            {visibleAgents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => !running && setSelectedAgent(agent.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                  selectedAgent === agent.id
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)] font-semibold shadow-xs'
                    : 'bg-[var(--surface-raised)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{agent.name}</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                  selectedAgent === agent.id ? 'bg-white/20 text-white' : 'bg-[var(--surface-base)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                }`}>
                  {agent.badge || (agent.category === 'ollama' ? 'Local Ollama' : 'NVIDIA NIM')}
                </span>
                {agent.category === 'ollama' ? (
                  !ollamaReachable && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                      Offline
                    </span>
                  )
                ) : (
                  agent.configured === false && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                      Needs Key
                    </span>
                  )
                )}
              </button>
            ))}
          </div>
          {selectedAgentMeta?.description && (
            <p className="text-[11px] text-[var(--text-muted)] pt-1">{selectedAgentMeta.description}</p>
          )}
          {!scanError && activeCategory === 'nvidia' && selectedAgentMeta?.configured === false && (
            <form onSubmit={handleQuickSaveKey} className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <KeyRound className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="text-[11px] text-amber-300 font-medium">NVIDIA API Key required:</span>
              <input
                type="password"
                value={nvidiaKeyInput}
                onChange={(e) => setNvidiaKeyInput(e.target.value)}
                placeholder="Paste NVIDIA_API_KEY (nvapi-...)"
                className="flex-1 min-w-[220px] px-2.5 py-1 rounded bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
              />
              <button
                type="submit"
                disabled={savingConfig}
                className="px-3 py-1 rounded bg-[var(--primary)] text-white font-semibold text-xs hover:bg-[var(--primary-hover)] disabled:opacity-60 cursor-pointer"
              >
                {savingConfig ? 'Saving...' : 'Save Key'}
              </button>
              <Link href="/settings" className="text-[11px] text-[var(--primary)] hover:underline">
                Open Settings
              </Link>
            </form>
          )}
        </div>

        {/* Attack Family Multi-Select Filter Panel */}
        <div className="p-3 bg-[var(--surface-base)] rounded-lg border border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
              Target Attack Families Scope ({selectedFamilies.length} / 8 Selected)
            </span>
            <button
              onClick={() => {
                if (selectedFamilies.length === 8) {
                  setSelectedFamilies([])
                } else {
                  setSelectedFamilies(['direct_injection', 'content_injection', 'exfiltration', 'goal_diversion', 'memory_poisoning', 'autonomy', 'planning', 'tool_security'])
                }
              }}
              className="text-[11px] text-[var(--primary)] font-semibold hover:underline"
            >
              {selectedFamilies.length === 8 ? 'Deselect All' : 'Select All 8 Families'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'direct_injection', label: 'Direct Injection' },
              { id: 'content_injection', label: 'Content Injection' },
              { id: 'exfiltration', label: 'Exfiltration' },
              { id: 'goal_diversion', label: 'Goal Diversion' },
              { id: 'memory_poisoning', label: 'Memory Poisoning' },
              { id: 'autonomy', label: 'Autonomy' },
              { id: 'planning', label: 'Planning' },
              { id: 'tool_security', label: 'Tool Security' },
            ].map((fam) => {
              const isSelected = selectedFamilies.includes(fam.id)
              return (
                <button
                  key={fam.id}
                  onClick={() => {
                    if (running) return
                    if (isSelected) {
                      setSelectedFamilies(selectedFamilies.filter(id => id !== fam.id))
                    } else {
                      setSelectedFamilies([...selectedFamilies, fam.id])
                    }
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                    isSelected
                      ? 'bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--primary)] font-semibold'
                      : 'bg-[var(--surface-raised)] border-[var(--border-subtle)] text-[var(--text-muted)] opacity-60'
                  }`}
                >
                  {isSelected ? '✓ ' : '+ '}{fam.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Live SSE Progress Overview Bar */}
      <div className="research-card space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-primary)]">
          <div className="flex items-center gap-2">
            <span>Evaluation Progress:</span>
            <span className="font-mono text-sm font-bold text-[var(--primary)]">{progress.current} / {progress.total}</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Resisted: {progress.blocked}</span>
            <span className="text-rose-600 dark:text-rose-400 font-bold">Compromised: {progress.allowed}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-3 w-full bg-[var(--surface-base)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
          <div
            className="h-full bg-[var(--primary)] transition-all duration-300 ease-out"
            style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Live Family Execution Grid */}
      {families.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {families.map((f, idx) => {
            const isFinished = f.current === f.total && f.total > 0
            const isActive = running && f.current > 0 && f.current < f.total
            return (
              <div
                key={idx}
                className={`research-card transition-all ${
                  isActive ? 'active-scan-pulse border-[var(--primary)]' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-[var(--text-primary)] capitalize">
                    {f.name.replace(/_/g, ' ')}
                  </h3>
                  <span className="font-mono text-[11px] text-[var(--text-muted)]">
                    {f.current} / {f.total}
                  </span>
                </div>

                <div className="h-2 w-full bg-[var(--surface-base)] rounded-full overflow-hidden mb-3 border border-[var(--border-subtle)]">
                  <div
                    className={`h-full transition-all duration-300 ${isFinished ? 'bg-emerald-500' : 'bg-[var(--primary)]'}`}
                    style={{ width: `${f.total > 0 ? (f.current / f.total) * 100 : 0}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-emerald-600 dark:text-emerald-400">Secure: {f.blocked}</span>
                  <span className="text-rose-600 dark:text-rose-400">Compromised: {f.allowed}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Live Dynamic Agent Execution Trace */}
      {probeTrace.length > 0 && (
        <div className="research-card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-[var(--primary)]" /> Live Agent Probe Trace
            </h2>
            <span className="font-mono text-[11px] text-[var(--text-muted)]">
              Showing latest {probeTrace.length} probe evaluations
            </span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {probeTrace.map((item, idx) => (
              <div
                key={`${item.probeId}-${idx}`}
                className="p-3 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)] text-xs space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-[var(--primary)]">{item.probeId}</span>
                    <span className="font-semibold text-[var(--text-primary)]">{item.probeTitle}</span>
                    <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase">
                      {item.category.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.evaluationReason && (
                      <span className="font-mono text-[10px] text-[var(--text-muted)]">
                        {item.evaluationReason}
                      </span>
                    )}
                    <span className={`badge-semantic ${item.status === 'BLOCKED' ? 'badge-success' : 'badge-danger'}`}>
                      {item.status === 'BLOCKED' ? 'RESISTED' : 'COMPROMISED'}
                    </span>
                  </div>
                </div>
                {item.responseExcerpt && (
                  <p className="text-[11px] text-[var(--text-secondary)] font-mono bg-[var(--surface-raised)] p-2 rounded border border-[var(--border-subtle)] whitespace-pre-wrap break-words">
                    {item.responseExcerpt}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
