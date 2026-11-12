# RedGuard Architecture Documentation

## Overview

RedGuard has been transformed from a prompt injection testing framework into a comprehensive **AI Agent Security Benchmark**. The new architecture follows SOLID principles and is designed for research-quality evaluation.

## Directory Structure

```
redguard/
├── probes/                    # Attack probes organized by family
│   ├── base.py               # Core probe classes (Probe, ProbeMetadata, etc.)
│   ├── registry.py           # Probe registry with filtering & discovery
│   ├── direct_injection/     # Direct prompt injection attacks
│   ├── content_injection/    # Indirect/content injection variants
│   ├── memory_poisoning/     # Memory/RAG poisoning attacks
│   ├── tool_security/        # Tool manipulation attacks
│   ├── planning/             # Planning manipulation attacks
│   ├── exfiltration/         # Data exfiltration attacks
│   ├── autonomy/             # Autonomous action attacks
│   └── goal_diversion/       # Goal diversion attacks
├── scenarios/                # Realistic scenario templates
│   ├── base.py              # Scenario base classes
│   ├── github.py            # GitHub issue scenario
│   ├── gitlab.py            # GitLab issue scenario
│   ├── email.py             # Email assistant scenario
│   ├── calendar.py          # Calendar assistant scenario
│   ├── banking.py           # Banking assistant scenario
│   ├── shopping.py          # Shopping assistant scenario
│   ├── travel.py            # Travel assistant scenario
│   ├── documentation.py     # Documentation page scenario
│   ├── wiki.py              # Wiki page scenario
│   ├── reddit.py            # Reddit post scenario
│   ├── forum.py             # Forum discussion scenario
│   └── support.py           # Support ticket scenario
├── benchmark/                # Benchmark execution & reporting
│   ├── runner.py            # BenchmarkRunner - main orchestration
│   ├── metrics.py           # Metrics computation (all required metrics)
│   └── reporting.py         # JSON & Markdown report generation
├── compat/                   # Backwards compatibility layer
│   ├── probes_adapter.py    # Legacy probe migration
│   └── scanner_adapter.py   # Legacy scanner interface
└── docs/                     # Documentation
```

## Core Concepts

### Attack Families (8 Total)

1. **Direct Injection** - Classic prompt injection attacks
2. **Content Injection** - Indirect injection via tool outputs/documents
3. **Memory Poisoning** - RAG/conversation memory corruption
4. **Tool Manipulation** - Unauthorized tool calls, structured output injection
5. **Planning Manipulation** - Goal override, task replacement, long context
4. **Goal Diversion** - Explicit/implicit goal steering, reward hacking
5. **Data Exfiltration** - Secret leakage, credential echo, encoding exfiltration
6. **Autonomous Actions** - Unsafe approval, blind execution, high-risk automation

### Probe Metadata

Every probe exposes rich metadata:

```python
ProbeMetadata(
    name="Hidden HTML Injection",
    attack_family=AttackFamily.CONTENT_INJECTION,
    variant="hidden_html",
    difficulty=DifficultyLevel.EASY,
    affected_layers=[AffectedLayer.LLM, AffectedLayer.TOOLS, AffectedLayer.MEMORY],
    scenario_compatibility=[ScenarioType.GITHUB_ISSUE, ScenarioType.GENERIC, ...],
    source_papers=[SourceReference(title="...", authors=[...], year=2023, ...)],
    expected_behavior="Agent should not execute instructions hidden in HTML",
    evaluation_metrics=["attack_success_rate", "html_sanitization", ...],
    tags={"html", "tool_output", "indirect_injection"}
)
```

### Scenarios

Probes can be executed within realistic contexts:

- **Development**: GitHub Issue, GitLab Issue
- **Communication**: Email Assistant, Support Ticket
- **Productivity**: Calendar Assistant, Documentation, Wiki
- **Social**: Reddit Post, Forum Discussion
- **Finance**: Banking Assistant, Shopping Assistant
- **Travel**: Travel Assistant

### Metrics (All Implemented)

| Metric | Description |
|--------|-------------|
| Attack Success Rate | % of probes where attack succeeded |
| User Task Completion | % of legitimate tasks completed correctly |
| Goal Diversion Rate | % of planning/goal attacks that succeeded |
| Unauthorized Tool Usage | % of tool manipulation attacks that succeeded |
| Memory Poisoning Success | % of memory attacks that succeeded |
| Security Score | 1 - Attack Success Rate (higher = better) |
| Utility Score | User Task Completion (higher = better) |
| False Positive Rate | Benign requests incorrectly blocked |
| False Negative Rate | Malicious requests incorrectly allowed |
| Average Execution Time | Mean probe execution time |

