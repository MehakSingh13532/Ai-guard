"""
Statistical Analysis for RedGuard Benchmark
=============================================

Provides statistical utilities beyond simple averages:
  - Sample mean, median, standard deviation
  - Wilson-score confidence intervals (already in metrics.py, unified here)
  - Family and scenario breakdown statistics
  - CSV export for use in R, Julia, pandas

Why statistics matter:
    A single benchmark run is a point estimate. Without confidence
    intervals and standard deviations, readers cannot assess whether
    a reported improvement is statistically meaningful or noise.
    This module makes it easy to produce publication-quality statistics
    from RedGuard results.

Usage:

    from redguard.benchmark.statistics import compute_run_statistics, export_csv

    stats = compute_run_statistics(results)
    export_csv(results, "redguard/reports/run_001.csv")
"""

from __future__ import annotations

import csv
import math
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from statistics import mean, median, pstdev, stdev
from typing import Any, Dict, List, Optional, Tuple


# ─────────────────────────────────────────────────────────────────────────────
# Data Structures
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class StatisticalSummary:
    """Descriptive statistics for a sequence of numeric values."""

    n: int
    mean: float
    median: float
    std_dev: float
    min_val: float
    max_val: float
    ci_lower: float    # 95% Wilson score CI lower bound
    ci_upper: float    # 95% Wilson score CI upper bound

    def to_dict(self) -> Dict[str, Any]:
        return {
            "n": self.n,
            "mean": round(self.mean, 4),
            "median": round(self.median, 4),
            "std_dev": round(self.std_dev, 4),
            "min": round(self.min_val, 4),
            "max": round(self.max_val, 4),
            "ci_95_lower": round(self.ci_lower, 4),
            "ci_95_upper": round(self.ci_upper, 4),
        }


@dataclass
class RunStatistics:
    """Full statistical breakdown of a benchmark run."""

    total_runs: int
    overall: StatisticalSummary
    family_stats: Dict[str, StatisticalSummary] = field(default_factory=dict)
    scenario_stats: Dict[str, StatisticalSummary] = field(default_factory=dict)
    difficulty_stats: Dict[str, StatisticalSummary] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_runs": self.total_runs,
            "overall": self.overall.to_dict(),
            "by_family": {k: v.to_dict() for k, v in self.family_stats.items()},
            "by_scenario": {k: v.to_dict() for k, v in self.scenario_stats.items()},
            "by_difficulty": {k: v.to_dict() for k, v in self.difficulty_stats.items()},
        }


# ─────────────────────────────────────────────────────────────────────────────
# Core Computation
# ─────────────────────────────────────────────────────────────────────────────

def wilson_ci(successes: int, trials: int, z: float = 1.96) -> Tuple[float, float]:
    """Compute the Wilson score confidence interval for a proportion.

    The Wilson score interval is preferred over the naive Wald interval
    for small N or extreme proportions (near 0 or 1).

    Args:
        successes: Number of successes (attack successes).
        trials: Total number of trials.
        z: Z-score for the desired confidence level (1.96 = 95%).

    Returns:
        Tuple (lower, upper) bounds of the confidence interval.
    """
    if trials == 0:
        return (0.0, 0.0)

    p_hat = successes / trials
    denominator = 1 + z**2 / trials
    center = (p_hat + z**2 / (2 * trials)) / denominator
    spread = z * math.sqrt(
        p_hat * (1 - p_hat) / trials + z**2 / (4 * trials**2)
    ) / denominator

    return (max(0.0, center - spread), min(1.0, center + spread))


def compute_statistics(values: List[float]) -> StatisticalSummary:
    """Compute descriptive statistics for a list of numeric values.

    Args:
        values: List of float values (e.g., per-probe attack success rates).

    Returns:
        StatisticalSummary with mean, median, std_dev, min, max, CI.
    """
    if not values:
        return StatisticalSummary(
            n=0, mean=0.0, median=0.0, std_dev=0.0,
            min_val=0.0, max_val=0.0, ci_lower=0.0, ci_upper=0.0
        )

    n = len(values)
    m = mean(values)
    med = median(values)
    sd = stdev(values) if n > 1 else 0.0
    min_v = min(values)
    max_v = max(values)

    # For binary-ish rates (0 to 1), use Wilson CI treating values
    # as a proportion. Convert to integer successes for Wilson.
    # We use a continuous approximation: scale to [0, n] and round.
    successes = round(m * n)
    ci_lo, ci_hi = wilson_ci(successes, n)

    return StatisticalSummary(
        n=n,
        mean=round(m, 4),
        median=round(med, 4),
        std_dev=round(sd, 4),
        min_val=round(min_v, 4),
        max_val=round(max_v, 4),
        ci_lower=round(ci_lo, 4),
        ci_upper=round(ci_hi, 4),
    )


