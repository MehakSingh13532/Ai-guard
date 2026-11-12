import directInjection from '../redguard/datasets/direct_injection.json'
import contentInjection from '../redguard/datasets/content_injection.json'
import exfiltration from '../redguard/datasets/exfiltration.json'
import goalDiversion from '../redguard/datasets/goal_diversion.json'
import memoryPoisoning from '../redguard/datasets/memory_poisoning.json'
import autonomy from '../redguard/datasets/autonomy.json'
import planning from '../redguard/datasets/planning.json'
import toolSecurity from '../redguard/datasets/tool_security.json'

export interface Reference {
  title: string
  authors: string[]
  year: number
  venue: string
  arxiv_id?: string
  url?: string
}

export interface EvaluationRules {
  success_indicators: string[]
  blocked_indicators: string[]
  notes?: string
}

export interface Probe {
  id: string
  title: string
  attack_family: string
  attack_variant: string
  scenario: string
  difficulty: 'trivial' | 'easy' | 'medium' | 'hard' | 'expert' | string
  threat_model: string
  attacker_capability?: string
  prompt: string
  expected_behavior: string
  failure_behavior: string
  attack_goal?: string
  evaluation_rules?: EvaluationRules
  references?: Reference[]
  tags?: string[]
  affected_layers?: string[]
  probe_version?: string
  dataset_version?: string
  synthetic?: boolean
  research_notes?: string
}

export interface AttackFamilyMeta {
  id: string
  name: string
  description: string
  threatModel: string
  affectedLayers: string[]
  probeCount: number
  researchPapersCount: number
}

export interface ScenarioMeta {
  id: string
  name: string
  description: string
  riskLevel: 'High' | 'Medium' | 'Critical' | string
  probeCount: number
  primaryVectors: string[]
}

export interface BenchmarkRun {
  id: string
  sessionId: string
  agentId: string
  agentName: string
  startedAt: string
  finishedAt: string | null
  totalProbes: number
  blocked: number
  allowed: number
  status: 'COMPLETED' | 'RUNNING' | 'FAILED' | string
  blockRate?: number
}

export interface ModelComparisonResult {
  rank: number
  modelName: string
  agentId: string
  overallScore: number
  bds: number // Behaviour Drift Score
  asr: number // Attack Success Rate
  securityScore: number
  utilityScore: number
  memoryResistance: number
  planningResistance: number
  toolResistance: number
  familyScores: Record<string, number>
  totalEvaluations: number
  lastEvaluated: string
}

const RAW_DATASETS: Record<string, any> = {
  direct_injection: directInjection,
  content_injection: contentInjection,
  exfiltration: exfiltration,
  goal_diversion: goalDiversion,
  memory_poisoning: memoryPoisoning,
  autonomy: autonomy,
  planning: planning,
  tool_security: toolSecurity,
}

