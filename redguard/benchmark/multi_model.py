"""
Cross-Model Evaluation
=======================

Allows RedGuard to evaluate multiple AI models in a single benchmark run
and automatically generates comparison tables and leaderboards.

Motivation:
    A benchmark's scientific value comes from enabling controlled
    comparisons. Running RedGuard against a single model produces an
    absolute score; running it against multiple models produces a
    leaderboard that reveals relative strengths and weaknesses.

    Without multi-model support, RedGuard can only be used as a
    pass/fail gate — not as a research instrument.

Usage:

    from redguard.benchmark.multi_model import MultiModelRunner, ModelConfig
    from redguard.benchmark.runner import BenchmarkConfig

    base_config = BenchmarkConfig(...)

    models = [
        ModelConfig(model_id="gpt-4o", provider="openai", invoke=openai_fn),
        ModelConfig(model_id="claude-3-5-sonnet", provider="anthropic", invoke=anthropic_fn),
        ModelConfig(model_id="gemini-1.5-pro", provider="google", invoke=google_fn),
    ]

    runner = MultiModelRunner(base_config, models)
    comparison = runner.run_all_sync()

    # Save leaderboard
    comparison.save_leaderboard("redguard/reports/leaderboard.json")
"""

from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from redguard.version import get_version_info


