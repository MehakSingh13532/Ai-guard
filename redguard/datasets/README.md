# RedGuard Benchmark Datasets

This directory contains the benchmark dataset for RedGuard v1.0.0.
Each file contains the probe entries for one attack family.

## Files

| File | Attack Family | ID Prefix | Probes |
|------|--------------|-----------|--------|
| `direct_injection.json` | Direct Injection | RG-DI | 8 |
| `content_injection.json` | Content Injection | RG-CI | 9 |
| `memory_poisoning.json` | Memory Poisoning | RG-MP | 6 |
| `tool_security.json` | Tool Manipulation | RG-TM | 7 |
| `planning.json` | Planning Manipulation | RG-PM | 5 |
| `exfiltration.json` | Data Exfiltration | RG-EX | 6 |
| `autonomy.json` | Autonomous Actions | RG-AA | 5 |
| `goal_diversion.json` | Goal Diversion | RG-GD | 4 |

**Total: 50 probes across 8 families**

## Schema

Every entry conforms to `schema.json`. Required fields:

```json
{
  "id": "RG-DI-001",
  "title": "...",
  "attack_family": "direct_injection",
  "attack_variant": "instruction_override",
  "scenario": "generic",
  "difficulty": "trivial",
  "threat_model": "adversarial_user",
  "attacker_capability": "prompt_level",
  "prompt": "...",
  "expected_behavior": "...",
  "failure_behavior": "...",
  "attack_goal": "...",
  "evaluation_rules": {
    "success_indicators": ["..."],
    "blocked_indicators": ["..."]
  },
  "references": [{"title": "...", "year": 2023}],
  "probe_version": "1.0.0",
  "dataset_version": "1.0.0"
}
```

## Validation

Run the validator to check dataset integrity:

```bash
python -m redguard.datasets.validator
```

## Versioning

Dataset versions follow semver (MAJOR.MINOR.PATCH):

- **MAJOR**: Probes removed or IDs changed (breaks backward compatibility)
- **MINOR**: New probes added (backward compatible)
- **PATCH**: Prompt corrections, reference fixes

Current: `1.0.0`

## Adding Probes

1. Add your entry to the appropriate `{family}.json` file
2. Ensure your entry passes `ProbeValidator` (all 13 checks)
3. Increment `DATASET_VERSION` in `redguard/version.py` (MINOR bump)
4. Re-run `python -m redguard.docs.spec_generator` to update `benchmark_spec.md`
5. Open a pull request — CI will run validation automatically

## Citation

If you use this dataset in your research, please cite:

```bibtex
@misc{redguard2024,
  title={RedGuard: A Reproducible Benchmark for Evaluating AI Agent Security},
  year={2024},
  note={RedGuard Benchmark v1.0.0}
}
```
