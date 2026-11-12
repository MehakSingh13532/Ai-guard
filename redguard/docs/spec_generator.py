"""
Benchmark Specification Generator
===================================

Auto-generates a complete benchmark specification document from the
probe registry and dataset files.

Motivation:
    Reviewers should not need to read source code to understand what
    each probe tests. A complete specification document — one section
    per probe — enables peer review of the benchmark design independent
    of the implementation.

    Standard benchmarks (BIG-Bench, HELM, AgentBench) all include
    specification documents alongside their code. This generator
    produces RedGuard's equivalent.

Usage:

    python -m redguard.docs.spec_generator

    or:

    from redguard.docs.spec_generator import generate_spec
    path = generate_spec()
"""

from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

DOCS_DIR = Path(__file__).parent
REDGUARD_DIR = DOCS_DIR.parent
OUTPUT_PATH = DOCS_DIR / "benchmark_spec.md"


# ─────────────────────────────────────────────────────────────────────────────
# Section Renderers
# ─────────────────────────────────────────────────────────────────────────────

def _render_header(version_info: Dict[str, Any]) -> str:
    return f"""# RedGuard Benchmark Specification

**Version:** {version_info.get('benchmark_version', '1.0.0')}
**Dataset Version:** {version_info.get('dataset_version', '1.0.0')}
**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}

This document is the complete, auto-generated specification for all probes
in the RedGuard AI Agent Security Benchmark.

Sections:
1. [Overview](#overview)
2. [Probe Taxonomy](#probe-taxonomy)
3. [Dataset Summary](#dataset-summary)
4. [Probe Specifications](#probe-specifications)

---
"""


def _render_overview() -> str:
    return """## Overview

RedGuard evaluates AI agent security across 8 attack families, 12 realistic
scenarios, and a hierarchical taxonomy of probe → variant → scenario → instance.

### Attack Family Prefixes

| Prefix | Attack Family |
|--------|--------------|
| RG-DI  | Direct Injection |
| RG-CI  | Content Injection |
| RG-MP  | Memory Poisoning |
| RG-TM  | Tool Manipulation |
| RG-PM  | Planning Manipulation |
| RG-EX  | Data Exfiltration |
| RG-AA  | Autonomous Actions |
| RG-GD  | Goal Diversion |

### Difficulty Scale

| Level | Description | Expected Block Rate |
|-------|-------------|---------------------|
| trivial | All production systems should block | > 95% |
| easy | Most hardened systems block | 70–95% |
| medium | Requires specific countermeasures | 40–70% |
| hard | Advanced defenses required | 20–40% |
| expert | Research-grade attacks | < 20% |

### Threat Models

| Threat Model | Description |
|---|---|
| adversarial_user | Authenticated user attempting to misuse the agent |
| malicious_third_party_content | Attacker controls external content (pages, documents) |
| compromised_tool | Tool outputs are controlled by an attacker |
| insider_threat | Privileged insider poisoning the agent's context |
| supply_chain | Attacker injects content during training or RAG population |

---
"""


def _render_taxonomy_section(entries: List[Dict[str, Any]]) -> str:
    """Render a probe taxonomy table."""
    lines = ["## Probe Taxonomy\n"]
    lines.append("| ID | Title | Family | Variant | Scenario | Difficulty |")
    lines.append("|---|---|---|---|---|---|")

    for entry in sorted(entries, key=lambda e: e.get("id", "")):
        lines.append(
            f"| {entry.get('id', '—')} "
            f"| {entry.get('title', '—')} "
            f"| {entry.get('attack_family', '—')} "
            f"| {entry.get('attack_variant', '—')} "
            f"| {entry.get('scenario', '—')} "
            f"| {entry.get('difficulty', '—')} |"
        )

    lines.append("\n---\n")
    return "\n".join(lines)


def _render_dataset_summary(entries: List[Dict[str, Any]]) -> str:
    """Render summary statistics about the dataset."""
    family_counts: Dict[str, int] = {}
    difficulty_counts: Dict[str, int] = {}
    scenario_counts: Dict[str, int] = {}

    for e in entries:
        fam = e.get("attack_family", "unknown")
        family_counts[fam] = family_counts.get(fam, 0) + 1
        diff = e.get("difficulty", "unknown")
        difficulty_counts[diff] = difficulty_counts.get(diff, 0) + 1
        scen = e.get("scenario", "unknown")
        scenario_counts[scen] = scenario_counts.get(scen, 0) + 1

    lines = [f"## Dataset Summary\n\n**Total Probes:** {len(entries)}\n"]

    lines.append("### By Attack Family\n")
    lines.append("| Family | Probe Count |")
    lines.append("|--------|------------|")
    for fam, cnt in sorted(family_counts.items()):
        lines.append(f"| {fam} | {cnt} |")

    lines.append("\n### By Difficulty\n")
    lines.append("| Difficulty | Count |")
    lines.append("|------------|-------|")
    order = ["trivial", "easy", "medium", "hard", "expert"]
    for diff in order:
        if diff in difficulty_counts:
            lines.append(f"| {diff} | {difficulty_counts[diff]} |")

    lines.append("\n### By Scenario\n")
    lines.append("| Scenario | Count |")
    lines.append("|----------|-------|")
    for scen, cnt in sorted(scenario_counts.items()):
        lines.append(f"| {scen} | {cnt} |")

    lines.append("\n---\n")
    return "\n".join(lines)


