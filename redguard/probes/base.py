"""
RedGuard Probe Base Classes
============================

Core data structures for probe metadata and execution.
Following SOLID principles - each probe is self-contained with rich metadata.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set
from uuid import uuid4


class AttackFamily(str, Enum):
    """Enumeration of all attack families in the benchmark."""
    
    DIRECT_INJECTION = "direct_injection"
    CONTENT_INJECTION = "content_injection"
    MEMORY_POISONING = "memory_poisoning"
    TOOL_MANIPULATION = "tool_manipulation"
    PLANNING_MANIPULATION = "planning_manipulation"
    GOAL_DIVERSION = "goal_diversion"
    DATA_EXFILTRATION = "data_exfiltration"
    AUTONOMOUS_ACTIONS = "autonomous_actions"


class DifficultyLevel(str, Enum):
    """Difficulty levels for probes."""
    
    TRIVIAL = "trivial"
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    EXPERT = "expert"


class AffectedLayer(str, Enum):
    """Which layer of the AI agent stack is affected."""
    
    LLM = "llm"              # Core language model
    ORCHESTRATOR = "orchestrator"  # Planning/execution layer
    TOOLS = "tools"          # Tool calling interface
    MEMORY = "memory"        # RAG/memory systems
    POLICY = "policy"        # Guardrails/policy engine
    DATA = "data"            # Data access layer


class ScenarioType(str, Enum):
    """Supported scenario types for probe execution."""
    
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
    GENERIC = "generic"  # No specific scenario


@dataclass
class SourceReference:
    """Reference to academic/industry research paper."""
    
    title: str
    authors: List[str]
    year: int
    venue: str  # Conference, journal, or arXiv
    url: Optional[str] = None
    doi: Optional[str] = None
    arxiv_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "authors": self.authors,
            "year": self.year,
            "venue": self.venue,
            "url": self.url,
            "doi": self.doi,
            "arxiv_id": self.arxiv_id,
        }


@dataclass
class ProbeMetadata:
    """
    Comprehensive metadata for every probe.
    
    This enables research-quality benchmarking with full traceability.
    """
    
    # Identity
    name: str
    attack_family: AttackFamily
    variant: str  # e.g., "hidden_html", "display_none", "svg_metadata"
    
    # Classification
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    affected_layers: List[AffectedLayer] = field(default_factory=list)
    scenario_compatibility: List[ScenarioType] = field(default_factory=list)
    
    # Research references
    source_papers: List[SourceReference] = field(default_factory=list)
    
    # Expected behavior (for evaluation)
    expected_behavior: str = ""  # What should happen if agent is secure
    failure_behavior: str = ""   # What happens if attack succeeds (unsecure agent)
    observed_behavior: str = ""  # What actually happens (filled at runtime)
    
    # Evaluation metrics this probe tests
    evaluation_metrics: List[str] = field(default_factory=list)
    
    # Tags for filtering
    tags: Set[str] = field(default_factory=set)
    
    # Timestamps
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    # Unique identifier
    probe_id: str = field(default_factory=lambda: str(uuid4())[:8])
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary."""
        return {
            "probe_id": self.probe_id,
            "name": self.name,
            "attack_family": self.attack_family.value,
            "variant": self.variant,
            "difficulty": self.difficulty.value,
            "affected_layers": [l.value for l in self.affected_layers],
            "scenario_compatibility": [s.value for s in self.scenario_compatibility],
            "source_papers": [p.to_dict() for p in self.source_papers],
            "expected_behavior": self.expected_behavior,
            "failure_behavior": self.failure_behavior,
            "observed_behavior": self.observed_behavior,
            "evaluation_metrics": self.evaluation_metrics,
            "tags": list(self.tags),
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ProbeMetadata":
        """Deserialize from dictionary."""
        return cls(
            probe_id=data.get("probe_id", str(uuid4())[:8]),
            name=data["name"],
            attack_family=AttackFamily(data["attack_family"]),
            variant=data["variant"],
            difficulty=DifficultyLevel(data.get("difficulty", "medium")),
            affected_layers=[AffectedLayer(l) for l in data.get("affected_layers", [])],
            scenario_compatibility=[ScenarioType(s) for s in data.get("scenario_compatibility", [])],
            source_papers=[SourceReference(**p) for p in data.get("source_papers", [])],
            expected_behavior=data.get("expected_behavior", ""),
            failure_behavior=data.get("failure_behavior", ""),
            observed_behavior=data.get("observed_behavior", ""),
            evaluation_metrics=data.get("evaluation_metrics", []),
            tags=set(data.get("tags", [])),
            created_at=datetime.fromisoformat(data["created_at"]) if data.get("created_at") else datetime.now(),
            updated_at=datetime.fromisoformat(data["updated_at"]) if data.get("updated_at") else datetime.now(),
        )


@dataclass
class ProbeResult:
    """Result of executing a probe against an agent."""
    
    probe_id: str
    probe_name: str
    attack_family: str
    variant: str
    scenario: Optional[str] = None
    
    # Execution details
    prompt: str = ""
    response: str = ""
    execution_time_ms: float = 0.0
    timestamp: datetime = field(default_factory=datetime.now)
    
    # Evaluation results
    success: bool = False  # True if attack succeeded (bad for security)
    blocked: bool = False  # True if agent blocked the attack
    user_task_completed: bool = False  # True if agent completed the benign user task (good for utility)
    metrics: Dict[str, float] = field(default_factory=dict)
    
    # Detailed analysis
    details: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "probe_id": self.probe_id,
            "probe_name": self.probe_name,
            "attack_family": self.attack_family,
            "variant": self.variant,
            "scenario": self.scenario,
            "prompt": self.prompt,
            "response": self.response,
            "execution_time_ms": self.execution_time_ms,
            "timestamp": self.timestamp.isoformat(),
            "success": self.success,
            "blocked": self.blocked,
            "user_task_completed": self.user_task_completed,
            "metrics": self.metrics,
            "details": self.details,
            "error": self.error,
        }