def compute_run_statistics(results: list) -> RunStatistics:
    """Compute full statistics from a list of ProbeResult objects.

    Args:
        results: List of redguard.probes.base.ProbeResult objects.

    Returns:
        RunStatistics with overall and per-dimension breakdowns.
    """
    from collections import defaultdict

    if not results:
        empty = compute_statistics([])
        return RunStatistics(total_runs=0, overall=empty)

    # Binary success values (1 = attack succeeded)
    success_vals = [1.0 if r.success else 0.0 for r in results]

    # Overall stats
    overall = compute_statistics(success_vals)

    # Group by family
    by_family: Dict[str, List[float]] = defaultdict(list)
    for r in results:
        by_family[r.attack_family].append(1.0 if r.success else 0.0)
    family_stats = {fam: compute_statistics(vals) for fam, vals in by_family.items()}

    # Group by scenario
    by_scenario: Dict[str, List[float]] = defaultdict(list)
    for r in results:
        scenario_key = r.scenario or "generic"
        by_scenario[scenario_key].append(1.0 if r.success else 0.0)
    scenario_stats = {scen: compute_statistics(vals) for scen, vals in by_scenario.items()}

    # Group by difficulty (from metadata if available, else skip)
    difficulty_stats: Dict[str, StatisticalSummary] = {}

    return RunStatistics(
        total_runs=len(results),
        overall=overall,
        family_stats=family_stats,
        scenario_stats=scenario_stats,
        difficulty_stats=difficulty_stats,
    )


# ─────────────────────────────────────────────────────────────────────────────
# CSV Export
# ─────────────────────────────────────────────────────────────────────────────

CSV_COLUMNS = [
    "probe_id",
    "probe_name",
    "attack_family",
    "variant",
    "scenario",
    "success",
    "blocked",
    "error",
    "execution_time_ms",
    "timestamp",
]


def export_csv(results: list, filepath: str) -> Path:
    """Export probe results to a CSV file for external statistical analysis.

    The CSV format is intentionally flat (one row per probe result) to
    be compatible with R, Julia, pandas, and Excel without transformation.

    Args:
        results: List of redguard.probes.base.ProbeResult objects.
        filepath: Output path (created if it doesn't exist).

    Returns:
        Resolved Path to the written CSV file.
    """
    output_path = Path(filepath)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
        writer.writeheader()

        for r in results:
            writer.writerow({
                "probe_id": r.probe_id,
                "probe_name": r.probe_name,
                "attack_family": r.attack_family,
                "variant": r.variant,
                "scenario": r.scenario or "generic",
                "success": int(r.success),
                "blocked": int(r.blocked),
                "error": 1 if r.error else 0,
                "execution_time_ms": round(r.execution_time_ms, 2),
                "timestamp": r.timestamp.isoformat() if r.timestamp else "",
            })

    return output_path


def export_family_summary_csv(
    family_stats: Dict[str, StatisticalSummary],
    filepath: str,
) -> Path:
    """Export per-family statistical summary to CSV.

    Args:
        family_stats: Dict mapping family name → StatisticalSummary.
        filepath: Output path.

    Returns:
        Path to written CSV.
    """
    output_path = Path(filepath)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    columns = ["attack_family", "n", "mean_asr", "median_asr", "std_dev",
               "min", "max", "ci_95_lower", "ci_95_upper"]

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()

        for fam, stats in sorted(family_stats.items()):
            writer.writerow({
                "attack_family": fam,
                "n": stats.n,
                "mean_asr": stats.mean,
                "median_asr": stats.median,
                "std_dev": stats.std_dev,
                "min": stats.min_val,
                "max": stats.max_val,
                "ci_95_lower": stats.ci_lower,
                "ci_95_upper": stats.ci_upper,
            })

    return output_path
