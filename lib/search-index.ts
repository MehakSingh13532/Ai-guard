import { benchmarkDataService, Probe, AttackFamilyMeta, ScenarioMeta } from './data-service'

export interface SearchResultItem {
  id: string
  type: 'probe' | 'family' | 'scenario' | 'model' | 'report'
  title: string
  subtitle: string
  badgeText: string
  link: string
}

export function searchBenchmark(query: string): SearchResultItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const results: SearchResultItem[] = []

  // 1. Search Probes
  const probes: Probe[] = benchmarkDataService.getAllProbes()
  probes.forEach(probe => {
    if (
      probe.id.toLowerCase().includes(q) ||
      probe.title.toLowerCase().includes(q) ||
      probe.attack_family.toLowerCase().includes(q) ||
      probe.attack_variant.toLowerCase().includes(q) ||
      probe.scenario.toLowerCase().includes(q) ||
      (probe.tags && probe.tags.some(t => t.toLowerCase().includes(q)))
    ) {
      results.push({
        id: probe.id,
        type: 'probe',
        title: `${probe.id}: ${probe.title}`,
        subtitle: `Family: ${probe.attack_family} | Difficulty: ${probe.difficulty} | Layer: ${(probe.affected_layers || []).join(', ')}`,
        badgeText: 'Probe',
        link: `/probes/${probe.id}`,
      })
    }
  })

  // 2. Search Attack Families
  const families: AttackFamilyMeta[] = benchmarkDataService.getAttackFamilies()
  families.forEach(fam => {
    if (
      fam.id.toLowerCase().includes(q) ||
      fam.name.toLowerCase().includes(q) ||
      fam.description.toLowerCase().includes(q)
    ) {
      results.push({
        id: fam.id,
        type: 'family',
        title: fam.name,
        subtitle: `${fam.probeCount} Probes | Threat Model: ${fam.threatModel}`,
        badgeText: 'Attack Family',
        link: `/attack-families/${fam.id}`,
      })
    }
  })

  // 3. Search Scenarios
  const scenarios: ScenarioMeta[] = benchmarkDataService.getScenarios()
  scenarios.forEach(scen => {
    if (
      scen.id.toLowerCase().includes(q) ||
      scen.name.toLowerCase().includes(q) ||
      scen.description.toLowerCase().includes(q)
    ) {
      results.push({
        id: scen.id,
        type: 'scenario',
        title: scen.name,
        subtitle: `${scen.description} (Risk: ${scen.riskLevel})`,
        badgeText: 'Scenario',
        link: `/scenarios`,
      })
    }
  })

  // 4. Search Models & Leaderboards
  const models = [
    { id: 'nemotron_3_ultra', name: 'Nemotron-3 Ultra Guard' },
    { id: 'llama3_3_70b_agent', name: 'Llama 3.3 70B Instruct' },
    { id: 'deepseek_flash_agent', name: 'DeepSeek Flash 2.5' },
    { id: 'ollama_local_agent', name: 'Ollama Local Agent' },
    { id: 'nemotron_super_agent', name: 'Custom Policy Super Agent' },
  ]
  models.forEach(m => {
    if (m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)) {
      results.push({
        id: m.id,
        type: 'model',
        title: m.name,
        subtitle: `Agent ID: ${m.id} | Benchmark Leaderboard`,
        badgeText: 'Model',
        link: `/comparison`,
      })
    }
  })

  return results.slice(0, 15) // Limit to top 15 results
}
