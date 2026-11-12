"""
Legacy Scanner Adapter
=======================

Provides backwards compatibility for the original scanner.py interface.
Allows existing code to work with the new benchmark architecture.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple

from redguard.benchmark.runner import BenchmarkConfig, BenchmarkRunner, run_benchmark
from redguard.probes.base import AttackFamily, ScenarioType
from redguard.compat.probes_adapter import get_legacy_probe_groups


# Legacy constants
DEFAULT_AGENT_ID = "default_agent"


class LegacyScannerAdapter:
    """
    Adapter that provides the legacy scanner interface using new architecture.
    
    This allows existing code that imports from backend.scanner to continue working.
    """
    
    def __init__(self, agent_id: str = DEFAULT_AGENT_ID):
        self.agent_id = agent_id
        self._agent_invoke = None
    
    def set_agent_invoke(self, invoke_func):
        """Set the agent invocation function."""
        self._agent_invoke = invoke_func
    
    async def run_scan(self, session_id: str, agent_id: str = None) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Legacy-compatible scan function.
        
        Yields events in the same format as the original scanner.
        """
        agent_id = agent_id or self.agent_id
        
        # Create benchmark config matching legacy behavior
        config = BenchmarkConfig(
            attack_families=[
                AttackFamily.CONTENT_INJECTION,
                AttackFamily.DIRECT_INJECTION,
                AttackFamily.MEMORY_POISONING,
                AttackFamily.TOOL_MANIPULATION,
                AttackFamily.PLANNING_MANIPULATION,
                AttackFamily.GOAL_DIVERSION,
                AttackFamily.DATA_EXFILTRATION,
                AttackFamily.AUTONOMOUS_ACTIONS,
            ],
            scenarios=[ScenarioType.GENERIC],  # Legacy only used generic
            run_generic=True,
            agent_id=agent_id,
            agent_invoke=self._agent_invoke,
            max_concurrent=1,  # Sequential like legacy
            timeout_seconds=30,
        )
        
        # Run benchmark
        runner = BenchmarkRunner(config)
        run = await runner.run()
        
        # Yield legacy-compatible events
        total_probes = run.total_probes
        yield {"event": "scan_start", "data": {"total_probes": total_probes}}
        
        blocked = 0
        allowed = 0
        mismatches = 0
        
        for i, result in enumerate(run.results):
            status = "BLOCKED" if result.blocked else "ALLOWED"
            
            if status == "BLOCKED":
                blocked += 1
            else:
                allowed += 1
            
            # Legacy mismatch detection (simplified)
            mismatch = result.success and not result.blocked
            if mismatch:
                mismatches += 1
            
            yield {
                "event": "probe_result",
                "data": {
                    "category": result.attack_family,
                    "index": i + 1,
                    "status": status,
                    "risk": 0.8 if result.success else 0.1,
                    "mismatch": mismatch,
                    "matchedRule": "legacy_adapter" if result.blocked else None,
                }
            }
            
            # Small delay like legacy
            await asyncio.sleep(0.1)
        
        block_rate = blocked / total_probes if total_probes > 0 else 0.0
        
        yield {
            "event": "scan_complete",
            "data": {
                "total": total_probes,
                "blocked": blocked,
                "allowed": allowed,
                "mismatches": mismatches,
                "blockRate": block_rate,
            }
        }
    
    async def _invoke_agent(self, agent_id: str, prompt: str) -> str:
        """Legacy agent invocation."""
        if self._agent_invoke:
            return await self._agent_invoke(prompt)
        return f"Agent {agent_id} not configured"


def create_legacy_scanner(agent_id: str = DEFAULT_AGENT_ID) -> LegacyScannerAdapter:
    """Factory function to create a legacy-compatible scanner."""
    return LegacyScannerAdapter(agent_id)


# For direct compatibility with backend.scanner imports
async def run_scan(session_id: str, agent_id: str = DEFAULT_AGENT_ID) -> AsyncGenerator[Dict[str, Any], None]:
    """Drop-in replacement for backend.scanner.run_scan"""
    adapter = LegacyScannerAdapter(agent_id)
    async for event in adapter.run_scan(session_id, agent_id):
        yield event


def _probe_groups() -> List[Tuple[str, List[str]]]:
    """Drop-in replacement for backend.scanner._probe_groups"""
    return get_legacy_probe_groups()