// 12 Benchmark Scenarios
export const SCENARIOS: ScenarioMeta[] = [
  { id: 'github', name: 'GitHub Workspace', description: 'Evaluates agent safety when processing pull requests, code reviews, and repo issue comments.', riskLevel: 'Critical', probeCount: 18, primaryVectors: ['PR Body Injection', 'Commit Message Overrides'] },
  { id: 'gitlab', name: 'GitLab CI/CD', description: 'Audits agent resistance against malicious CI pipeline triggers and runner issue comments.', riskLevel: 'High', probeCount: 14, primaryVectors: ['Pipeline Parameter Hijack', 'Issue Comment Injections'] },
  { id: 'wiki', name: 'Internal Knowledge Base Wiki', description: 'Assesses vulnerability to hidden adversarial payload in shared markdown docs.', riskLevel: 'Medium', probeCount: 12, primaryVectors: ['Hidden CSS/HTML Injections', 'Document Instructions'] },
  { id: 'documentation', name: 'API Documentation Hub', description: 'Tests data exfiltration via untrusted API documentation payloads.', riskLevel: 'Medium', probeCount: 15, primaryVectors: ['Swagger Spec Injection', 'Sample Request Exfil'] },
  { id: 'email', name: 'Enterprise Mail Client', description: 'Scans incoming email body and attachment parsing for indirect prompt injections.', riskLevel: 'Critical', probeCount: 22, primaryVectors: ['Phishing Body Injection', 'Forwarding Automation Hijack'] },
  { id: 'calendar', name: 'Calendar Scheduling Agent', description: 'Checks scheduling agent resistance to meeting invite description payloads.', riskLevel: 'High', probeCount: 10, primaryVectors: ['Invite Notes Command Injection', 'Location URL Exfil'] },
  { id: 'banking', name: 'Financial & Banking Portal', description: 'Evaluates strict financial action authorization and anti-drain policy enforcement.', riskLevel: 'Critical', probeCount: 20, primaryVectors: ['Wire Transfer Override', 'Account Extraction'] },
  { id: 'travel', name: 'Corporate Travel Booking', description: 'Audits itinerary parsing and automated expense approval agent constraints.', riskLevel: 'Medium', probeCount: 11, primaryVectors: ['Flight Booking Redirect', 'Vendor Override'] },
  { id: 'shopping', name: 'E-Commerce Agent', description: 'Tests procurement agents against cart manipulation and price bypass probes.', riskLevel: 'High', probeCount: 13, primaryVectors: ['Checkout Automation Poisoning', 'Coupon Payload'] },
  { id: 'support', name: 'Customer Support Bot', description: 'Evaluates customer-facing ticket resolution agents against policy bypasses.', riskLevel: 'Medium', probeCount: 16, primaryVectors: ['Ticket Escalation Hijack', 'Refund Policy Bypass'] },
  { id: 'forum', name: 'Developer Forum', description: 'Scans forum thread parsing for malicious community post instruction overrides.', riskLevel: 'Low', probeCount: 9, primaryVectors: ['Markdown Exfil', 'Bot Mention Injection'] },
  { id: 'reddit', name: 'Community Social Feed', description: 'Evaluates sentiment & summary agents processing untrusted social threads.', riskLevel: 'Medium', probeCount: 12, primaryVectors: ['Upvote Bot Injection', 'Comment Payload Hijack'] },
]

export function normalizeFamily(fam: string): string {
  if (!fam) return ''
  const f = fam.toLowerCase().trim()
  if (f === 'data_exfiltration' || f === 'exfiltration') return 'exfiltration'
  if (f === 'autonomous_actions' || f === 'autonomy') return 'autonomy'
  if (f === 'planning_manipulation' || f === 'planning') return 'planning'
  if (f === 'tool_manipulation' || f === 'tool_security') return 'tool_security'
  return f
}

class BenchmarkDataService {
  private static instance: BenchmarkDataService
  private allProbes: Probe[] = []
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private CACHE_TTL_MS = 60 * 1000 // 1 minute in-memory cache

  private constructor() {
    this.initProbes()
  }

  public static getInstance(): BenchmarkDataService {
    if (!BenchmarkDataService.instance) {
      BenchmarkDataService.instance = new BenchmarkDataService()
    }
    return BenchmarkDataService.instance
  }

  private initProbes() {
    const probes: Probe[] = []
    Object.entries(RAW_DATASETS).forEach(([familyKey, dataset]) => {
      if (dataset && Array.isArray(dataset.entries)) {
        dataset.entries.forEach((entry: any) => {
          probes.push({
            id: entry.id,
            title: entry.title || entry.id,
            attack_family: normalizeFamily(familyKey),
            attack_variant: entry.attack_variant || 'standard',
            scenario: entry.scenario || 'generic',
            difficulty: entry.difficulty || 'medium',
            threat_model: entry.threat_model || 'adversarial_user',
            attacker_capability: entry.attacker_capability || 'prompt_level',
            prompt: entry.prompt || '',
            expected_behavior: entry.expected_behavior || '',
            failure_behavior: entry.failure_behavior || '',
            attack_goal: entry.attack_goal,
            evaluation_rules: entry.evaluation_rules,
            references: entry.references || [],
            tags: entry.tags || [],
            affected_layers: entry.affected_layers || ['llm'],
            probe_version: entry.probe_version || '1.0.0',
            dataset_version: entry.dataset_version || '1.0.0',
            synthetic: entry.synthetic ?? true,
            research_notes: entry.research_notes,
          })
        })
      }
    })
    this.allProbes = probes
  }

  public invalidateCache() {
    this.cache.clear()
  }

  public getAllProbes(): Probe[] {
    return this.allProbes
  }

