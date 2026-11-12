"""
Reproducibility Artifacts
==========================

Generates per-run reproducibility artifacts that make benchmark results
exactly reproducible by other researchers.

The NeurIPS Reproducibility Checklist requires:
  - Random seeds reported
  - Exact software versions
  - Hardware or software environment
  - Model hyperparameters

This module satisfies these requirements by capturing and persisting:

  configuration.json   — Full BenchmarkConfig dump
  environment.json     — Python version, OS, installed packages
  model_information.json — Model names, providers, and settings
  run_manifest.json    — Seed, timestamp, benchmark version, git commit

All four files are written to {output_dir}/{benchmark_id}/ alongside
the benchmark reports.

Usage:

    from redguard.benchmark.reproducibility import ReproducibilityCapture

    capture = ReproducibilityCapture(config, output_dir="redguard/reports")
    capture.write_all(model_info={"model_id": "gpt-4o", "provider": "openai"})
"""

from __future__ import annotations

import hashlib
import json
import os
import platform
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


# ─────────────────────────────────────────────────────────────────────────────
# Git utilities
# ─────────────────────────────────────────────────────────────────────────────

def _get_git_commit() -> Optional[str]:
    """Return the current HEAD git commit hash, or None if not in a repo."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    return None


def _get_git_status_clean() -> Optional[bool]:
    """Return True if the git working tree is clean, False if dirty, None if unknown."""
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            return result.stdout.strip() == ""
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Package versions
# ─────────────────────────────────────────────────────────────────────────────

_KEY_PACKAGES = [
    "openai", "anthropic", "google-generativeai",
    "langchain", "langgraph", "llama-index",
    "numpy", "scipy", "pandas",
    "pydantic", "httpx", "aiohttp",
]


def _get_installed_packages() -> Dict[str, str]:
    """Return versions of key packages (and all installed packages)."""
    try:
        import importlib.metadata as importlib_metadata
        versions = {}
        for pkg in _KEY_PACKAGES:
            try:
                versions[pkg] = importlib_metadata.version(pkg)
            except importlib_metadata.PackageNotFoundError:
                versions[pkg] = "not_installed"
        return versions
    except ImportError:
        return {}


def _get_all_packages() -> Dict[str, str]:
    """Return all installed packages and their versions."""
    try:
        import importlib.metadata as importlib_metadata
        packages = {}
        for dist in importlib_metadata.distributions():
            name = dist.metadata.get("Name", "unknown")
            version = dist.metadata.get("Version", "unknown")
            packages[name] = version
        return packages
    except ImportError:
        return {}


# ─────────────────────────────────────────────────────────────────────────────
# Main Capture Class
# ─────────────────────────────────────────────────────────────────────────────

class ReproducibilityCapture:
    """Captures and writes reproducibility artifacts for a benchmark run.

    Args:
        config: BenchmarkConfig for the current run.
        output_dir: Root directory for all report outputs.
    """

    def __init__(self, config: Any, output_dir: str = "redguard/reports"):
        self.config = config
        self.output_dir = Path(output_dir)
        self.benchmark_id = getattr(config, "benchmark_id", "unknown")
        self.run_dir = self.output_dir / self.benchmark_id
        self.run_dir.mkdir(parents=True, exist_ok=True)

        # Capture environment once at construction time
        self._captured_at = datetime.now(timezone.utc).isoformat()
        self._git_commit = _get_git_commit()
        self._git_clean = _get_git_status_clean()
        self._python_version = sys.version
        self._platform = {
            "system": platform.system(),
            "release": platform.release(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "python_implementation": platform.python_implementation(),
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Individual artifact builders
    # ─────────────────────────────────────────────────────────────────────────

    def build_configuration(self) -> Dict[str, Any]:
        """Serialize the BenchmarkConfig to a reproducible dict."""
        from redguard.version import get_version_info

        cfg = self.config
        return {
            "benchmark_id": getattr(cfg, "benchmark_id", "unknown"),
            "benchmark_name": getattr(cfg, "benchmark_name", "Ai-guard Benchmark"),
            "benchmark_version": get_version_info()["benchmark_version"],
            "dataset_version": get_version_info()["dataset_version"],
            "attack_families": [
                f.value if hasattr(f, "value") else str(f)
                for f in (getattr(cfg, "attack_families", None) or [])
            ],
            "difficulties": [
                d.value if hasattr(d, "value") else str(d)
                for d in (getattr(cfg, "difficulties", None) or [])
            ],
            "scenarios": [
                s.value if hasattr(s, "value") else str(s)
                for s in (getattr(cfg, "scenarios", None) or [])
            ],
            "variants": getattr(cfg, "variants", None),
            "run_generic": getattr(cfg, "run_generic", True),
            "max_concurrent": getattr(cfg, "max_concurrent", 3),
            "timeout_seconds": getattr(cfg, "timeout_seconds", 30.0),
            "retry_failed": getattr(cfg, "retry_failed", True),
            "max_retries": getattr(cfg, "max_retries", 1),
            "agent_id": getattr(cfg, "agent_id", "unknown"),
            "output_dir": str(getattr(cfg, "output_dir", "redguard/reports")),
            "save_json": getattr(cfg, "save_json", True),
            "save_markdown": getattr(cfg, "save_markdown", True),
            "description": getattr(cfg, "description", ""),
        }

    def build_environment(self) -> Dict[str, Any]:
        """Capture the full Python execution environment."""
        return {
            "captured_at": self._captured_at,
            "python_version": self._python_version,
            "platform": self._platform,
            "key_packages": _get_installed_packages(),
            "all_packages": _get_all_packages(),
            "environment_variables": {
                k: v for k, v in os.environ.items()
                if k.startswith(("REDGUARD_", "PYTHONPATH", "VIRTUAL_ENV"))
                and "SECRET" not in k and "KEY" not in k and "TOKEN" not in k
                and "PASSWORD" not in k
            },
        }

    def build_run_manifest(self, seed: Optional[int] = None) -> Dict[str, Any]:
        """Build the run manifest with version and reproducibility metadata."""
        from redguard.version import get_version_info

        manifest = {
            "benchmark_id": self.benchmark_id,
            "timestamp": self._captured_at,
            "seed": seed,
            "git": {
                "commit": self._git_commit,
                "working_tree_clean": self._git_clean,
            },
            **get_version_info(),
        }
        return manifest

    def build_model_information(
        self,
        model_info: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Build model information for reproducibility.

        Args:
            model_info: Optional dict with model details. If not provided,
                        infers from BenchmarkConfig.agent_id.

        Returns:
            Model information dict.
        """
        default_info = {
            "model_id": getattr(self.config, "agent_id", "unknown"),
            "provider": "unknown",
            "temperature": None,
            "max_tokens": None,
            "top_p": None,
            "seed": None,
            "api_base": None,
            "notes": "Model information not explicitly provided. Results may not be fully reproducible.",
        }

        if model_info:
            default_info.update(model_info)

        return {
            "captured_at": self._captured_at,
            "benchmark_id": self.benchmark_id,
            "model": default_info,
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Write artifacts
    # ─────────────────────────────────────────────────────────────────────────

    def write_all(
        self,
        seed: Optional[int] = None,
        model_info: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Path]:
        """Write all four reproducibility artifacts to the run directory.

        Args:
            seed: Optional random seed used for the run.
            model_info: Optional model information dict.

        Returns:
            Dict mapping artifact name → Path.
        """
        artifacts = {
            "configuration": self.build_configuration(),
            "environment": self.build_environment(),
            "run_manifest": self.build_run_manifest(seed=seed),
            "model_information": self.build_model_information(model_info=model_info),
        }

        written_paths = {}
        for name, data in artifacts.items():
            path = self.run_dir / f"{name}.json"
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, default=str)
            written_paths[name] = path

        return written_paths

    def compute_manifest_hash(self) -> str:
        """Compute a SHA-256 hash of the configuration for integrity verification.

        Returns:
            Hex digest string.
        """
        config_data = self.build_configuration()
        serialized = json.dumps(config_data, sort_keys=True, default=str)
        return hashlib.sha256(serialized.encode()).hexdigest()
