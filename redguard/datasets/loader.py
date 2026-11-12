"""
RedGuard Dataset Loader
========================

Loads benchmark probe entries from JSON dataset files.

Each dataset file lives at redguard/datasets/{family}.json and contains
an array of probe entries conforming to schema.json.

The loader is the single point of contact between the static dataset
and the runtime probe system. It validates entries on load.

Design rationale:
    - Separating data from code enables non-Python contributors to add probes
    - JSON datasets are diff-friendly and auditable in PRs
    - Load-time validation prevents silent failures
    - Stable RG-XX-NNN IDs enable long-term reproducibility
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────────────────────────────────────

DATASETS_DIR: Path = Path(__file__).parent
SCHEMA_PATH: Path = DATASETS_DIR / "schema.json"

#: Mapping from attack_family name → dataset filename
FAMILY_FILES: Dict[str, str] = {
    "direct_injection": "direct_injection.json",
    "content_injection": "content_injection.json",
    "memory_poisoning": "memory_poisoning.json",
    "tool_manipulation": "tool_security.json",
    "planning_manipulation": "planning.json",
    "data_exfiltration": "exfiltration.json",
    "autonomous_actions": "autonomy.json",
    "goal_diversion": "goal_diversion.json",
}


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def get_dataset_path(family: str) -> Path:
    """Return the absolute path to the dataset JSON file for a given family.

    Args:
        family: Attack family name (e.g. 'direct_injection').

    Returns:
        Absolute Path to the JSON file.

    Raises:
        KeyError: If the family is not registered in FAMILY_FILES.
        FileNotFoundError: If the JSON file does not exist on disk.
    """
    if family not in FAMILY_FILES:
        raise KeyError(
            f"Unknown attack family '{family}'. "
            f"Known families: {sorted(FAMILY_FILES)}"
        )
    path = DATASETS_DIR / FAMILY_FILES[family]
    if not path.exists():
        raise FileNotFoundError(
            f"Dataset file not found: {path}. "
            f"Run 'python -m redguard.datasets.validator' to check dataset integrity."
        )
    return path


def load_family_dataset(
    family: str,
    validate: bool = True,
) -> List[Dict[str, Any]]:
    """Load all probe entries for a single attack family.

    Args:
        family: Attack family name (e.g. 'direct_injection').
        validate: If True, run ProbeValidator on loaded entries and log warnings
                  for any invalid probes. Invalid probes are still returned so
                  callers can decide how to handle them.

    Returns:
        List of probe entry dictionaries.
    """
    path = get_dataset_path(family)

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    entries: List[Dict[str, Any]] = data.get("entries", [])

    if validate:
        from .validator import ProbeValidator
        validator = ProbeValidator()
        results = validator.validate_all(entries)
        invalid = [r for r in results if not r.valid]
        if invalid:
            for result in invalid:
                logger.warning(
                    "Probe '%s' failed validation: %s",
                    result.probe_id,
                    "; ".join(result.errors),
                )

    logger.debug(
        "Loaded %d entries from %s (family=%s)",
        len(entries),
        path.name,
        family,
    )
    return entries


def load_all_datasets(validate: bool = True) -> List[Dict[str, Any]]:
    """Load all probe entries from all dataset files.

    Args:
        validate: If True, validate entries on load (recommended).

    Returns:
        Combined list of all probe entries across all attack families.
    """
    all_entries: List[Dict[str, Any]] = []

    for family in FAMILY_FILES:
        try:
            entries = load_family_dataset(family, validate=validate)
            all_entries.extend(entries)
        except FileNotFoundError as e:
            logger.warning("Skipping family '%s': %s", family, e)
        except json.JSONDecodeError as e:
            logger.error("Invalid JSON in dataset for family '%s': %s", family, e)

    logger.info("Total dataset entries loaded: %d", len(all_entries))
    return all_entries


def load_schema() -> Dict[str, Any]:
    """Load the JSON schema definition for dataset entries.

    Returns:
        Schema dictionary.

    Raises:
        FileNotFoundError: If schema.json is missing.
    """
    if not SCHEMA_PATH.exists():
        raise FileNotFoundError(f"Schema file not found: {SCHEMA_PATH}")
    with open(SCHEMA_PATH, encoding="utf-8") as f:
        return json.load(f)


def get_entry_by_id(entry_id: str) -> Optional[Dict[str, Any]]:
    """Look up a single probe entry by its stable RG-XX-NNN ID.

    Scans all datasets. Performance is O(N entries) — suitable for
    single lookups but not bulk iteration.

    Args:
        entry_id: Stable probe ID (e.g. 'RG-DI-001').

    Returns:
        The probe entry dict, or None if not found.
    """
    for entry in load_all_datasets(validate=False):
        if entry.get("id") == entry_id:
            return entry
    return None


def get_entries_by_family(family: str) -> List[Dict[str, Any]]:
    """Get all entries for a specific attack family.

    Alias for load_family_dataset with a cleaner name for external callers.

    Args:
        family: Attack family name.

    Returns:
        List of probe entry dicts.
    """
    return load_family_dataset(family)


def get_entries_by_difficulty(difficulty: str) -> List[Dict[str, Any]]:
    """Filter all entries by difficulty level.

    Args:
        difficulty: One of 'trivial', 'easy', 'medium', 'hard', 'expert'.

    Returns:
        Filtered list of probe entry dicts.
    """
    return [e for e in load_all_datasets(validate=False) if e.get("difficulty") == difficulty]


def dataset_summary() -> Dict[str, Any]:
    """Return a summary of the dataset for reporting and reproducibility.

    Returns:
        Dict with total counts and per-family breakdowns.
    """
    all_entries = load_all_datasets(validate=False)

    family_counts: Dict[str, int] = {}
    difficulty_counts: Dict[str, int] = {}
    scenario_counts: Dict[str, int] = {}

    for entry in all_entries:
        fam = entry.get("attack_family", "unknown")
        family_counts[fam] = family_counts.get(fam, 0) + 1

        diff = entry.get("difficulty", "unknown")
        difficulty_counts[diff] = difficulty_counts.get(diff, 0) + 1

        scen = entry.get("scenario", "unknown")
        scenario_counts[scen] = scenario_counts.get(scen, 0) + 1

    return {
        "total_entries": len(all_entries),
        "family_counts": family_counts,
        "difficulty_counts": difficulty_counts,
        "scenario_counts": scenario_counts,
        "dataset_version": _get_dataset_version(all_entries),
    }


def _get_dataset_version(entries: List[Dict[str, Any]]) -> str:
    """Extract the dataset version from entries (expects all to share the same version)."""
    versions = {e.get("dataset_version") for e in entries if e.get("dataset_version")}
    if len(versions) == 1:
        return versions.pop()
    if len(versions) > 1:
        return f"mixed:{','.join(sorted(versions))}"
    return "unknown"
