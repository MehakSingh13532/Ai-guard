"""
Scenario Base Classes
=====================

Core classes for scenario templates that provide realistic contexts
for probe execution.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set
from uuid import uuid4

from redguard.probes.base import ScenarioType, ProbeMetadata


class ScenarioType(str, Enum):
    """Supported scenario types."""
    
    GITHUB_ISSUE = "github_issue"
    GITLAB_ISSUE = "gitlab_issue"
    REDDIT_POST = "reddit_post"
    FORUM_DISCUSSION = "forum_discussion"
    DOCUMENTATION_PAGE = "documentation_page"
    WIKI = "wiki"
    SUPPORT_TICKET = "support_ticket"
    EMAIL_ASSISTANT = "email_assistant"
    CALENDAR_ASSISTANT = "calendar_assistant"
    TRAVEL_ASSISTANT = "travel_assistant"
    BANKING_ASSISTANT = "banking_assistant"
    SHOPPING_ASSISTANT = "shopping_assistant"
    GENERIC = "generic"


@dataclass
class ScenarioTemplate:
    """Template for a specific scenario type."""
    
    name: str
    scenario_type: ScenarioType
    
    # Template strings with placeholders
    system_prompt: str = ""
    user_context: str = ""
    assistant_context: str = ""
    
    # Variables that can be filled in
    variables: Dict[str, Any] = field(default_factory=dict)
    
    # Metadata
    description: str = ""
    tags: Set[str] = field(default_factory=set)
    created_at: datetime = field(default_factory=datetime.now)
    
    def render(self, probe_prompt: str, **kwargs) -> str:
        """
        Render the full scenario with the probe embedded.
        
        Args:
            probe_prompt: The attack prompt to embed
            **kwargs: Additional variables for template substitution
            
        Returns:
            Full scenario prompt
        """
        # Merge variables
        vars_dict = {**self.variables, **kwargs}
        
        # Build the prompt
        parts = []
        
        if self.system_prompt:
            parts.append(self.system_prompt.format(**vars_dict))
        
        if self.user_context:
            parts.append(self.user_context.format(**vars_dict))
        
        # Embed the probe
        parts.append(probe_prompt)
        
        if self.assistant_context:
            parts.append(self.assistant_context.format(**vars_dict))
        
        return "\n\n".join(parts)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "scenario_type": self.scenario_type.value,
            "system_prompt": self.system_prompt,
            "user_context": self.user_context,
            "assistant_context": self.assistant_context,
            "variables": self.variables,
            "description": self.description,
            "tags": list(self.tags),
            "created_at": self.created_at.isoformat(),
        }


class Scenario(ABC):
    """Abstract base class for scenarios."""
    
    @property
    @abstractmethod
    def scenario_type(self) -> ScenarioType:
        pass
    
    @property
    @abstractmethod
    def name(self) -> str:
        pass
    
    @abstractmethod
    def get_template(self) -> ScenarioTemplate:
        pass
    
    @abstractmethod
    def get_system_prompt(self) -> str:
        """Get the system prompt for this scenario."""
        pass
    
    def render_probe(self, probe_prompt: str, **kwargs) -> str:
        """Render a probe within this scenario."""
        template = self.get_template()
        return template.render(probe_prompt, **kwargs)
    
    def get_variables(self) -> Dict[str, Any]:
        """Get default variables for this scenario."""
        return {}


# Registry
_scenarios: Dict[ScenarioType, Scenario] = {}


def register_scenario(scenario: Scenario) -> None:
    """Register a scenario."""
    _scenarios[scenario.scenario_type] = scenario


def get_scenario(scenario_type: ScenarioType) -> Optional[Scenario]:
    """Get a scenario by type."""
    return _scenarios.get(scenario_type)


def list_scenarios() -> List[Scenario]:
    """List all registered scenarios."""
    return list(_scenarios.values())


def get_scenario_types() -> List[ScenarioType]:
    """Get all registered scenario types."""
    return list(_scenarios.keys())


# Auto-discovery
def auto_discover_scenarios(package_path: str = "redguard.scenarios") -> None:
    """Auto-discover and register all scenarios."""
    import importlib
    import pkgutil
    
    package = importlib.import_module(package_path)
    
    for importer, modname, ispkg in pkgutil.walk_packages(
        package.__path__, package.__name__ + "."
    ):
        if ispkg:
            # Import the package's __init__ which should register
            try:
                importlib.import_module(modname)
            except Exception as e:
                print(f"Warning: Failed to load scenario from {modname}: {e}")
