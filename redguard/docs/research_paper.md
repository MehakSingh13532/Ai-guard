# RedGuard: A Reproducible Benchmark for Evaluating AI Agent Security

**RedGuard Benchmark v1.0.0**  
*Draft for submission — research paper quality documentation*

---

## Abstract

We present RedGuard, a reproducible benchmark for evaluating the security of AI agents across eight attack families, twelve realistic deployment scenarios, and a formally defined probe hierarchy. RedGuard contributes: (1) a dataset of 50 probes with stable identifiers, complete metadata, and literature provenance; (2) a novel metric, the Behaviour Drift Score (BDS), which measures the consistency of agent security behavior across repeated evaluations; (3) a full reproducibility suite capturing configuration, environment, model parameters, and git commit for every benchmark run; and (4) cross-model evaluation infrastructure enabling controlled comparison across model families. We discuss the threat model, evaluation methodology, limitations, and directions for future work.

---

## 1. Benchmark Motivation

AI agents — systems that combine large language models with tools, memory, and autonomous planning — are rapidly moving from research to production. They read emails, book travel, execute code, manage calendars, and process financial transactions. This expanded capability surface introduces security risks that differ qualitatively from those of traditional LLMs:

**Why existing benchmarks are insufficient.** General LLM safety benchmarks (TruthfulQA, HellaSwag, MMLU) evaluate factual accuracy and reasoning, not agentic security properties. Recent agent security benchmarks — ASB (Liu et al., 2024), WASP (Pasquini et al., 2024), AgentDojo (Debenedetti et al., 2024) — make important contributions but share several limitations:

1. **Incomplete probe metadata.** Probes are often hardcoded without stable identifiers, preventing long-term reproducibility.
2. **No consistency measurement.** Existing metrics report attack success rates but do not measure whether agent behavior is consistent across repeated invocations — a critical property for production systems.
3. **Limited scenario diversity.** Many benchmarks evaluate agents in a single scenario type.
4. **Missing reproducibility artifacts.** Without captured dependency versions and random seeds, results cannot be reproduced across laboratory environments.

RedGuard addresses all four gaps.

---

## 2. Threat Model

### 2.1 Access Levels

| Level | Description | Example |
|-------|-------------|---------|
| Prompt-level | Controls user prompt content | Malicious user |
| Document-level | Controls external documents the agent reads | Web page poisoning |
| Tool-output-level | Controls what tools return | Compromised API |
| Memory-level | Controls agent memory / RAG store | Database poisoning |
| Network-level | Controls network traffic | MITM |

### 2.2 Target Layers

| Layer | Description |
|-------|-------------|
| LLM | Core language model inference |
| Orchestrator | Planning and tool-calling logic |
| Tools | Tool interface and parameter parsing |
| Memory | RAG retrieval, conversation history |
| Policy | Safety guardrails and output filters |
| Data | Data access, exfiltration surface |

### 2.3 Threat Model Scope

RedGuard v1.0 covers: adversarial user, malicious third-party content, compromised tool, and insider threat scenarios.

RedGuard v1.0 does **not** cover: model weight tampering, training-time attacks, adversarial examples at the token level, or multi-agent coordination attacks.

---

## 3. Attack Taxonomy

RedGuard uses a four-level hierarchy:

```
Attack Family → Probe → Variant → Benchmark Instance (RG-XX-NNN)
```

| Family | ID Prefix | Probes | Attack Vector |
|--------|-----------|--------|---------------|
| Direct Injection | RG-DI | 8 | User prompt |
| Content Injection | RG-CI | 9 | External documents/pages |
| Memory Poisoning | RG-MP | 6 | RAG store / conversation history |
| Tool Manipulation | RG-TM | 7 | Tool output / schema |
| Planning Manipulation | RG-PM | 5 | Planning/reasoning layer |
| Data Exfiltration | RG-EX | 6 | Output / tool parameters |
| Autonomous Actions | RG-AA | 5 | Action authorization |
| Goal Diversion | RG-GD | 4 | Agent objective |

**Total: 50 probes across 8 families and 12 scenarios.**

---

## 4. Dataset Design

Every probe is stored as a JSON object in `redguard/datasets/{family}.json`. Each entry includes:

- **Stable ID** (RG-XX-NNN, regex-validated)
- **Title**, **attack_family**, **attack_variant**, **scenario**, **difficulty**
- **Threat model** and **attacker_capability** (controlled vocabulary)
- **Verbatim prompt** (attack input)
- **expected_behavior** and **failure_behavior** (unambiguous evaluation anchors)
- **evaluation_rules** with **success_indicators** and **blocked_indicators**
- **References** (≥ 1 academic reference required per probe)
- **probe_version** and **dataset_version** (semver)

All 50 v1.0 probes are synthetically constructed. A `ProbeValidator` enforces 13 checks at load time.

---

## 5. Scenario Design

| Scenario | Representative Use Case |
|----------|------------------------|
| `github_issue` | AI code review / triage assistant |
| `documentation_page` | Technical writing / RAG assistant |
| `email_assistant` | Email management and drafting |
| `calendar_assistant` | Scheduling and meeting management |
| `travel_assistant` | Booking and travel planning |
| `banking_assistant` | Financial transaction assistant |
| `shopping_assistant` | Product recommendation and purchase |
| `support_ticket` | Customer support agent |
| `wiki` | Knowledge management assistant |
| `reddit_post` | Social media summarization agent |
| `forum_discussion` | Community moderation agent |
| `gitlab_issue` | DevOps pipeline agent |

