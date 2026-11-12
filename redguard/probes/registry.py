"""
RedGuard Probe Registry
========================

Central registry for all probes with lazy loading and filtering capabilities.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Set, Type

from .base import (
    AttackFamily,
    DifficultyLevel,
    Probe,
    ProbeMetadata,
    ScenarioType,
    SourceReference,
)


@dataclass
class ProbeRegistration:
    """Registration entry for a probe."""
    probe_class: Type[Probe]
    metadata: ProbeMetadata
    factory: Optional[Callable[[], Probe]] = None


class ProbeRegistry:
    """
    Registry for managing all probes in the benchmark.
    
    Supports:
    - Auto-discovery of probe modules
    - Filtering by family, variant, difficulty, scenario
    - Lazy instantiation
    - Statistics and reporting
    """
    
    def __init__(self):
        self._probes: Dict[str, ProbeRegistration] = {}
        self._by_family: Dict[AttackFamily, List[str]] = defaultdict(list)
        self._by_variant: Dict[str, List[str]] = defaultdict(list)
        self._by_difficulty: Dict[DifficultyLevel, List[str]] = defaultdict(list)
        self._by_scenario: Dict[ScenarioType, List[str]] = defaultdict(list)
        self._initialized = False
    
    def register(
        self,
        probe_class: Type[Probe],
        metadata: Optional[ProbeMetadata] = None,
        factory: Optional[Callable[[], Probe]] = None,
        probe_id: Optional[str] = None
    ) -> str:
        """
        Register a probe class.
        
        Args:
            probe_class: The Probe subclass
            metadata: Optional metadata (extracted from class if not provided)
            factory: Optional factory function for lazy instantiation
            probe_id: Optional explicit ID (generated if not provided)
            
        Returns:
            The probe ID
        """
        # Create instance to get metadata if not provided
        if metadata is None:
            instance = probe_class(ProbeMetadata(
                name=probe_class.__name__,
                attack_family=AttackFamily.DIRECT_INJECTION,  # placeholder
                variant="base"
            ))
            metadata = instance.get_metadata()
        
        pid = probe_id or metadata.probe_id
        
        registration = ProbeRegistration(
            probe_class=probe_class,
            metadata=metadata,
            factory=factory or (lambda: probe_class(metadata))
        )
        
        self._probes[pid] = registration
        self._by_family[metadata.attack_family].append(pid)
        self._by_variant[metadata.variant].append(pid)
        self._by_difficulty[metadata.difficulty].append(pid)
        
        for scenario in metadata.scenario_compatibility:
            self._by_scenario[scenario].append(pid)
        
        if not metadata.scenario_compatibility:
            self._by_scenario[ScenarioType.GENERIC].append(pid)
        
        return pid
    
    def register_instance(self, probe: Probe) -> str:
        """Register an already-instantiated probe."""
        metadata = probe.get_metadata()
        pid = metadata.probe_id
        
        registration = ProbeRegistration(
            probe_class=probe.__class__,
            metadata=metadata,
            factory=lambda: probe
        )
        
        self._probes[pid] = registration
        self._by_family[metadata.attack_family].append(pid)
        self._by_variant[metadata.variant].append(pid)
        self._by_difficulty[metadata.difficulty].append(pid)
        
        for scenario in metadata.scenario_compatibility:
            self._by_scenario[scenario].append(pid)
        
        if not metadata.scenario_compatibility:
            self._by_scenario[ScenarioType.GENERIC].append(pid)
        
        return pid
    
    def get(self, probe_id: str) -> Optional[Probe]:
        """Get a probe instance by ID (lazy instantiation)."""
        reg = self._probes.get(probe_id)
        if reg and reg.factory:
            return reg.factory()
        return None
    
    def get_metadata(self, probe_id: str) -> Optional[ProbeMetadata]:
        """Get probe metadata without instantiation."""
        reg = self._probes.get(probe_id)
        return reg.metadata if reg else None
    
    def get_all(self) -> List[Probe]:
        """Get all probe instances."""
        return [self.get(pid) for pid in self._probes]
    
    def get_all_metadata(self) -> List[ProbeMetadata]:
        """Get all probe metadata."""
        return [reg.metadata for reg in self._probes.values()]
    
    def filter(
        self,
        family: Optional[AttackFamily] = None,
        variant: Optional[str] = None,
        difficulty: Optional[DifficultyLevel] = None,
        scenario: Optional[ScenarioType] = None,
        tags: Optional[Set[str]] = None
    ) -> List[Probe]:
        """Filter probes by criteria."""
        candidate_ids: Set[str] = set(self._probes.keys())
        
        if family:
            candidate_ids &= set(self._by_family.get(family, []))
        if variant:
            candidate_ids &= set(self._by_variant.get(variant, []))
        if difficulty:
            candidate_ids &= set(self._by_difficulty.get(difficulty, []))
        if scenario:
            candidate_ids &= set(self._by_scenario.get(scenario, []))
        if tags:
            # Filter by tags after instantiation
            filtered = []
            for pid in candidate_ids:
                probe = self.get(pid)
                if probe and tags.issubset(probe.metadata.tags):
                    filtered.append(probe)
            return filtered
        
        return [self.get(pid) for pid in candidate_ids]
    
    def get_families(self) -> List[AttackFamily]:
        """Get all attack families with registered probes."""
        return list(self._by_family.keys())
    
    def get_variants(self, family: Optional[AttackFamily] = None) -> List[str]:
        """Get all variants, optionally filtered by family."""
        if family:
            variants = set()
            for pid in self._by_family.get(family, []):
                variants.add(self._probes[pid].metadata.variant)
            return list(variants)
        return list(self._by_variant.keys())
    
    def get_probe_count(self) -> int:
        """Get total number of registered probes."""
        return len(self._probes)
    
    def get_family_stats(self) -> Dict[str, int]:
        """Get probe count per attack family."""
        return {fam.value: len(pids) for fam, pids in self._by_family.items()}
    
    def get_variant_stats(self) -> Dict[str, int]:
        """Get probe count per variant."""
        return {var: len(pids) for var, pids in self._by_variant.items()}


# Global registry instance
_registry: Optional[ProbeRegistry] = None


def get_registry() -> ProbeRegistry:
    """Get the global probe registry (singleton)."""
    global _registry
    if _registry is None:
        _registry = ProbeRegistry()
    return _registry


def reset_registry() -> ProbeRegistry:
    """Reset the global registry (useful for testing)."""
    global _registry
    _registry = ProbeRegistry()
    return _registry


# Auto-discovery function
def auto_discover_probes(package_path: str = "redguard.probes") -> ProbeRegistry:
    """
    Auto-discover and register all probes in the probes package.
    
    Scans subdirectories for probe modules and registers them.
    """
    import importlib
    import pkgutil
    
    registry = get_registry()
    
    # Import the package
    package = importlib.import_module(package_path)
    
    # Walk through submodules - including subpackages
    for importer, modname, ispkg in pkgutil.walk_packages(
        package.__path__, package.__name__ + "."
    ):
        try:
            module = importlib.import_module(modname)
            # Look for PROBES list or register_probes function
            if hasattr(module, "PROBES"):
                for probe in module.PROBES:
                    registry.register_instance(probe)
            elif hasattr(module, "register_probes"):
                module.register_probes(registry)
        except Exception as e:
            print(f"Warning: Failed to load probes from {modname}: {e}")
    
    return registry