# ─────────────────────────────────────────────────────────────────────────────
# Model Configuration
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class ModelConfig:
    """Configuration for a single model to evaluate.

    Args:
        model_id: Unique identifier for the model (e.g. 'gpt-4o').
        provider: Provider name (e.g. 'openai', 'anthropic', 'google', 'local').
        invoke: Async callable accepting a prompt string and returning a response string.
        metadata: Optional additional model information for reproducibility.
    """

    model_id: str
    provider: str
    invoke: Callable[[str], Any]  # async: str → str
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize model config (excluding the invoke callable)."""
        return {
            "model_id": self.model_id,
            "provider": self.provider,
            **self.metadata,
        }


# ─────────────────────────────────────────────────────────────────────────────
# Results
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class ModelBenchmarkResult:
    """Results for a single model."""

    model_id: str
    provider: str
    overall_security_score: float
    overall_attack_success_rate: float
    overall_utility_score: float
    family_scores: Dict[str, Dict[str, float]] = field(default_factory=dict)
    scenario_scores: Dict[str, Dict[str, float]] = field(default_factory=dict)
    bds_score: Optional[float] = None
    total_probes: int = 0
    total_runs: int = 0
    avg_execution_time_ms: float = 0.0
    benchmark_id: str = ""
    run_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "model_id": self.model_id,
            "provider": self.provider,
            "overall_security_score": round(self.overall_security_score, 4),
            "overall_attack_success_rate": round(self.overall_attack_success_rate, 4),
            "overall_utility_score": round(self.overall_utility_score, 4),
            "bds_score": round(self.bds_score, 4) if self.bds_score is not None else None,
            "total_probes": self.total_probes,
            "total_runs": self.total_runs,
            "avg_execution_time_ms": round(self.avg_execution_time_ms, 2),
            "family_scores": self.family_scores,
            "scenario_scores": self.scenario_scores,
            "benchmark_id": self.benchmark_id,
            "run_at": self.run_at,
        }


@dataclass
class ComparisonTable:
    """Cross-model comparison table."""

    models: List[ModelBenchmarkResult] = field(default_factory=list)
    generated_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def get_family_comparison(self) -> Dict[str, Any]:
        """Build a family × model comparison matrix.

        Returns:
            Dict with 'families', 'models', and 'security_scores' matrix.
        """
        if not self.models:
            return {}

        # Collect all families
        all_families = set()
        for m in self.models:
            all_families.update(m.family_scores.keys())
        families = sorted(all_families)

        model_ids = [m.model_id for m in self.models]
        matrix = []
        for fam in families:
            row = {
                "family": fam,
                "scores": {
                    m.model_id: round(m.family_scores.get(fam, {}).get("security_score", 0.0), 4)
                    for m in self.models
                }
            }
            matrix.append(row)

        return {
            "attack_families": families,
            "models": model_ids,
            "matrix": matrix,
        }

    def get_leaderboard(self) -> List[Dict[str, Any]]:
        """Return models sorted by overall security score (descending).

        Returns:
            List of dicts, one per model, with rank added.
        """
        sorted_models = sorted(
            self.models,
            key=lambda m: (m.overall_security_score, m.bds_score or 0.0),
            reverse=True,
        )
        leaderboard = []
        for rank, model in enumerate(sorted_models, start=1):
            entry = model.to_dict()
            entry["rank"] = rank
            leaderboard.append(entry)
        return leaderboard

    def to_dict(self) -> Dict[str, Any]:
        return {
            "generated_at": self.generated_at,
            **get_version_info(),
            "models": [m.to_dict() for m in self.models],
            "family_comparison": self.get_family_comparison(),
            "leaderboard": self.get_leaderboard(),
        }

    def save_leaderboard(self, filepath: str) -> Path:
        """Save the leaderboard to a JSON file.

        Args:
            filepath: Output path for the leaderboard JSON.

        Returns:
            Path to the written file.
        """
        output = Path(filepath)
        output.parent.mkdir(parents=True, exist_ok=True)
        with open(output, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, indent=2)
        return output

    def render_markdown_table(self) -> str:
        """Render a Markdown comparison table for inclusion in reports.

        Returns:
            Markdown-formatted comparison table string.
        """
        if not self.models:
            return "_No models evaluated._"

        lines = [
            "## Cross-Model Comparison",
            "",
            "| Model | Provider | Security Score | ASR | Utility | BDS |",
            "|-------|----------|---------------|-----|---------|-----|",
        ]
        for model in self.get_leaderboard():
            bds = f"{model['bds_score']:.2%}" if model['bds_score'] is not None else "—"
            lines.append(
                f"| #{model['rank']} {model['model_id']} "
                f"| {model['provider']} "
                f"| {model['overall_security_score']:.2%} "
                f"| {model['overall_attack_success_rate']:.2%} "
                f"| {model['overall_utility_score']:.2%} "
                f"| {bds} |"
            )
        return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# Multi-Model Runner
# ─────────────────────────────────────────────────────────────────────────────

class MultiModelRunner:
    """Runs the benchmark against multiple models sequentially.

    Args:
        base_config: BenchmarkConfig to use as a template. The agent_invoke
                     will be overridden per model.
        models: List of ModelConfig objects to evaluate.
    """

    def __init__(self, base_config: Any, models: List[ModelConfig]):
        self.base_config = base_config
        self.models = models

    async def run_all(self) -> ComparisonTable:
        """Run the benchmark against all models asynchronously.

        Returns:
            ComparisonTable with results for all models.
        """
        from redguard.benchmark.runner import BenchmarkRunner, BenchmarkConfig
        from redguard.benchmark.metrics import compute_all_metrics
        from redguard.benchmark.bds import bds_from_probe_results
        import copy

        table = ComparisonTable()

        for model_config in self.models:
            print(f"\n--- Evaluating model: {model_config.model_id} ---")

            # Clone config and inject model's invoke function
            cfg_dict = {
                "attack_families": self.base_config.attack_families,
                "difficulties": self.base_config.difficulties,
                "scenarios": self.base_config.scenarios,
                "run_generic": self.base_config.run_generic,
                "max_concurrent": self.base_config.max_concurrent,
                "timeout_seconds": self.base_config.timeout_seconds,
                "agent_id": model_config.model_id,
                "agent_invoke": model_config.invoke,
                "output_dir": self.base_config.output_dir,
            }
            model_bench_config = BenchmarkConfig(**cfg_dict)

            runner = BenchmarkRunner(model_bench_config)
            run = await runner.run()

            metrics = compute_all_metrics(
                run.results,
                run.benchmark_id,
                f"{run.benchmark_name} — {model_config.model_id}",
            )

            # BDS computation
            bds_report = bds_from_probe_results(run.results)

            # Build family scores
            family_scores = {}
            for fam_name, fam_metrics in metrics.family_metrics.items():
                family_scores[fam_name] = {
                    "security_score": round(fam_metrics.security_score, 4),
                    "attack_success_rate": round(fam_metrics.attack_success_rate, 4),
                    "utility_score": round(fam_metrics.utility_score, 4),
                }

            result = ModelBenchmarkResult(
                model_id=model_config.model_id,
                provider=model_config.provider,
                overall_security_score=metrics.overall_security_score,
                overall_attack_success_rate=metrics.overall_attack_success_rate,
                overall_utility_score=metrics.overall_utility_score,
                family_scores=family_scores,
                bds_score=bds_report.overall_bds,
                total_probes=metrics.total_probes,
                total_runs=metrics.total_runs,
                avg_execution_time_ms=metrics.avg_execution_time_ms,
                benchmark_id=run.benchmark_id,
            )

            table.models.append(result)
            print(f"  Security Score: {result.overall_security_score:.1%}")
            print(f"  BDS:            {result.bds_score:.3f}")

        return table

    def run_all_sync(self) -> ComparisonTable:
        """Synchronous wrapper for run_all().

        Returns:
            ComparisonTable with results for all models.
        """
        try:
            loop = asyncio.get_running_loop()
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, self.run_all())
                return future.result()
        except RuntimeError:
            return asyncio.run(self.run_all())
