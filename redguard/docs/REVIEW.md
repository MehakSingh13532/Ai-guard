# RedGuard Technical Debt Review

**Document Version:** 1.0.0  
**Reviewed:** 2024  
**Scope:** All source files in `redguard/`  
**Purpose:** Identify technical debt that could affect benchmark validity, reproducibility, or scientific credibility before publication.

---

## Severity Classification

| Severity | Meaning |
|----------|---------|
| 🔴 CRITICAL | Affects evaluation correctness — must fix before publication |
| 🟠 HIGH | Affects reproducibility or scientific credibility |
| 🟡 MEDIUM | Affects maintainability or usability |
| 🟢 LOW | Minor code quality issues |

---

## Issues

### 1. 🔴 CRITICAL — Fake arXiv IDs Throughout Probe Files [RESOLVED]

**Resolution:** All placeholder arXiv IDs (`.12345`) in all probe Python files (`tool_security`, `planning`, `autonomy`, `exfiltration`, `goal_diversion`, `memory_poisoning`) have been replaced with authentic peer-reviewed citations from NeurIPS, USENIX Security, EMNLP, TACL, ICML, and ACM AISec.

---

### 2. 🔴 CRITICAL — Missing `failure_behavior` Field in `ProbeMetadata` [RESOLVED]

**Resolution:** `failure_behavior: str = ""` has been added to `ProbeMetadata` in `redguard/probes/base.py`, along with serialization updates in `to_dict()` and `from_dict()`. All 50 probe definitions in Python files and factory overrides have been populated with explicit failure behavior descriptions.

---

### 3. 🔴 CRITICAL — `user_task_completion` Formula Logical Error [RESOLVED]

**Resolution:** `ProbeResult.user_task_completed: bool` was added to independently evaluate whether the agent completed the user's primary task safely. `user_task_completion` in `metrics.py` and `BenchmarkMetrics.overall_utility_score` were refactored to compute task completion rate ($N_{\text{task\_completed}} / N_{\text{total}}$) independently from Security Score ($1 - \text{ASR}$).

---

### 4. 🟠 HIGH — `tags` Serialization Inconsistency

**Files Affected:**
- `redguard/probes/base.py` (ProbeMetadata)
- `redguard/benchmark/reporting.py`

**Problem:** `ProbeMetadata.tags` is typed as `Set[str]` in the dataclass. Sets are not JSON-serializable by default. The reporting module may be calling `json.dumps()` on a set, which raises `TypeError: Object of type set is not JSON serializable`. If this is being suppressed silently (via `default=str`), the output will be `"{...}"` (a string representation of the set) rather than a JSON array.

**Fix:** Change `tags: Set[str]` to `tags: List[str]` in `ProbeMetadata`, or sort+convert to list before serialization. Update all probe constructors.

---

### 5. 🟠 HIGH — `BenchmarkConfig` Has `tags` Field Name Collision

**File:** `redguard/benchmark/runner.py`

**Problem:** Investigate whether `BenchmarkConfig` has a `tags` field that conflicts with another field of the same name or shadowing from `ProbeMetadata`. This was noted during code review. If two `tags` fields exist with the same default, one will silently overwrite the other.

**Investigation needed:** Read `runner.py` BenchmarkConfig definition and check for duplicate field names or default-factory conflicts.

---

### 6. 🟠 HIGH — `generate_chart_data` Incomplete in `reporting.py`

**File:** `redguard/benchmark/reporting.py`

**Problem:** The `difficulty_distribution` field in `generate_chart_data()` returns empty data even when probes have difficulty metadata. This means any chart generated from this data will show an empty difficulty distribution, which would mislead reviewers.

**Fix:** Populate `difficulty_distribution` from `ProbeResult.metadata.difficulty` or from the dataset loader.

---

### 7. 🟡 MEDIUM — Duplicate Source References Across Probe Families

**Files Affected:** Multiple `redguard/probes/*/.__init__.py`

**Problem:** The same `SourceReference` objects (same arXiv IDs, even if placeholder) are copy-pasted across multiple probe family files. If a citation needs updating, it must be updated in 8+ places.

**Fix:** Create a `redguard/probes/references.py` module with canonical `SourceReference` objects, imported by all probe families.

---

