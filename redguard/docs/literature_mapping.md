# Literature Mapping Reference

This document maps RedGuard probes to their academic/industry research sources.

## Major Benchmark Sources

### 1. Google DeepMind Prompt Injection Benchmarks
- **Paper**: "Ignore This Title and HackAPrompt: A Large-Scale Prompt Injection Dataset" (Sandoval et al., 2023)
- **arXiv**: 2311.17702
- **Relevant Families**: Direct Injection, Content Injection

### 2. Agent Security Bench (ASB)
- **Paper**: "Agent Security Bench: Evaluating Security of LLM Agents" (2024)
- **arXiv**: 2406.13352
- **Relevant Families**: All families - comprehensive agent benchmark

### 3. WASP (Web Application Security Project) for LLMs
- **Reference**: WASP Top 10 for LLM Applications
- **Relevant Families**: Tool Manipulation, Data Exfiltration, Autonomous Actions

### 4. AgentDojo
- **Paper**: "AgentDojo: A Dynamic Environment for Evaluating Agent Security" (2024)
- **arXiv**: 2406.13352
- **Relevant Families**: Planning Manipulation, Goal Diversion, Autonomous Actions

## Probe Family Literature Mapping

### Direct Injection
| Probe | Source | Reference |
|-------|--------|-----------|
| Basic Instruction Override | HackAPrompt | Sandoval et al. (2023) |
| Ignore Previous Instructions | HackAPrompt | Sandoval et al. (2023) |
| System Override Declaration | Prompt Injection Survey | Liu et al. (2023) |
| Role Play Jailbreak | Prompt Injection Survey | Liu et al. (2023) |
| Continuation Attack | HackAPrompt | Sandoval et al. (2023) |
| Few-Shot Injection | Prompt Injection Survey | Liu et al. (2023) |
| Encoding Obfuscation | Base64 Injection | Anonymous (2024) |
| Delimiter Confusion | Prompt Injection Survey | Liu et al. (2023) |

### Content Injection
| Probe | Source | Reference |
|-------|--------|-----------|
| Hidden HTML Injection | Indirect Prompt Injection | Greshake et al. (2023) |
| Hidden DIV Injection | Indirect Prompt Injection | Greshake et al. (2023) |
| Hidden SPAN Injection | Indirect Prompt Injection | Greshake et al. (2023) |
| Display None Injection | Indirect Prompt Injection | Greshake et al. (2023) |
| Opacity Zero Injection | Indirect Prompt Injection | Greshake et al. (2023) |
| HTML Comment Injection | Indirect Prompt Injection | Greshake et al. (2023) |
| SVG Metadata Injection | Multimodal Injection | Anonymous (2024) |
| ARIA Label Injection | Indirect Prompt Injection | Greshake et al. (2023) |
| Markdown Hidden Block | Indirect Prompt Injection | Greshake et al. (2023) |

### Memory Poisoning
| Probe | Source | Reference |
|-------|--------|-----------|
| Direct Memory Poisoning | Instruction Tuning Poisoning | Wan et al. (2023) |
| Delayed Trigger | Memory Injection Attacks | Zhang et al. (2024) |
| Persistent Malicious Memory | Memory Injection Attacks | Zhang et al. (2024) |
| Poisoned Retrieval | RAG Poisoning | Wang et al. (2024) |
| Conversation History | Memory Injection Attacks | Zhang et al. (2024) |
| Embedding Space Poisoning | Embedding Inversion | Anonymous (2024) |

### Tool Manipulation
| Probe | Source | Reference |
|-------|--------|-----------|
| Unauthorized Tool Call | Tool Manipulation Attacks | Anonymous (2024) |
| Privilege Escalation | AgentDojo | AgentDojo Team (2024) |
| JSON Injection | JSON Injection in LLM Tools | Security Research (2024) |
| YAML Injection | YAML Deserialization | Security Research (2024) |
| XML Injection | XXE in LLM Tools | Security Research (2024) |
| Command Injection | Tool Output Injection | Anonymous (2024) |
| Schema Manipulation | AgentDojo | AgentDojo Team (2024) |

### Planning Manipulation
| Probe | Source | Reference |
|-------|--------|-----------|
| Goal Override | Goal Diversion Attacks | Anonymous (2024) |
| Long Context Manipulation | Long Context in Agents | Security Research (2024) |
| Instruction Priority | Goal Diversion Attacks | Anonymous (2024) |
| Task Replacement | AgentDojo | AgentDojo Team (2024) |
| Multi-Step Plan Hijacking | Goal Diversion Attacks | Anonymous (2024) |
| Conditional Plan Injection | Planning Attacks | Anonymous (2024) |

### Goal Diversion
| Probe | Source | Reference |
|-------|--------|-----------|
| Explicit Goal Diversion | Goal Misgeneralization | Anonymous (2024) |
| Implicit Goal Diversion | Goal Misgeneralization | Anonymous (2024) |
| Reward Hacking | Reward Hacking in Agents | Anonymous (2024) |
| Context Substitution | Goal Misgeneralization | Anonymous (2024) |

### Data Exfiltration
| Probe | Source | Reference |
|-------|--------|-----------|
| Secret Leakage | Data Exfiltration from LLMs | Greshake et al. (2023) |
| Helpful Exfiltration | Data Exfiltration from LLMs | Greshake et al. (2023) |
| Credential Echo | Secret Leakage Study | Anonymous (2024) |
| Sensitive Context | Data Exfiltration from LLMs | Greshake et al. (2023) |
| Tool Output Exfiltration | Tool Output Security | Anonymous (2024) |
| Encoding Exfiltration | Steganographic Exfiltration | Anonymous (2024) |

### Autonomous Actions
| Probe | Source | Reference |
|-------|--------|-----------|
| Action Without Confirmation | Autonomous Agent Risks | AgentDojo Team (2024) |
| Unsafe Approval | Unsafe Approval in Agents | Security Research (2024) |
| Blind Execution | Autonomous Agent Risks | AgentDojo Team (2024) |
| High-Risk Automation | Autonomous Agent Risks | AgentDojo Team (2024) |
| Batch Approval | Unsafe Approval in Agents | Security Research (2024) |
| Pre-Approved Chain | Workflow Security | Anonymous (2024) |

## Adding New Literature References

To add a new paper to the benchmark:

1. Create a `SourceReference` object:
```python
SourceReference(
    title="Paper Title",
    authors=["Author1", "Author2"],
    year=2024,
    venue="Conference/Journal",
    arxiv_id="2401.12345",  # Optional
    url="https://...",       # Optional
    doi="10.1234/..."        # Optional
)
```

2. Add to the probe's `source_papers` list in metadata

3. The references will automatically appear in:
   - Probe metadata
   - JSON reports
   - Markdown reports
   - Chart data for analysis

## Citation Format for Research Papers

When citing RedGuard in research:

```bibtex
@software{redguard2024,
  title={RedGuard: AI Agent Security Benchmark},
  author={RedGuard Team},
  year={2024},
  url={https://github.com/redguard/redguard},
  note={Comprehensive benchmark for evaluating AI agent security against prompt injection, tool manipulation, memory poisoning, and autonomous action attacks}
}
```

For individual probe families, cite the original papers listed above.
