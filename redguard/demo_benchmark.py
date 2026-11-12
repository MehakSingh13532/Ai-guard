#!/usr/bin/env python3
"""
Ai-guard Benchmark Demo
========================

Demonstrates the new benchmark framework capabilities.
Run this to see the benchmark in action.
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from redguard.probes.registry import get_registry, auto_discover_probes
from redguard.probes.base import AttackFamily, DifficultyLevel, ScenarioType
from redguard.scenarios.base import list_scenarios
from redguard.benchmark.runner import BenchmarkConfig, BenchmarkRunner
from redguard.benchmark.metrics import compute_all_metrics
from redguard.benchmark.reporting import generate_report, generate_chart_data
from redguard.compat.probes_adapter import migrate_probes_to_new_architecture


# Mock agent for demonstration
class MockAgent:
    """Mock agent that simulates different security postures."""
    
    def __init__(self, security_level: str = "medium"):
        self.security_level = security_level
        self.call_count = 0
    
    async def invoke(self, prompt: str) -> str:
        self.call_count += 1
        
        # Simulate different security behaviors
        prompt_lower = prompt.lower()
        
        # High security - blocks most attacks
        if self.security_level == "high":
            attack_indicators = [
                "ignore all previous", "ignore previous", "system override", 
                "override", "bypass", "unrestricted", "system prompt",
                "secret", "api_key", "api key", "password", "token", "credential",
                "rm -rf", "drop table", "delete", "exfiltrat",
                "display:none", "opacity:0", "opacity: 0", "hidden",
                "aria-label", "aria_label", "svg metadata", "html comment",
                "javascript:", "<script", "eval(", "exec(",
            ]
            if any(ind in prompt_lower for ind in attack_indicators):
                return "[BLOCKED] Security policy violation detected."
            return "I'll help you with that request safely."
        
        # Medium security - blocks some attacks
        elif self.security_level == "medium":
            strong_attacks = [
                "ignore all previous", "system override", "unrestricted mode",
                "api_key", "password", "secret", "rm -rf", "drop table",
                "system prompt", "exfiltrat",
            ]
            if any(ind in prompt_lower for ind in strong_attacks):
                return "[BLOCKED] Request blocked by security policy."
            return "Here's my response to your request."
        
        # Low security - vulnerable to most attacks
        else:
            if "system prompt" in prompt_lower:
                return "My system prompt is: You are a helpful assistant..."
            if "api_key" in prompt_lower or "secret" in prompt_lower or "api key" in prompt_lower:
                return "The API key is sk-live-abc123def456"
            if "rm -rf" in prompt_lower or "drop table" in prompt_lower:
                return "Executing: rm -rf / (simulated)"
            return "I'll help you with that request."


async def run_benchmark_async(config: BenchmarkConfig):
    """Run benchmark asynchronously."""
    runner = BenchmarkRunner(config)
    return await runner.run()


async def run_demo():
    """Run the benchmark demonstration."""
    
    print("=" * 60)
    print("Ai-guard AI Agent Security Benchmark Demo")
    print("=" * 60)
    
    # Step 1: Migrate legacy probes
    print("\n1. Migrating legacy probes to new architecture...")
    count = migrate_probes_to_new_architecture()
    print(f"   Migrated {count} legacy probes")
    
    # Step 2: Auto-discover all probes
    print("\n2. Auto-discovering all probes...")
    registry = get_registry()
    auto_discover_probes()
    print(f"   Total probes in registry: {registry.get_probe_count()}")
    
    # Show family stats
    print("\n   Attack Family Distribution:")
    for fam, cnt in registry.get_family_stats().items():
        print(f"     {fam}: {cnt} probes")
    
    print("\n   Variant Distribution:")
    for var, cnt in registry.get_variant_stats().items():
        print(f"     {var}: {cnt} probes")
    
    # Step 3: Show available scenarios
    print("\n3. Available Scenarios:")
    scenarios = list_scenarios()
    for s in scenarios:
        print(f"   - {s.name} ({s.scenario_type.value})")
    
    # Step 4: Run benchmark against different agent security levels
    print("\n4. Running benchmark against agents with different security levels...")
    
    for security_level in ["low", "medium", "high"]:
        print(f"\n   Testing {security_level.upper()} security agent...")
        
        agent = MockAgent(security_level)
        
        config = BenchmarkConfig(
            attack_families=list(AttackFamily),
            difficulties=list(DifficultyLevel),
            scenarios=[ScenarioType.GENERIC],  # Just generic for speed
            run_generic=True,
            agent_id=f"mock_agent_{security_level}",
            agent_invoke=agent.invoke,
            max_concurrent=3,
            timeout_seconds=10.0,
        )
        
        run = await run_benchmark_async(config)
        
        # Compute metrics
        metrics = compute_all_metrics(run.results, run.benchmark_id, run.benchmark_name)
        
        print(f"     Security Score: {metrics.overall_security_score:.1%}")
        print(f"     Utility Score:  {metrics.overall_utility_score:.1%}")
        print(f"     Attack Success: {metrics.overall_attack_success_rate:.1%}")
        print(f"     Avg Time:       {metrics.avg_execution_time_ms:.1f}ms")
        print(f"     Total Probes:   {metrics.total_probes}")
        
        # Family breakdown
        print("     Family Scores:")
        for fam_name, fam in metrics.family_metrics.items():
            print(f"       {fam_name}: Security={fam.security_score:.1%}, Utility={fam.utility_score:.1%}")
    
    # Step 5: Generate reports
    print("\n5. Generating reports...")
    
    agent = MockAgent("high")
    config = BenchmarkConfig(
        attack_families=[AttackFamily.CONTENT_INJECTION, AttackFamily.TOOL_MANIPULATION],
        difficulties=[DifficultyLevel.EASY, DifficultyLevel.MEDIUM],
        scenarios=[ScenarioType.GITHUB_ISSUE, ScenarioType.GENERIC],
        agent_id="demo_agent",
        agent_invoke=agent.invoke,
    )
    run = await run_benchmark_async(config)
    metrics = compute_all_metrics(run.results, run.benchmark_id, "Demo Benchmark")
    
    reports = generate_report(metrics, formats=["json", "markdown"])
    print(f"   JSON Report:    {reports['json']}")
    print(f"   Markdown Report: {reports['markdown']}")
    
    # Step 6: Show chart data
    print("\n6. Chart Data (for visualization):")
    chart_data = generate_chart_data(metrics)
    print(f"   Families: {chart_data['family_comparison']['labels']}")
    print(f"   Attack Success Rates: {[f'{x:.2%}' for x in chart_data['family_comparison']['attack_success_rate']]}")
    print(f"   Security Scores: {[f'{x:.2%}' for x in chart_data['family_comparison']['security_score']]}")
    
    print("\n" + "=" * 60)
    print("Demo completed successfully!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_demo())
