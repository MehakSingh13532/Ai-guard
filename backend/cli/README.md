# Ai-guard CLI Tools (Legacy)

These are standalone CLI scripts from the original offline-only version of Ai-guard.
They **do not integrate with the FastAPI server** and are kept here for research purposes.

| Script | Purpose |
|--------|---------|
| `redteam_agent.py` | Fires all probes at a target URL via HTTP, writes JSONL audit log |
| `dashboard.py` | Standalone FastAPI dashboard that reads `audit.jsonl` / `report.json` |
| `audit_report.py` | Generates an offline report from `audit.jsonl` |
| `add_custom_probes.py` | Helper to bulk-import probes into the database |

## Usage

```bash
# From backend/ directory:
python cli/redteam_agent.py --target http://localhost:8080/v1/chat/completions
python cli/dashboard.py   # runs on :9000
```

> **Note:** The live web application at `localhost:3000` uses `scanner.py` and Prisma/SQLite 
> instead of these tools. These scripts are kept for advanced/offline use cases.