def _render_probe_spec(entry: Dict[str, Any]) -> str:
    """Render a single probe specification section."""
    probe_id = entry.get("id", "UNKNOWN")
    title = entry.get("title", "Untitled")

    lines = [
        f"### {probe_id} — {title}\n",
        "| Field | Value |",
        "|-------|-------|",
        f"| **ID** | `{probe_id}` |",
        f"| **Attack Family** | `{entry.get('attack_family', '—')}` |",
        f"| **Variant** | `{entry.get('attack_variant', '—')}` |",
        f"| **Scenario** | `{entry.get('scenario', '—')}` |",
        f"| **Difficulty** | `{entry.get('difficulty', '—')}` |",
        f"| **Threat Model** | `{entry.get('threat_model', '—')}` |",
        f"| **Attacker Capability** | `{entry.get('attacker_capability', '—')}` |",
        f"| **Affected Layers** | `{', '.join(entry.get('affected_layers', []))}` |",
        f"| **Probe Version** | `{entry.get('probe_version', '—')}` |",
    ]

    lines.append("")
    lines.append(f"**Attack Goal:** {entry.get('attack_goal', '—')}\n")
    lines.append(f"**Expected Safe Behaviour:** {entry.get('expected_behavior', '—')}\n")
    lines.append(f"**Unsafe Behaviour:** {entry.get('failure_behavior', '—')}\n")

    # Evaluation rules
    rules = entry.get("evaluation_rules", {})
    if rules:
        si = rules.get("success_indicators", [])
        bi = rules.get("blocked_indicators", [])
        notes = rules.get("notes", "")
        lines.append("**Evaluation Logic:**\n")
        lines.append(f"- *Attack success indicators:* `{', '.join(si)}`")
        lines.append(f"- *Blocked indicators:* `{', '.join(bi)}`")
        if notes:
            lines.append(f"- *Notes:* {notes}")
        lines.append("")

    # Prompt
    prompt = entry.get("prompt", "")
    if prompt:
        lines.append("**Probe Prompt:**\n")
        lines.append("```")
        lines.append(prompt[:500] + ("..." if len(prompt) > 500 else ""))
        lines.append("```\n")

    # References
    references = entry.get("references", [])
    if references:
        lines.append("**References:**\n")
        for ref in references:
            authors = ", ".join(ref.get("authors", []))
            year = ref.get("year", "")
            venue = ref.get("venue", "")
            arxiv = ref.get("arxiv_id", "")
            arxiv_str = f" (arXiv:{arxiv})" if arxiv else ""
            url = ref.get("url", "")
            url_str = f" [{ref.get('title', '')}]({url})" if url else ref.get("title", "")
            lines.append(f"- {url_str}. {authors}. {venue} {year}{arxiv_str}.")
        lines.append("")

    # Research notes
    notes = entry.get("research_notes", "")
    if notes:
        lines.append(f"**Research Notes:** {notes}\n")

    lines.append("---\n")
    return "\n".join(lines)


def _render_all_probes(entries: List[Dict[str, Any]]) -> str:
    lines = ["## Probe Specifications\n"]

    # Group by family
    by_family: Dict[str, List[Dict[str, Any]]] = {}
    for e in entries:
        fam = e.get("attack_family", "unknown")
        by_family.setdefault(fam, []).append(e)

    family_order = [
        "direct_injection", "content_injection", "memory_poisoning",
        "tool_manipulation", "planning_manipulation",
        "data_exfiltration", "autonomous_actions", "goal_diversion"
    ]

    for fam in family_order:
        if fam not in by_family:
            continue
        family_entries = sorted(by_family[fam], key=lambda e: e.get("id", ""))
        fam_display = fam.replace("_", " ").title()
        lines.append(f"\n### Family: {fam_display}\n")
        for entry in family_entries:
            lines.append(_render_probe_spec(entry))

    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# Main Generator
# ─────────────────────────────────────────────────────────────────────────────

def generate_spec(output_path: Optional[Path] = None) -> Path:
    """Generate the complete benchmark specification document.

    Args:
        output_path: Optional output path. Defaults to docs/benchmark_spec.md.

    Returns:
        Path to the generated file.
    """
    from redguard.version import get_version_info
    from redguard.datasets.loader import load_all_datasets

    target = output_path or OUTPUT_PATH

    version_info = get_version_info()
    entries = load_all_datasets(validate=False)

    sections = [
        _render_header(version_info),
        _render_overview(),
        _render_taxonomy_section(entries),
        _render_dataset_summary(entries),
        _render_all_probes(entries),
        f"\n---\n*Specification auto-generated by RedGuard {version_info['benchmark_version']} "
        f"on {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}. "
        f"Do not edit manually — re-run `python -m redguard.docs.spec_generator` to update.*\n",
    ]

    content = "\n".join(sections)

    with open(target, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"Specification generated: {target}")
    print(f"  Probes documented: {len(entries)}")
    return target


if __name__ == "__main__":
    path = generate_spec()
    sys.exit(0)
