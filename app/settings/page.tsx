"use client"
import React, { useState, useEffect } from 'react'
import { Settings, Database, Server, RefreshCw, KeyRound, CheckCircle2, AlertTriangle } from 'lucide-react'
import { benchmarkDataService } from '@/lib/data-service'

interface AgentRow {
  id: string
  name: string
  category?: string
  badge?: string
  model_name?: string
  configured?: boolean
}

export default function SettingsPage() {
  const [health, setHealth] = useState<any>(null)
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [nvidiaConfigured, setNvidiaConfigured] = useState(false)
  const [nvidiaKeyMasked, setNvidiaKeyMasked] = useState('')
  const [ollamaReachable, setOllamaReachable] = useState(false)
  const [nvidiaApiKeyInput, setNvidiaApiKeyInput] = useState('')
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://localhost:11434')
  const [ollamaModel, setOllamaModel] = useState('llama3.2')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const checkAll = async () => {
    setLoading(true)
    const [h, cfg, agentList] = await Promise.all([
      benchmarkDataService.fetchHealth(),
      benchmarkDataService.fetchConfig(),
      benchmarkDataService.fetchAgents(),
    ])
    setHealth(h)
    setNvidiaConfigured(cfg.nvidiaConfigured)
    setNvidiaKeyMasked(cfg.nvidiaKeyMasked)
    setOllamaReachable(cfg.ollamaReachable)
    setOllamaBaseUrl(cfg.ollamaBaseUrl || 'http://localhost:11434')
    setOllamaModel(cfg.ollamaModel || 'llama3.2')
    setAgents(agentList || [])
    setLoading(false)
  }

  useEffect(() => {
    checkAll()
  }, [])

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveMessage(null)

    const payload: { nvidiaApiKey?: string; ollamaBaseUrl?: string; ollamaModel?: string } = {
      ollamaBaseUrl,
      ollamaModel,
    }
    if (nvidiaApiKeyInput.trim()) {
      payload.nvidiaApiKey = nvidiaApiKeyInput.trim()
    }

    const res = await benchmarkDataService.saveConfig(payload)
    setSaving(false)

    if (!res.ok) {
      setSaveMessage({ type: 'err', text: res.error || 'Failed to save runtime configuration.' })
      return
    }

    setNvidiaApiKeyInput('')
    setNvidiaConfigured(Boolean(res.data?.nvidiaConfigured))
    setNvidiaKeyMasked(res.data?.nvidiaKeyMasked || '')
    setOllamaReachable(Boolean(res.data?.ollamaReachable))
    if (Array.isArray(res.data?.agents)) {
      setAgents(res.data.agents)
    }
    setSaveMessage({ type: 'ok', text: 'Configuration saved to .env and applied to live backend.' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--primary)] uppercase tracking-wider mb-1">
            <Settings className="h-4 w-4" /> System Configuration
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Settings & Infrastructure Health</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Monitor FastAPI proxy connections, database status, & configure live LLM agent credentials.
          </p>
        </div>

        <button
          onClick={checkAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border-default)] bg-[var(--surface-raised)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-base)] transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Health
        </button>
      </div>

      {/* Backend Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="research-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Server className="h-4 w-4 text-[var(--primary)]" /> FastAPI Backend Service
            </span>
            <span className={`badge-semantic ${health?.status === 'ok' ? 'badge-success' : 'badge-danger'}`}>
              {health?.status === 'ok' ? 'ONLINE (Port 8000)' : 'OFFLINE'}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Proxies SSE evaluation streams & inspect endpoints via <code className="font-mono text-[11px]">http://127.0.0.1:8000</code>.
          </p>
        </div>

        <div className="research-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Database className="h-4 w-4 text-emerald-500" /> Database Connection Status
            </span>
            <span className={`badge-semantic ${health?.db_connected ? 'badge-success' : 'badge-danger'}`}>
              {health?.db_connected ? 'CONNECTED (Prisma SQLite)' : 'DISCONNECTED'}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Stores session run histories, probe audit events, and generated benchmark security reports.
          </p>
        </div>
      </div>

      {/* Runtime Credentials & Local Ollama Config */}
      <form onSubmit={handleSaveConfig} className="research-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[var(--primary)]" /> LLM Provider Credentials (.env)
          </h2>
          <span className={`badge-semantic ${nvidiaConfigured ? 'badge-success' : 'badge-warning'}`}>
            {nvidiaConfigured ? `NVIDIA Key Active (${nvidiaKeyMasked})` : 'NVIDIA Key Not Set'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
              NVIDIA_API_KEY
            </label>
            <input
              type="password"
              value={nvidiaApiKeyInput}
              onChange={(e) => setNvidiaApiKeyInput(e.target.value)}
              placeholder={nvidiaConfigured ? `Saved (${nvidiaKeyMasked}) — enter new key to replace` : 'nvapi-... (paste real key)'}
              className="w-full px-3 py-2 rounded-md bg-[var(--surface-base)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
              OLLAMA_BASE_URL
            </label>
            <input
              type="text"
              value={ollamaBaseUrl}
              onChange={(e) => setOllamaBaseUrl(e.target.value)}
              placeholder="http://localhost:11434"
              className="w-full px-3 py-2 rounded-md bg-[var(--surface-base)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
              OLLAMA_MODEL
            </label>
            <input
              type="text"
              value={ollamaModel}
              onChange={(e) => setOllamaModel(e.target.value)}
              placeholder="llama3.2"
              className="w-full px-3 py-2 rounded-md bg-[var(--surface-base)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs">
            {saveMessage && (
              <span className={`inline-flex items-center gap-1.5 font-medium ${saveMessage.type === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {saveMessage.type === 'ok' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                {saveMessage.text}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-md bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] disabled:opacity-60 transition-colors cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>

      {/* Discovered Agent Endpoints */}
      <div className="research-card space-y-4">
        <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
          Discovered Target Agent Endpoints
        </h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
          <table className="research-table">
            <thead>
              <tr>
                <th>Agent Identifier</th>
                <th>Target Agent Name</th>
                <th>Provider / Model</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => {
                const isOllama = agent.category === 'ollama' || agent.id === 'ollama_local_agent'
                const ready = isOllama ? ollamaReachable : Boolean(agent.configured)
                return (
                  <tr key={agent.id}>
                    <td className="font-mono text-xs text-[var(--primary)] font-semibold">{agent.id}</td>
                    <td className="font-bold text-xs">{agent.name}</td>
                    <td className="font-mono text-xs text-[var(--text-secondary)]">
                      {isOllama ? `${ollamaBaseUrl} (${ollamaModel})` : agent.model_name || 'NVIDIA NIM Cloud API'}
                    </td>
                    <td>
                      <span className={`badge-semantic ${ready ? 'badge-success' : 'badge-warning'}`}>
                        {ready ? 'READY' : isOllama ? 'OLLAMA OFFLINE' : 'NEEDS API KEY'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
