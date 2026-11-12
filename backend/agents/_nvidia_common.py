"""Shared dynamic NVIDIA NIM agent factory and tools for Ai-guard."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Optional

import numexpr
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.errors import GraphRecursionError
from langgraph.prebuilt import create_react_agent


@tool
def web_search(query: str) -> str:
    """Search the web and return a short summary."""
    try:
        from langchain_community.tools import DuckDuckGoSearchRun

        return DuckDuckGoSearchRun().run(query)
    except Exception as exc:
        return f"Search error: {exc}"


@tool
def file_read(path: str) -> str:
    """Read and return the text contents of a local file by its absolute path."""
    try:
        p = Path(path.strip()).expanduser().resolve()
        if not p.exists():
            return f"Error: file not found: {p}"
        if not p.is_file():
            return f"Error: not a file: {p}"
        return p.read_text(encoding="utf-8", errors="replace")
    except Exception as exc:
        return f"File read error: {exc}"


@tool
def calculator(expression: str) -> str:
    """Evaluate a safe mathematical expression and return the result."""
    try:
        result = numexpr.evaluate(expression.strip())
        return str(result.item() if hasattr(result, "item") else result)
    except Exception as exc:
        return f"Calculator error: {exc}"


TOOLS = [web_search, file_read, calculator]


def is_nvidia_configured() -> bool:
    """Return True if NVIDIA_API_KEY is set to a non-placeholder value."""
    key = os.getenv("NVIDIA_API_KEY", "").strip()
    return bool(key) and key != "nvapi-..." and not key.endswith("...")


def _extract_text(result: Any) -> str:
    messages = result.get("messages") if isinstance(result, dict) else None
    if not messages:
        return str(result)
    last = messages[-1]
    content = getattr(last, "content", "")
    if isinstance(content, list):
        return "\n".join(
            str(item.get("text", item)) if isinstance(item, dict) else str(item)
            for item in content
        ).strip()
    return str(content).strip()


async def invoke_nvidia_agent(
    default_model: str,
    system_prompt: str,
    prompt: str,
    model_name: Optional[str] = None,
) -> str:
    """Instantiate a fresh NVIDIA NIM ReAct agent and run the prompt dynamically."""
    api_key = os.getenv("NVIDIA_API_KEY", "").strip()
    if not is_nvidia_configured():
        raise RuntimeError(
            "NVIDIA_API_KEY is not configured in .env (replace the 'nvapi-...' placeholder with a valid key and restart the backend)."
        )

    target_model = model_name or os.getenv("NVIDIA_MODEL") or default_model
    llm = ChatOpenAI(
        model=target_model,
        openai_api_key=api_key,
        base_url="https://integrate.api.nvidia.com/v1",
        temperature=0,
        max_retries=1,
        timeout=45.0,
    )
    agent = create_react_agent(
        model=llm,
        tools=TOOLS,
        prompt=system_prompt,
    )
    try:
        result = await agent.ainvoke(
            {"messages": [{"role": "user", "content": prompt}]},
            config={"recursion_limit": 12},
        )
        return _extract_text(result)
    except GraphRecursionError:
        return "Agent paused after reaching reasoning step limit before completing the requested action."