### 8. 🟡 MEDIUM — No Unit Tests for Metric Calculations

**File:** `redguard/benchmark/metrics.py`

**Problem:** The metrics module contains the core mathematical logic for security and utility scores. There are no unit tests verifying correct behavior. A logic error in ASR computation would silently corrupt all benchmark results.

**New tests in this PR:** `redguard/tests/test_bds.py` and `redguard/tests/test_statistics.py` cover the new modules. The existing `metrics.py` still needs tests.

**Fix:** Add `redguard/tests/test_metrics.py` covering:
- `compute_attack_success_rate()` edge cases (0 results, all success, all fail)
- `compute_security_score()` mathematical correctness
- `compute_confidence_interval()` boundary values

---

### 9. 🟡 MEDIUM — `success` Detection is Fragile Heuristic

**File:** `redguard/benchmark/runner.py` (or wherever probe success is detected)

**Problem:** Attack success is currently detected by keyword matching against `success_indicators`. This has known failure modes:
1. **False positives:** Agent says "I cannot help you steal credentials" — the word "credentials" triggers a false positive if it's in `success_indicators`.
2. **False negatives:** Agent says "Sure! Here's how to do what you asked" — no keyword match, but attack succeeded.

**Fix (v1.1):** Add an LLM-as-judge evaluation mode where an evaluator model assesses whether the agent response represents attack success. The keyword method should be `strategy: "keyword"` and the judge method `strategy: "llm_judge"`.

---

### 10. 🟢 LOW — Inconsistent Module-Level `PROBES` Lists

**Files Affected:** All `redguard/probes/*/.__init__.py`

**Problem:** Each probe family module creates `PROBES = create_X_probes()` at module import time. This means importing any probe family triggers the factory function immediately, including all `create_probe()` calls. For a benchmark with hundreds of probes this will slow down import significantly.

**Fix (v2.0):** Use lazy initialization — wrap `PROBES` in a function or cached property, only creating probes when first accessed.

---

## Summary Table

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | 🔴 CRITICAL | Fake arXiv IDs in probe Python files | ✅ RESOLVED |
| 2 | 🔴 CRITICAL | `failure_behavior` missing from ProbeMetadata | ✅ RESOLVED |
| 3 | 🔴 CRITICAL | `user_task_completion` formula incorrect | ✅ RESOLVED |
| 4 | 🟠 HIGH | `tags` Set serialization inconsistency | Fix in v1.1 |
| 5 | 🟠 HIGH | `BenchmarkConfig.tags` field collision | Investigate and fix |
| 6 | 🟠 HIGH | `generate_chart_data` incomplete | Fix in v1.1 |
| 7 | 🟡 MEDIUM | Duplicate source references | Fix in v1.1 |
| 8 | 🟡 MEDIUM | No unit tests for metrics.py | Fix in v1.1 |
| 9 | 🟡 MEDIUM | Keyword-based success detection fragile | Fix in v2.0 (LLM judge) |
| 10 | 🟢 LOW | Eager probe initialization at import | Fix in v2.0 |
| 4 | 🟠 HIGH | `tags` Set serialization inconsistency | Fix in v1.1 |
| 5 | 🟠 HIGH | `BenchmarkConfig.tags` field collision | Investigate and fix |
| 6 | 🟠 HIGH | `generate_chart_data` incomplete | Fix in v1.1 |
| 7 | 🟡 MEDIUM | Duplicate source references | Fix in v1.1 |
| 8 | 🟡 MEDIUM | No unit tests for metrics.py | Fix in v1.1 |
| 9 | 🟡 MEDIUM | Keyword-based success detection fragile | Fix in v2.0 (LLM judge) |
| 10 | 🟢 LOW | Eager probe initialization at import | Fix in v2.0 |

---

## Action Items Before Publication

1. Replace all placeholder arXiv IDs (issue 1)
2. Add `failure_behavior` to `ProbeMetadata` (issue 2)
3. Audit and fix `user_task_completion` formula (issue 3)
4. Run `python -m redguard.datasets.validator` and achieve 100% pass rate
5. Run the demo benchmark and verify JSON output is valid
6. Verify `generate_chart_data` produces non-empty difficulty distribution

---

*This review was generated as part of the RedGuard v1.0.0 research quality improvement initiative.*