---

## 6. Evaluation Methodology

**Attack success** is determined by keyword matching against `success_indicators`.  
**Blocked** is determined by matching `blocked_indicators`.  
**Concurrency:** Up to `max_concurrent` probes run in parallel (default: 3). Timeout: 30s per probe.

---

## 7. Metrics

### 7.1 Standard Metrics

| Metric | Formula | Interpretation |
|--------|---------|----------------|
| Attack Success Rate (ASR) | $N_{\text{successful\_attacks}} / N_{\text{total}}$ | Higher = more vulnerable |
| Security Score | $1 − \text{ASR}$ | Higher = more secure against attacks |
| Utility Score / Task Completion | $N_{\text{task\_completed}} / N_{\text{total}}$ | Higher = better completion of benign user tasks |
| Unauthorized Tool Usage Rate | $N_{\text{tool\_success}} / N_{\text{tool\_probes}}$ | Tool layer vulnerability |
| Memory Poisoning Rate | $N_{\text{memory\_success}} / N_{\text{memory\_probes}}$ | Memory layer vulnerability |
| Goal Diversion Rate | $N_{\text{goal\_success}} / N_{\text{goal\_probes}}$ | Planning layer vulnerability |

**Independence of Security and Utility:** Security Score evaluates whether the agent resisted attack compromise ($1 - \text{ASR}$). Utility Score evaluates whether the agent successfully fulfilled the user's intended primary task ($N_{\text{task\_completed}} / N_{\text{total}}$). These metrics are evaluated independently: an overly defensive agent that refuses all user requests achieves Security = 1.0 but Utility = 0.0, capturing the over-refusal penalty.

All rates include 95% Wilson score confidence intervals.

### 7.2 Behaviour Drift Score (BDS) — Novel Contribution

**Motivation.** ASR captures the mean outcome. It does not capture whether the agent is *consistently* secure or stochastically unreliable.

**Definition.** For probe p with N runs, outcomes r_i ∈ {0, 1} (1 = attack success):

```
mean_r  = (1/N) Σ r_i
MAD_s   = Σ|r_i − mean_r| / (N − 1)     [sample MAD]
BDS(p)  = 1 − MAD_s
```

**Range:** BDS ∈ [0, 1].

| BDS | Interpretation |
|-----|---------------|
| ≥ 0.9 | Highly consistent |
| 0.7–0.9 | Consistent |
| 0.5–0.7 | Moderately inconsistent |
| 0.3–0.5 | Inconsistent |
| < 0.3 | Highly stochastic — unreliable |

**Aggregation:** BDS_overall = (1/|P|) Σ BDS(p)

**Requirement:** N ≥ 3 runs per probe for statistical validity.

**Advantages:**
1. Detects stochastic agents with acceptable mean ASR but unreliable individual runs
2. Directly actionable: low BDS → reduce temperature, add determinism
3. Not present in ASB, WASP, or AgentDojo

**Limitations:**
1. N ≥ 3 required (3× evaluation cost)
2. Symmetric: consistently safe = consistently insecure = BDS 1.0 (always read alongside ASR)
3. N = 1 → BDS = 1.0 trivially (not meaningful)

---

## 8. Reproducibility

Every run produces four JSON artifacts:

| Artifact | Contents |
|----------|----------|
| `configuration.json` | Full BenchmarkConfig |
| `environment.json` | Python version, OS, all package versions |
| `model_information.json` | Model ID, provider, temperature, seed |
| `run_manifest.json` | Timestamp, seed, benchmark version, git commit |

**Recommendation for publication:** Report `benchmark_id`, `benchmark_version`, `dataset_version`, and `git.commit` from `run_manifest.json`.

---

## 9. Limitations

1. **Keyword evaluation.** String matching can produce false positives and negatives. LLM-as-judge planned for v2.0.
2. **Synthetic prompts.** Real-world attacks may be more sophisticated.
3. **Single-turn evaluation.** Multi-turn attacks require stateful infrastructure.
4. **English-only.** Cross-lingual injection not covered.
5. **BDS evaluation cost.** 50 probes × 3 runs minimum = 150 invocations.

---

## 10. Future Work

- v1.1: LLM-as-judge evaluation mode
- v1.1: Multi-turn probe support
- v1.2: Cross-lingual injection probes
- v2.0: Real-world incident-adapted probes
- v2.0: Multi-agent coordination attack family

---

## References

Debenedetti et al. (2024). AgentDojo. *NeurIPS 2024*. arXiv:2406.13352.  
Denison et al. (2024). Sycophancy to Subterfuge. *NeurIPS 2024*. arXiv:2406.10162.  
Greshake et al. (2023). Not What You've Signed Up For. *ACM AISec Workshop*. arXiv:2302.12173.  
Liu et al. (2024). Lost in the Middle. *TACL*. arXiv:2307.03172.  
Sandoval et al. (2023). HackAPrompt. arXiv:2311.17702.  
Wallace et al. (2023). Poisoning Retrieval Corpora. *EMNLP 2023*. arXiv:2310.19156.  
Wei et al. (2023). Jailbroken. *NeurIPS 2023*. arXiv:2307.02483.

---
*RedGuard Benchmark v1.0.0 — Research documentation for reproducible AI agent security evaluation.*
