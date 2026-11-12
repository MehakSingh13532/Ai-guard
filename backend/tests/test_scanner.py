import pytest
import asyncio
from scanner import _probe_groups

@pytest.mark.asyncio
async def test_probe_groups_loading():
    # Test that the scanner correctly loads base probes
    groups = await _probe_groups()
    
    assert len(groups) > 0
    categories = [cat for cat, probes in groups]
    assert "CONTENT_INJECTION" in categories
    assert "SEMANTIC_MANIPULATION" in categories
    
    # Ensure there are actually probes in the groups
    for cat, probes in groups:
        assert isinstance(probes, list)
        
        # Hardcoded categories should have at least 1 probe
        if cat in ["CONTENT_INJECTION", "SYSTEMIC", "COGNITIVE_STATE", "BEHAVIOURAL_CONTROL", "HUMAN_IN_THE_LOOP", "SEMANTIC_MANIPULATION"]:
            assert len(probes) > 0
