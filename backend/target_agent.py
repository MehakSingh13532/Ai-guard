"""
Ai-guard Target Agent — interactive CLI
────────────────────────────────────────
This script lets you talk to ANY agent in the backend/agents/ folder
from the command line.  By default it uses the default_agent.

Usage:
  python3 target_agent.py                      # uses default_agent
  python3 target_agent.py my_company_agent     # uses agents/my_company_agent.py

To add your own agent:
  1. Create a Python module in  backend/agents/your_name.py
  2. Define AGENT_NAME, AGENT_DESCRIPTION, and the async invoke(prompt) function.
  3. Run this script with your agent's filename stem as the argument.
     (It will also appear automatically in the web UI agent selector.)
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

# Make sure imports work regardless of CWD
sys.path.insert(0, str(Path(__file__).parent))

from agent_loader import get_agent, list_agents, DEFAULT_AGENT_ID


def main() -> int:
    agent_id = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_AGENT_ID

    # Show available agents if the requested one doesn't exist
    available = [a["id"] for a in list_agents()]
    if agent_id not in available:
        print(f"Agent '{agent_id}' not found.  Available agents:")
        for a in list_agents():
            marker = " (default)" if a["is_default"] else ""
            print(f"  {a['id']}{marker} — {a['name']}")
        return 1

    mod = get_agent(agent_id)
    name = getattr(mod, "AGENT_NAME", agent_id)
    desc = getattr(mod, "AGENT_DESCRIPTION", "")

    print("=" * 60)
    print(f"  Ai-guard CLI  —  {name}")
    if desc:
        print(f"  {desc}")
    print("  Type 'agents' to list all agents. Type 'exit' to quit.")
    print("=" * 60)

    loop = asyncio.new_event_loop()

    while True:
        try:
            user_input = input("\nagent> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye.")
            return 0

        if not user_input:
            continue
        if user_input.lower() in {"exit", "quit"}:
            return 0
        if user_input.lower() == "agents":
            for a in list_agents():
                marker = " ← current" if a["id"] == agent_id else ""
                print(f"  {a['id']}{marker} — {a['name']}")
            continue

        try:
            response = loop.run_until_complete(mod.invoke(user_input))
            print("\n" + response)
        except Exception as exc:
            msg = str(exc)
            if "403" in msg:
                print("[Ai-guard] ⛔  Prompt BLOCKED by policy.")
            elif "Connection refused" in msg or "Max retries" in msg:
                print("[Ai-guard] ⚠  Cannot reach backend. Run `npm run dev:all` first.")
            else:
                print(f"[Error] {exc}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