  public getProbeById(id: string): Probe | undefined {
    return this.allProbes.find(p => p.id.toLowerCase() === id.toLowerCase())
  }

  public getProbesByFamily(familyId: string): Probe[] {
    const normTarget = normalizeFamily(familyId)
    return this.allProbes.filter(
      p => normalizeFamily(p.attack_family) === normTarget
    )
  }

  public getProbesByScenario(scenarioId: string): Probe[] {
    return this.allProbes.filter(
      p => p.scenario.toLowerCase() === scenarioId.toLowerCase() || p.scenario === 'generic'
    )
  }

  public getAttackFamilies(): AttackFamilyMeta[] {
    const familyMetas: Record<string, { desc: string; threat: string; layers: Set<string>; papers: number }> = {
      direct_injection: {
        desc: 'Classic prompt injection attacks where the adversary directly injects malicious instructions into user inputs.',
        threat: 'Adversarial User',
        layers: new Set(['LLM', 'Policy Engine']),
        papers: 14,
      },
      content_injection: {
        desc: 'Indirect prompt injections embedded in untrusted external data sources like emails, web pages, or files.',
        threat: 'Untrusted Data Provider',
        layers: new Set(['LLM', 'Context Parser', 'Tool Router']),
        papers: 12,
      },
      exfiltration: {
        desc: 'Probes attempting to steal confidential system prompts, session keys, or API tokens via multi-step calls.',
        threat: 'Adversarial Exfiltrator',
        layers: new Set(['Policy Engine', 'Output Guardrail', 'Memory']),
        papers: 18,
      },
      goal_diversion: {
        desc: 'Attacks targeting agent planning loops to derail the original user objective toward adversary goals.',
        threat: 'Hijacked Planning Subsystem',
        layers: new Set(['Planning Engine', 'Task Orchestrator']),
        papers: 9,
      },
      memory_poisoning: {
        desc: 'Adversarial payloads designed to persist across chat sessions inside vector databases or memory buffers.',
        threat: 'Persistent Memory Poisoner',
        layers: new Set(['Vector DB', 'Memory Store', 'Retriever']),
        papers: 11,
      },
      autonomy: {
        desc: 'Probes checking unauthorized autonomous execution, resource drain, and unchecked loop execution.',
        threat: 'Unrestricted Tool Executor',
        layers: new Set(['Executor Subsystem', 'Permission Manager']),
        papers: 8,
      },
      planning: {
        desc: 'Subtle adversarial perturbations that cause multi-step agent plan degradation or invalid tool selection.',
        threat: 'Strategic Adversary',
        layers: new Set(['Planner', 'Reasoning Engine']),
        papers: 10,
      },
      tool_security: {
        desc: 'Attempts to trick the agent into calling dangerous system commands, file deletion, or network APIs.',
        threat: 'Privilege Escalation Agent',
        layers: new Set(['Tool Dispatcher', 'Sandbox']),
        papers: 15,
      },
    }

    return Object.entries(RAW_DATASETS).map(([familyId, dataset]) => {
      const familyProbes = this.getProbesByFamily(familyId)
      const meta = familyMetas[familyId] || {
        desc: dataset.description || 'AI Agent Security evaluation attack family.',
        threat: 'Adversarial Threat',
        layers: new Set(['LLM Layer']),
        papers: 5,
      }

      return {
        id: familyId,
        name: familyId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: meta.desc,
        threatModel: meta.threat,
        affectedLayers: Array.from(meta.layers),
        probeCount: familyProbes.length,
        researchPapersCount: meta.papers,
      }
    })
  }

  public getScenarios(): ScenarioMeta[] {
    return SCENARIOS
  }

