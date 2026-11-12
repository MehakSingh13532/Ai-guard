# Ai-guard v2.0.0 🛡️ — AI Agent Security Benchmark Platform

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](redguard/version.py)
[![Benchmark](https://img.shields.io/badge/benchmark-v2.0.0-indigo.svg)](redguard/version.py)
[![Dataset](https://img.shields.io/badge/dataset-v2.0.0-emerald.svg)](redguard/datasets)

Ai-guard is an academic-grade **AI Agent Security Benchmark Platform** designed for empirical evaluation of Large Language Model (LLM) agent resistance against indirect prompt injections, goal diversion, persistent memory poisoning, autonomous execution risks, and tool hijacking.

The platform combines a research-focused **Next.js 16 frontend** (styled after Hugging Face Leaderboards, MLPerf, Weights & Biases, Kaggle, and OpenAI System Cards) with a **FastAPI backend engine**.

---

## ✨ Key Features (v2.0.0)

| Feature | Description |
|---|---|
| **Academic Leaderboard & Ranking** | Multi-model ranking across Attack Success Rate (ASR), Behaviour Drift Score (BDS), Security Score, & Tool Resistance |
| **Research Visualizations** | Recharts Radar Charts (Attack family comparison), Stacked Outcome Distribution Bars, and Score Evolution curves |
| **11 Navigation Hubs** | Dedicated sections for Dashboard, Benchmark Execution, Attack Families, Probes, Scenarios, Models, Reports, Datasets, Documentation, & Settings |
| **Global Search (`⌘K`)** | Fast client-side fuzzy search overlay (`lib/search-index.ts`) matching Probe IDs, Titles, Attack Families, Scenarios, Models, and Reports |
| **8 Attack Families Taxonomy** | Direct Injection, Content Injection, Data Exfiltration, Goal Diversion, Memory Poisoning, Autonomous Actions, Planning Manipulation, & Tool Manipulation |
| **115 Empirical Probes** | Auditable JSON dataset entries with research paper citations (arXiv IDs, venues, authors), difficulty levels, & threat models |
| **12 Application Scenarios** | GitHub, GitLab, Wiki, Documentation, Email, Calendar, Banking, Travel, Shopping, Support, Forum, & Reddit simulation environments |
| **Live SSE Execution Suite** | Real-time Server-Sent Events stream tracking family progress, live resisted/compromised counters, and pulse border feedback |
| **Multi-Format Export** | Download evaluation benchmark reports in Markdown (`.md`) and CSV (`.csv`) formats |
| **BibTeX Citation Exporter** | Built-in academic citation snippet generator for research paper citations |

---

## 🏗️ Architecture Overview

```
                        Ai-guard v2.0.0 Platform
                                   │
┌──────────────────────────────────┴──────────────────────────────────┐
│                      Next.js 16 Academic UI                          │
│ ├── Dashboard (6 Stat Scorecards)    ├── Probes Directory & Drawer  │
│ ├── Live SSE Benchmark Executor      ├── 12 Scenario Contexts       │
│ ├── 8 Attack Family Taxonomy Pages   ├── Leaderboard & Radar Charts  │
│ └── Global Search Modal (⌘K)         └── Reports Export (MD/CSV)    │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │ HTTP / SSE Stream
┌──────────────────────────────────┴──────────────────────────────────┐
│                      FastAPI Backend Engine                          │
│ ├── Inspector (Deep Packet Inspection & YAML policy engine)         │
│ ├── Agent Loader (Discovers *.py modules in backend/agents/)        │
│ │      ├── Nemotron-3 Ultra (550B)   ├── DeepSeek Flash 2.5        │
│ │      ├── Nemotron-3 Super (120B)   └── Ollama Local Agent        │
│ │      └── Llama 3.3 70B Instruct                                   │
│ ├── Scanner & Report Generator                                       │
│ └── Prisma ORM → Local SQLite Database                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Repository Structure

```
Ai-guard/
├── app/                               # Next.js App Router (v2.0.0)
│   ├── page.tsx                       # Dashboard (6 Research Cards + Taxonomy Grid)
│   ├── benchmark/page.tsx             # Live Execution Suite (SSE Progress Tracker)
│   ├── attack-families/               # Attack Family Index & Detail Pages
│   │   └── [familyId]/page.tsx        # Family Threat Models, Citations & Probes
│   ├── probes/                        # Probes Inventory & Canonical Probe Page
│   │   └── [probeId]/page.tsx         # Full Payload Specification & expected/failure cards
│   ├── scenarios/page.tsx             # 12 Application Scenario Cards
│   ├── comparison/page.tsx            # Model Leaderboard, Radar Chart & Matrix
│   ├── reports/page.tsx               # Security Scorecards & Export (MD / CSV)
│   ├── history/page.tsx               # Execution Run Timeline Log
│   ├── datasets/page.tsx              # Dataset Version 2.0.0 & Schema Status
│   ├── policy/page.tsx                # Policy Editor & BibTeX Citation Generator
│   ├── settings/page.tsx              # FastAPI & Database Health Monitor
│   ├── globals.css                    # Academic surface tokens & badges
│   └── layout.tsx                     # Root layout with Header & Sidebar
│
├── components/
│   ├── Header.tsx                     # Top Bar (Version badges, ⌘K Search, Theme, Models)
│   ├── Sidebar.tsx                    # 11 Research Navigation Items
│   ├── GlobalSearchModal.tsx          # ⌘K Keyboard-Navigable Search Overlay
│   ├── ProbeDrawer.tsx                # Slide-over Metadata Inspection Drawer
│   ├── Skeletons.tsx                  # Table, Card, & Chart Skeleton Loaders
│   └── EmptyState.tsx                 # Zero-data UI states
│
├── lib/
│   ├── data-service.ts                # Singleton BenchmarkDataService & Cache
│   └── search-index.ts                # Client-side Search Index Engine
│
├── redguard/                          # Core Python Library & Static Datasets
│   ├── datasets/                      # 8 JSON Attack Family Datasets (115 Probes)
│   │   ├── direct_injection.json
│   │   ├── content_injection.json
│   │   ├── exfiltration.json
│   │   ├── goal_diversion.json
│   │   ├── memory_poisoning.json
│   │   ├── autonomy.json
│   │   ├── planning.json
│   │   └── tool_security.json
│   └── version.py                     # Canonical Version Constants (v2.0.0)
│
└── backend/                           # FastAPI Service (:8000)
    ├── app.py                         # FastAPI endpoints & CORS configuration
    ├── scanner.py                     # Scanner orchestration & SSE streams
    ├── inspector.py                   # Regex & policy rules engine
    ├── agent_loader.py                # Plugin agent loader
    └── agents/                        # Configured Model Agents
        ├── nemotron_3_ultra.py        # Nemotron-3 Ultra (550B)
        ├── nemotron_super_agent.py    # Nemotron-3 Super (120B)
        ├── llama3_3_70b_agent.py      # Llama 3.3 70B Instruct
        ├── deepseek_flash_agent.py    # DeepSeek Flash 2.5
        └── ollama_local_agent.py      # Ollama Local Agent
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js 18+ & `npm`
- Python 3.10+ & `pip` / `venv`

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/ShivamYash742/RedGuard.git
cd RedGuard

# Install frontend dependencies
npm install

# Setup backend Python environment
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
```

### 3. Running Locally
Start both Next.js frontend (port 3000) and FastAPI backend (port 8000) concurrently:
```bash
npm run dev:all
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📖 Citation

If you use Ai-guard in academic publications, please cite:

```bibtex
@article{aiguard2024,
  title={Ai-guard: A Comprehensive Security Evaluation Benchmark for Autonomous LLM Agents},
  author={Ai-guard Research Team},
  journal={arXiv preprint arXiv:2408.00000},
  year={2024}
}
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
