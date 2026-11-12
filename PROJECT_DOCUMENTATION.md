# Ai-guard v2.0.0 — System Architecture & Technical Documentation

Ai-guard v2.0.0 is an automated security evaluation and red-teaming benchmark system designed to test Large Language Model (LLM) agents against complex adversarial attacks.

---

## 1. System Overview

Modern AI agents use tools (web search, file reading, code execution, SQL access) and operate autonomously in multi-step reasoning loops (ReAct). This capability creates critical security risks such as prompt injection, context poisoning, filesystem exfiltration, and goal diversion.

Ai-guard v2.0.0 serves as a **vulnerability scanner and security benchmark platform** for AI agents. It fires 115 curated adversarial attack probes across 8 distinct attack families, inspects inputs with a Deep Packet Inspection (DPI) policy engine, and records whether target LLM agents resist or succumb to attacks.

---

## 2. Technical Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Next.js 16 Academic Research UI                         │
│  - Dashboard [/]                 - Models & Leaderboard [/comparison]      │
│  - Benchmark Runner [/benchmark] - Reports & Export [/reports]              │
│  - Attack Families [/attack]     - Datasets [/datasets]                     │
│  - Probes Directory [/probes]    - Policy & BibTeX [/policy]                │
│  - 12 Scenarios [/scenarios]     - Settings & Health [/settings]            │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ HTTP / SSE Stream (/api/*)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             FastAPI Backend (:8000)                         │
│  ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────┐  │
│  │     Inspector (DPI)   │ │   Scanner Engine      │ │   Agent Loader    │  │
│  │   Regex + policy.yaml │ │   Sequential SSE      │ │  Dynamic Discovery│  │
│  └───────────┬───────────┘ └───────────┬───────────┘ └─────────┬─────────┘  │
└──────────────┼─────────────────────────┼───────────────────────┼────────────┘
               │                         │                       │
               ▼                         ▼                       ▼
      ┌────────────────┐                                ┌────────────────┐
      │   Prisma DB    │                                │  LLM Targets   │
      │  (dev.db SQLite)                                │ (NVIDIA/Ollama)│
      └────────────────┘                                └────────────────┘
```

---

## 3. Core Evaluation Workflow

1. **Scan Initialization (`POST /api/scan/start`)**:
   - Creates a unique `Session` record in the database (e.g. `run_20260804_163000`).
   - Captures a snapshot of the current `policy.yaml` rules.
   - Loads all 115 built-in dataset probes (`redguard/datasets/*.json`) plus any active custom probes.
   - Groups probes into 8 Attack Families.

2. **Sequential Family Execution (`GET /api/scan/family` - SSE Stream)**:
   - Evaluates each family via Server-Sent Events.
   - Inspects prompts via Inspector DPI rules.
   - For allowed prompts, invokes the target agent module (e.g. `nemotron_3_ultra`, `llama3_3_70b_agent`, `deepseek_flash_agent`, `ollama_local_agent`, or `nemotron_super_agent`).
   - Evaluates agent response against evaluation rules (`success_indicators`, `blocked_indicators`).

3. **Finalization & Report Generation (`POST /api/scan/finalize`)**:
   - Calculates overall Security Resistance Score, Attack Success Rate (ASR), and Behaviour Drift Score (BDS).
   - Generates JSON and Markdown report artifacts with SHA-256 integrity hash.
   - Invalidates client-side data service cache to update live leaderboards.

---

## 4. Benchmark Taxonomy (8 Attack Families)

1. **Direct Prompt Injection** (`direct_injection`) — Override commands and jailbreak prompts.
2. **Indirect Content Injection** (`content_injection`) — Untrusted external data payloads.
3. **Data Exfiltration** (`exfiltration` / `data_exfiltration`) — Secret leakage and system prompt theft.
4. **Goal Diversion** (`goal_diversion`) — Planning hijack and task derailment.
5. **Memory Poisoning** (`memory_poisoning`) — Vector DB and session memory buffer corruption.
6. **Autonomous Actions** (`autonomy` / `autonomous_actions`) — Unchecked execution and human-in-the-loop bypasses.
7. **Planning Manipulation** (`planning` / `planning_manipulation`) — Reasoning pertubation and multi-step plan derailment.
8. **Tool Security** (`tool_security` / `tool_manipulation`) — Malicious tool output commands and privilege escalation.