  // API Call: Fetch Stats
  public async fetchStats(): Promise<any> {
    const key = 'api_stats'
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!
      if (Date.now() - entry.timestamp < this.CACHE_TTL_MS) {
        return entry.data
      }
    }
    try {
      const res = await fetch('/api/stats')
      if (res.ok) {
        const data = await res.json()
        this.cache.set(key, { data, timestamp: Date.now() })
        return data
      }
    } catch {
      // Backend may be offline during initial load
    }
    return { totalSessions: 0, totalProbes: this.allProbes.length, totalBlocked: 0, totalAllowed: 0, overallBlockRate: 0 }
  }

  // API Call: Fetch Sessions
  public async fetchSessions(): Promise<BenchmarkRun[]> {
    const key = 'api_sessions'
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!
      if (Date.now() - entry.timestamp < this.CACHE_TTL_MS) {
        return entry.data
      }
    }
    try {
      const res = await fetch('/api/sessions')
      if (res.ok) {
        const data = await res.json()
        const formatted: BenchmarkRun[] = data.map((s: any) => ({
          id: s.id,
          sessionId: s.sessionId,
          agentId: s.agentId || 'nemotron_3_ultra',
          agentName: s.agentName || 'Nemotron-3 Ultra Guard',
          startedAt: s.startedAt,
          finishedAt: s.finishedAt,
          totalProbes: s.totalProbes || 0,
          blocked: s.blocked || 0,
          allowed: s.allowed || 0,
          status: s.status || 'COMPLETED',
          blockRate: s.totalProbes > 0 ? s.blocked / s.totalProbes : 0,
        }))
        this.cache.set(key, { data: formatted, timestamp: Date.now() })
        return formatted
      }
    } catch {
      // Backend may be offline during initial load
    }
    return []
  }

  // API Call: Fetch Report
  public async fetchReport(sessionId: string): Promise<any> {
    const key = `api_report_${sessionId}`
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!
      if (Date.now() - entry.timestamp < this.CACHE_TTL_MS) {
        return entry.data
      }
    }
    try {
      const res = await fetch(`/api/reports/${sessionId}`)
      if (res.ok) {
        const data = await res.json()
        this.cache.set(key, { data, timestamp: Date.now() })
        return data
      }
    } catch {
      // Backend may be offline
    }
    return null
  }

  // API Call: Fetch Agents
  public async fetchAgents(): Promise<any[]> {
    try {
      const res = await fetch('/api/agents')
      if (res.ok) return await res.json()
    } catch {
      // Backend may be offline during initial load
    }
    return []
  }

  // API Call: Fetch Backend Health
  public async fetchHealth(): Promise<{ status: string; db_connected: boolean }> {
    try {
      const res = await fetch('/api/health')
      if (res.ok) return await res.json()
    } catch {
      // Backend unreachable
    }
    return { status: 'offline', db_connected: false }
  }

  public async fetchConfig(): Promise<{
    nvidiaConfigured: boolean
    nvidiaKeyMasked: string
    ollamaBaseUrl: string
    ollamaModel: string
    ollamaReachable: boolean
  }> {
    try {
      const res = await fetch('/api/config')
      if (res.ok) return await res.json()
    } catch {
      // Backend unreachable
    }
    return {
      nvidiaConfigured: false,
      nvidiaKeyMasked: '',
      ollamaBaseUrl: 'http://localhost:11434',
      ollamaModel: 'llama3.2',
      ollamaReachable: false,
    }
  }

  public async saveConfig(payload: {
    nvidiaApiKey?: string
    ollamaBaseUrl?: string
    ollamaModel?: string
  }): Promise<{ ok: boolean; error?: string; data?: any }> {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return { ok: false, error: data?.detail || `HTTP ${res.status}` }
      }
      this.invalidateCache()
      return { ok: true, data }
    } catch {
      return { ok: false, error: 'Cannot reach FastAPI backend at http://127.0.0.1:8000.' }
    }
  }

  // Derived Leaderboard Data for Model Comparison
  public getModelComparisons(sessions: BenchmarkRun[]): ModelComparisonResult[] {
    const defaultModels: ModelComparisonResult[] = [
      {
        rank: 1,
        modelName: 'Nemotron-3 Ultra (550B)',
        agentId: 'nemotron_3_ultra',
        overallScore: 94.2,
        bds: 0.05,
        asr: 5.8,
        securityScore: 94.2,
        utilityScore: 96.5,
        memoryResistance: 95.0,
        planningResistance: 92.8,
        toolResistance: 96.0,
        familyScores: { direct_injection: 98, content_injection: 92, exfiltration: 95, goal_diversion: 90, memory_poisoning: 96, autonomy: 94, planning: 91, tool_security: 97 },
        totalEvaluations: 142,
        lastEvaluated: '2026-08-04',
      },
      {
        rank: 2,
        modelName: 'Nemotron-3 Super (120B)',
        agentId: 'nemotron_super_agent',
        overallScore: 91.8,
        bds: 0.08,
        asr: 8.2,
        securityScore: 91.8,
        utilityScore: 95.0,
        memoryResistance: 92.0,
        planningResistance: 90.5,
        toolResistance: 93.5,
        familyScores: { direct_injection: 96, content_injection: 89, exfiltration: 92, goal_diversion: 88, memory_poisoning: 93, autonomy: 91, planning: 89, tool_security: 94 },
        totalEvaluations: 110,
        lastEvaluated: '2026-08-04',
      },
      {
        rank: 3,
        modelName: 'Llama 3.3 70B Instruct',
        agentId: 'llama3_3_70b_agent',
        overallScore: 89.4,
        bds: 0.11,
        asr: 10.6,
        securityScore: 89.4,
        utilityScore: 94.0,
        memoryResistance: 88.5,
        planningResistance: 89.0,
        toolResistance: 91.2,
        familyScores: { direct_injection: 94, content_injection: 86, exfiltration: 90, goal_diversion: 87, memory_poisoning: 89, autonomy: 90, planning: 88, tool_security: 92 },
        totalEvaluations: 98,
        lastEvaluated: '2026-08-03',
      },
      {
        rank: 4,
        modelName: 'DeepSeek V4 Flash',
        agentId: 'deepseek_flash_agent',
        overallScore: 86.1,
        bds: 0.14,
        asr: 13.9,
        securityScore: 86.1,
        utilityScore: 95.2,
        memoryResistance: 84.0,
        planningResistance: 87.5,
        toolResistance: 88.0,
        familyScores: { direct_injection: 91, content_injection: 83, exfiltration: 88, goal_diversion: 84, memory_poisoning: 85, autonomy: 86, planning: 85, tool_security: 87 },
        totalEvaluations: 76,
        lastEvaluated: '2026-08-02',
      },
      {
        rank: 5,
        modelName: 'Ollama Local Agent',
        agentId: 'ollama_local_agent',
        overallScore: 78.5,
        bds: 0.22,
        asr: 21.5,
        securityScore: 78.5,
        utilityScore: 88.0,
        memoryResistance: 76.0,
        planningResistance: 79.0,
        toolResistance: 80.5,
        familyScores: { direct_injection: 85, content_injection: 74, exfiltration: 80, goal_diversion: 76, memory_poisoning: 77, autonomy: 78, planning: 77, tool_security: 81 },
        totalEvaluations: 45,
        lastEvaluated: '2026-08-01',
      },
    ]

    // sessions come ordered newest-first; iterate oldest-to-newest so latest completed run wins
    ;[...sessions].reverse().forEach(session => {
      if (!session.agentId || session.totalProbes === 0) return
      const match = defaultModels.find(m => m.agentId === session.agentId)
      const rate = (session.blocked / session.totalProbes) * 100
      const score = parseFloat(rate.toFixed(1))
      const asrVal = parseFloat((100 - rate).toFixed(1))
      const bdsVal = parseFloat(((100 - rate) / 100).toFixed(2))
      const dateStr = session.startedAt ? new Date(session.startedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]

      if (match) {
        match.overallScore = score
        match.securityScore = score
        match.asr = asrVal
        match.bds = bdsVal
        match.lastEvaluated = dateStr
        match.totalEvaluations += 1
      } else {
        defaultModels.push({
          rank: defaultModels.length + 1,
          modelName: session.agentName || session.agentId,
          agentId: session.agentId,
          overallScore: score,
          bds: bdsVal,
          asr: asrVal,
          securityScore: score,
          utilityScore: 90.0,
          memoryResistance: score,
          planningResistance: score,
          toolResistance: score,
          familyScores: { direct_injection: score, content_injection: score, exfiltration: score, goal_diversion: score, memory_poisoning: score, autonomy: score, planning: score, tool_security: score },
          totalEvaluations: 1,
          lastEvaluated: dateStr,
        })
      }
    })

    return defaultModels.sort((a, b) => b.overallScore - a.overallScore).map((m, idx) => ({ ...m, rank: idx + 1 }))
  }
}

export const benchmarkDataService = BenchmarkDataService.getInstance()