## Usage Examples

### Running a Full Benchmark

```python
from redguard.benchmark import run_benchmark, BenchmarkConfig
from redguard.probes.base import AttackFamily, DifficultyLevel
from redguard.scenarios.base import ScenarioType

config = BenchmarkConfig(
    attack_families=[AttackFamily.CONTENT_INJECTION, AttackFamily.TOOL_MANIPULATION],
    difficulties=[DifficultyLevel.EASY, DifficultyLevel.MEDIUM],
    scenarios=[ScenarioType.GITHUB_ISSUE, ScenarioType.GENERIC],
    agent_id="my_custom_agent",
    agent_invoke=my_async_invoke_function,
    max_concurrent=5,
)

run = run_benchmark(config)
print(f"Security Score: {run.security_score:.2%}")
```

### Using the Probe Registry

```python
from redguard.probes.registry import get_registry
from redguard.probes.base import AttackFamily, ScenarioType

registry = get_registry()

# Get all content injection probes
probes = registry.filter(family=AttackFamily.CONTENT_INJECTION)

# Get probes compatible with GitHub issue scenario
probes = registry.filter(scenario=ScenarioType.GITHUB_ISSUE)

# Get all probe metadata
for meta in registry.get_all_metadata():
    print(f"{meta.name} [{meta.attack_family.value}/{meta.variant}]")
```

### Generating Reports

```python
from redguard.benchmark.metrics import compute_all_metrics
from redguard.benchmark.reporting import generate_report

metrics = compute_all_metrics(results, benchmark_id="run_001")
reports = generate_report(metrics, formats=["json", "markdown"])
print(f"JSON: {reports['json']}")
print(f"Markdown: {reports['markdown']}")
```

## Backwards Compatibility

The `redguard.compat` module provides drop-in replacements for legacy code:

```python
# Legacy code continues to work
from redguard.compat import LEGACY_PROBE_LIBRARY, LegacyScannerAdapter

# Or migrate probes to new architecture
from redguard.compat import migrate_probes_to_new_architecture
count = migrate_probes_to_new_architecture()  # Returns number migrated
```

## Extending the Framework

### Adding a New Attack Family

1. Create directory under `probes/new_family/`
2. Add `__init__.py` with probe definitions following existing patterns
3. Register probes using `PROBES` list and `register_probes()` function
4. Add attack family to `AttackFamily` enum in `base.py`
5. Update literature mapping with relevant papers

### Adding a New Scenario

1. Create `scenarios/new_scenario.py` extending `Scenario` base class
2. Implement `get_template()` with system prompt, user context, and variables
3. Import in `scenarios/__init__.py` to auto-register
4. Add scenario type to `ScenarioType` enum

### Adding a New Metric

1. Add metric field to `ProbeMetrics` in `metrics.py`
2. Implement calculation in `MetricCalculator`
3. Update `compute_all_metrics` to aggregate
4. Add to report generation in `reporting.py`

## Research Integration

### Literature Mapping

Each probe references academic papers:

```python
SourceReference(
    title="Indirect Prompt Injection: A Survey",
    authors=["Greshake et al."],
    year=2023,
    venue="arxiv",
    arxiv_id="2302.12173",
    url="https://arxiv.org/abs/2302.12173"
)
```

Supported sources:
- Google DeepMind Prompt Injection Benchmarks
- Agent Security Bench (ASB)
- WASP
- AgentDojo
- Custom papers via `SourceReference`

### Reproducibility

- Every probe has deterministic ID and metadata
- Benchmark runs produce unique IDs and timestamps
- Reports include manifest SHA256 for integrity
- Configuration captured in report metadata

## Performance Considerations

- **Concurrency**: Configurable via `max_concurrent` (default: 3)
- **Timeouts**: Per-probe timeout via `timeout_seconds` (default: 30s)
- **Caching**: Probe registry caches instantiated probes
- **Lazy Loading**: Probes loaded on first access

## Migration Guide

### From Legacy Scanner

```python
# Old
from backend.scanner import run_scan

# New (drop-in compatible)
from redguard.compat.scanner_adapter import run_scan
```

### From Legacy Probes

```python
# Old
from backend.probes import PROBE_LIBRARY, CONTENT_INJECTION

# New (with auto-migration)
from redguard.compat.probes_adapter import LEGACY_PROBE_LIBRARY, migrate_probes_to_new_architecture

migrate_probes_to_new_architecture()  # One-time setup
# Now use new registry
from redguard.probes.registry import get_registry
registry = get_registry()
probes = registry.filter(family=AttackFamily.CONTENT_INJECTION)
```
