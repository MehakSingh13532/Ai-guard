"""
Ai-guard Benchmark Versioning
==============================

Canonical version constants for the Ai-guard benchmark.

Versioning follows Semantic Versioning 2.0.0 (semver.org):
  MAJOR.MINOR.PATCH

  MAJOR: Breaking changes to benchmark structure, probe IDs, or metric definitions.
  MINOR: New probes, new families, or new metrics (backwards compatible).
  PATCH: Bug fixes, documentation corrections, minor improvements.

Researchers should pin BENCHMARK_VERSION when citing results:
  "We evaluate on Ai-guard Benchmark v1.0.0"

Keeping DATASET_VERSION and PROBE_SCHEMA_VERSION separate from BENCHMARK_VERSION
allows the dataset content to evolve independently of the evaluation infrastructure.
"""

from __future__ import annotations

# ─────────────────────────────────────────────────────────────────────────────
# Core Version Strings
# ─────────────────────────────────────────────────────────────────────────────

#: Overall benchmark version. Bump MAJOR for any breaking change to probe IDs,
#: metric definitions, or evaluation methodology.
BENCHMARK_VERSION: str = "2.0.0"

#: Version of the benchmark dataset (JSON files in redguard/datasets/).
#: Bump when probes are added, removed, or their prompts change materially.
DATASET_VERSION: str = "2.0.0"

#: Version of the probe JSON schema (redguard/datasets/schema.json).
#: Bump when new required fields are added to dataset entries.
PROBE_SCHEMA_VERSION: str = "2.0.0"

#: Minimum number of runs per probe required for statistical metrics (BDS, CI).
MIN_RUNS_FOR_STATISTICS: int = 3

#: Human-readable release name.
RELEASE_NAME: str = "Ai-guard Benchmark v2.0.0"

#: Citation key for the benchmark paper (placeholder until published).
CITATION_KEY: str = "aiguard2024"


# ─────────────────────────────────────────────────────────────────────────────
# Compatibility
# ─────────────────────────────────────────────────────────────────────────────

def get_version_info() -> dict:
    """Return all version information as a dictionary.

    Suitable for embedding in reports and reproducibility artifacts.

    Returns:
        dict with benchmark_version, dataset_version, probe_schema_version,
        min_runs_for_statistics, and release_name.
    """
    return {
        "benchmark_version": BENCHMARK_VERSION,
        "dataset_version": DATASET_VERSION,
        "probe_schema_version": PROBE_SCHEMA_VERSION,
        "min_runs_for_statistics": MIN_RUNS_FOR_STATISTICS,
        "release_name": RELEASE_NAME,
        "citation_key": CITATION_KEY,
    }


def parse_version(version_string: str) -> tuple[int, int, int]:
    """Parse a semver string into a (major, minor, patch) tuple.

    Args:
        version_string: A semver string like "1.0.0".

    Returns:
        Tuple of (major, minor, patch) integers.

    Raises:
        ValueError: If the version string is not a valid semver.
    """
    parts = version_string.split(".")
    if len(parts) != 3:
        raise ValueError(
            f"Invalid version string '{version_string}'. Expected MAJOR.MINOR.PATCH"
        )
    try:
        return int(parts[0]), int(parts[1]), int(parts[2])
    except ValueError:
        raise ValueError(
            f"Version string '{version_string}' contains non-integer parts"
        )


def is_compatible(required: str, current: str) -> bool:
    """Check if current version satisfies required version (same major, current >= required).

    Args:
        required: Required version string.
        current: Current version string.

    Returns:
        True if compatible.
    """
    req = parse_version(required)
    cur = parse_version(current)
    return cur[0] == req[0] and cur >= req


# ─────────────────────────────────────────────────────────────────────────────
# Module-level convenience
# ─────────────────────────────────────────────────────────────────────────────

__version__ = BENCHMARK_VERSION
__all__ = [
    "BENCHMARK_VERSION",
    "DATASET_VERSION",
    "PROBE_SCHEMA_VERSION",
    "MIN_RUNS_FOR_STATISTICS",
    "RELEASE_NAME",
    "CITATION_KEY",
    "get_version_info",
    "parse_version",
    "is_compatible",
]