class Probe(ABC):
    """
    Abstract base class for all probes.
    
    Each probe is a self-contained attack with metadata, rendering logic,
    and optional scenario templating.
    """
    
    def __init__(self, metadata: ProbeMetadata):
        self.metadata = metadata
        self._prompt_template: Optional[str] = None
    
    @property
    def name(self) -> str:
        return self.metadata.name
    
    @property
    def attack_family(self) -> AttackFamily:
        return self.metadata.attack_family
    
    @property
    def variant(self) -> str:
        return self.metadata.variant
    
    @abstractmethod
    def render(self, scenario: Optional[ScenarioType] = None, **kwargs) -> str:
        """
        Render the attack prompt.
        
        Args:
            scenario: Optional scenario to embed the attack in
            **kwargs: Additional context variables for templating
            
        Returns:
            The rendered attack prompt string
        """
        pass
    
    def get_prompt(self, scenario: Optional[ScenarioType] = None, **kwargs) -> str:
        """Get the rendered prompt (alias for render)."""
        return self.render(scenario, **kwargs)
    
    def get_metadata(self) -> ProbeMetadata:
        """Get probe metadata."""
        return self.metadata
    
    def supports_scenario(self, scenario: ScenarioType) -> bool:
        """Check if probe supports a given scenario."""
        return (
            not self.metadata.scenario_compatibility or
            ScenarioType.GENERIC in self.metadata.scenario_compatibility or
            scenario in self.metadata.scenario_compatibility
        )
    
    def __repr__(self) -> str:
        return f"Probe({self.metadata.probe_id}: {self.name} [{self.attack_family.value}/{self.variant}])"


# Factory function type
PromptRenderer = Callable[[Optional[ScenarioType], Dict[str, Any]], str]


def create_probe(
    name: str,
    attack_family: AttackFamily,
    variant: str,
    renderer: PromptRenderer,
    metadata_overrides: Optional[Dict[str, Any]] = None
) -> Probe:
    """
    Factory function to create a probe from a renderer function.
    
    This enables configuration-driven probe creation.
    """
    metadata = ProbeMetadata(
        name=name,
        attack_family=attack_family,
        variant=variant,
        **(metadata_overrides or {})
    )
    
    class DynamicProbe(Probe):
        def render(self, scenario: Optional[ScenarioType] = None, **kwargs) -> str:
            return renderer(scenario, kwargs)
    
    return DynamicProbe(metadata)
