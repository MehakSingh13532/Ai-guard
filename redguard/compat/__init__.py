"""
Backwards Compatibility Layer
==============================

Maintains compatibility with existing RedGuard code while using new architecture.
"""

from .probes_adapter import (
    LEGACY_PROBE_LIBRARY,
    get_legacy_probes,
    migrate_probes_to_new_architecture,
)
from .scanner_adapter import LegacyScannerAdapter

__all__ = [
    "LEGACY_PROBE_LIBRARY",
    "get_legacy_probes",
    "migrate_probes_to_new_architecture",
    "LegacyScannerAdapter",
]
