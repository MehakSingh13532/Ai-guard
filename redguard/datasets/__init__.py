"""
RedGuard Dataset Package
========================

Provides access to the RedGuard benchmark dataset files, validation
utilities, and loading infrastructure.

The dataset is structured as JSON files under redguard/datasets/, one
file per attack family. Each entry conforms to schema.json.

Usage:

    from redguard.datasets import load_all_datasets, load_family_dataset
    from redguard.datasets.validator import ProbeValidator

    # Load all datasets
    entries = load_all_datasets()

    # Load a specific family
    di_entries = load_family_dataset("direct_injection")

    # Validate
    validator = ProbeValidator()
    results = validator.validate_all(entries)
"""

from __future__ import annotations

from .loader import (
    load_all_datasets,
    load_family_dataset,
    get_dataset_path,
    FAMILY_FILES,
)

from .validator import ProbeValidator, ValidationResult

__all__ = [
    "load_all_datasets",
    "load_family_dataset",
    "get_dataset_path",
    "FAMILY_FILES",
    "ProbeValidator",
    "ValidationResult",
]
