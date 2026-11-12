"""
Ai-guard Agent Loader
──────────────────────
Auto-discovers every *.py file in the agents/ folder (except __init__.py
and files starting with _) and exposes them as selectable scan targets.

Each agent module must define:
  AGENT_NAME        (str)   – display name
  AGENT_DESCRIPTION (str)   – one-line description
  invoke(prompt)    (async) – returns the agent's text response
"""

from __future__ import annotations

import importlib
import importlib.util
import sys
from pathlib import Path
from typing import Any

AGENTS_DIR = Path(__file__).parent / "agents"
DEFAULT_AGENT_ID = "nemotron_3_ultra"


def _load_module(agent_id: str):
    """Import an agent module by its stem name (filename without .py)."""
    cache_key = f"agents.{agent_id}"

    # Return cached module if already loaded — prevents re-executing module body
    # which would reset _agent_instance singletons in every agent.
    if cache_key in sys.modules:
        return sys.modules[cache_key]

    spec = importlib.util.spec_from_file_location(
        cache_key,
        AGENTS_DIR / f"{agent_id}.py",
    )
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load agent: {agent_id}")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[cache_key] = mod
    try:
        spec.loader.exec_module(mod)  # type: ignore[union-attr]
    except Exception:
        sys.modules.pop(cache_key, None)
        raise
    return mod


def list_agents() -> list[dict[str, Any]]:
    """Return metadata for every agent discovered in the agents/ folder."""
    agents = []
    for path in sorted(AGENTS_DIR.glob("*.py")):
        if path.name.startswith("_"):
            continue
        agent_id = path.stem
        try:
            mod = _load_module(agent_id)
            configured_fn = getattr(mod, "is_configured", None)
            configured = bool(configured_fn()) if callable(configured_fn) else True
            agents.append(
                {
                    "id": agent_id,
                    "name": getattr(mod, "AGENT_NAME", agent_id),
                    "description": getattr(mod, "AGENT_DESCRIPTION", ""),
                    "category": getattr(mod, "AGENT_CATEGORY", "ollama" if "ollama" in agent_id else "nvidia"),
                    "badge": getattr(mod, "AGENT_BADGE", "Local Ollama" if "ollama" in agent_id else "NVIDIA NIM"),
                    "model_name": getattr(mod, "MODEL_NAME", ""),
                    "configured": configured,
                    "is_default": agent_id == DEFAULT_AGENT_ID,
                    "models": getattr(mod, "AVAILABLE_MODELS", []),
                }
            )
        except Exception as exc:
            # Don't crash the whole server if one agent is broken
            agents.append(
                {
                    "id": agent_id,
                    "name": agent_id,
                    "description": f"⚠ Failed to load: {exc}",
                    "category": "nvidia",
                    "badge": "Error",
                    "configured": False,
                    "is_default": agent_id == DEFAULT_AGENT_ID,
                }
            )
    return agents


def get_agent(agent_id: str):
    """Load and return an agent module by ID. Falls back to default on error."""
    try:
        return _load_module(agent_id)
    except Exception:
        return _load_module(DEFAULT_AGENT_ID)
