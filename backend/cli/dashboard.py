"""FastAPI dashboard for AgentTrap reports and audit logs."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse


REPORT_PATH = Path("report.json")
AUDIT_PATH = Path("audit.jsonl")

app = FastAPI(title="AgentTrap Dashboard", version="1.0.0")


def _load_report() -> Dict[str, Any]:
    if not REPORT_PATH.exists():
        raise HTTPException(status_code=404, detail="Run audit_report.py first")
    try:
        return json.loads(REPORT_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail=f"report.json is invalid: {exc}") from exc


def _latest_run_session(report: Dict[str, Any]) -> Dict[str, Any]:
    sessions = report.get("sessions", [])
    if not isinstance(sessions, list):
        raise HTTPException(status_code=500, detail="report.json has invalid sessions format")

    run_sessions = [s for s in sessions if str(s.get("session_id", "")).startswith("run_")]
    if not run_sessions:
        raise HTTPException(status_code=404, detail="No run_* session found in report.json")
    return run_sessions[-1]


def _dashboard_payload(session: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "session_id": session.get("session_id"),
        "total_probes": int(session.get("total_probes", 0)),
        "blocked": int(session.get("blocked", 0)),
        "allowed": int(session.get("allowed", 0)),
        "mismatches": int(session.get("mismatches", 0)),
        "top_risk_score": max(
            [float(x.get("highest_risk_score", 0.0) or 0.0) for x in session.get("category_breakdown", [])]
            or [0.0]
        ),
        "categories_covered": [x.get("category") for x in session.get("category_breakdown", [])],
        "date": session.get("date"),
        "block_rate": float(session.get("block_rate", 0.0) or 0.0),
    }


def _load_audit_array() -> List[Dict[str, Any]]:
    if not AUDIT_PATH.exists():
        raise HTTPException(status_code=404, detail="Run redteam_agent.py first")

    items: List[Dict[str, Any]] = []
    with AUDIT_PATH.open("r", encoding="utf-8") as handle:
        for idx, line in enumerate(handle, start=1):
            raw = line.strip()
            if not raw:
                continue
            try:
                item = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if not isinstance(item, dict):
                continue
            if str(item.get("session_id", "")).startswith("run_"):
                items.append(item)

    if not items:
        raise HTTPException(status_code=404, detail="No run_* audit events found")
    return items


@app.get("/dashboard")
def get_dashboard() -> Dict[str, Any]:
    report = _load_report()
    latest = _latest_run_session(report)
    return _dashboard_payload(latest)


@app.get("/report")
def get_report() -> Dict[str, Any]:
    return _load_report()


@app.get("/audit")
def get_audit() -> List[Dict[str, Any]]:
    return _load_audit_array()


@app.get("/", response_class=HTMLResponse)
def home() -> str:
    report = _load_report()
    latest = _latest_run_session(report)
    summary = _dashboard_payload(latest)

    blocked = summary["blocked"]
    allowed = summary["allowed"]
    mismatches = summary["mismatches"]
    total = summary["total_probes"]

    html = f"""
<!doctype html>
<html>
<head>
  <meta charset=\"utf-8\" />
  <title>AgentTrap Dashboard</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 24px; }}
    table {{ border-collapse: collapse; min-width: 640px; }}
    th, td {{ border: 1px solid #ddd; padding: 10px 12px; text-align: left; }}
    th {{ background: #f3f4f6; }}
    .blocked {{ color: #b91c1c; font-weight: 700; }}
    .allowed {{ color: #166534; font-weight: 700; }}
    .mismatch {{ color: #a16207; font-weight: 700; }}
    .muted {{ color: #6b7280; }}
  </style>
</head>
<body>
  <h1>AgentTrap Dashboard</h1>
  <p class=\"muted\">Latest run_* session summary</p>
  <table>
    <tr><th>Field</th><th>Value</th></tr>
    <tr><td>Session ID</td><td>{summary['session_id']}</td></tr>
    <tr><td>Date</td><td>{summary['date']}</td></tr>
    <tr><td>Total Probes</td><td>{total}</td></tr>
    <tr><td>Blocked</td><td class=\"blocked\">{blocked}</td></tr>
    <tr><td>Allowed</td><td class=\"allowed\">{allowed}</td></tr>
    <tr><td>Mismatches</td><td class=\"mismatch\">{mismatches}</td></tr>
    <tr><td>Block Rate</td><td>{summary['block_rate'] * 100:.1f}%</td></tr>
    <tr><td>Top Risk Score</td><td>{summary['top_risk_score']:.4f}</td></tr>
    <tr><td>Categories Covered</td><td>{', '.join([str(c) for c in summary['categories_covered']])}</td></tr>
  </table>
</body>
</html>
"""
    return html


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=9000)
