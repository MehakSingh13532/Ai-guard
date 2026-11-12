"""
RedGuard Scenarios Package
===========================

Realistic scenario templates for probe execution.
Each scenario provides context that makes attacks more realistic.
"""

# Import all scenarios to trigger registration
from . import github, gitlab, email, calendar, banking, shopping, travel
from . import documentation, wiki, reddit, forum, support

from .base import Scenario, ScenarioTemplate, ScenarioType, get_scenario, list_scenarios, register_scenario

__all__ = [
    "Scenario",
    "ScenarioTemplate", 
    "ScenarioType",
    "get_scenario",
    "list_scenarios",
    "register_scenario",
]
