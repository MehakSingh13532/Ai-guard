"""Generate manager-readable and structured audit reports from audit.jsonl."""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

from schema import sha256_hex


def _load_events(log_path: Path) -> Tuple[List[Dict[str, Any]], List[str]]:
    events: List[Dict[str, Any]] = []
    warnings: List[str] = []

    if not log_path.exists():
        warnings.append(f"Log file not found: {log_path}")
        return events, warnings

    with log_path.open("r", encoding="utf-8") as handle:
        for idx, line in enumerate(handle, start=1):
            raw = line.strip()
            if not raw:
                continue
            try:
                item = json.loads(raw)
            except json.JSONDecodeError as exc:
                warnings.append(f"Malformed JSON at line {idx}: {exc}")
                continue
            if isinstance(item, dict):
                events.append(_normalize_event(item))
            else:
                warnings.append(f"Non-object JSON at line {idx}, skipped")

    return events, warnings


def _normalize_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize different log schemas to the ProbeEvent-like shape.

    Supports:
    - redteam_agent ProbeEvent JSONL
    - Lobster Trap ingress/egress audit lines
    """
    normalized = dict(event)
    meta = normalized.get("metadata") if isinstance(normalized.get("metadata"), dict) else {}

    if not normalized.get("session_id"):
        req_id = normalized.get("request_id")
        normalized["session_id"] = str(req_id) if req_id else "unknown_session"

    if not normalized.get("category"):
        cat = meta.get("intent_category") or normalized.get("direction") or "UNKNOWN"
        normalized["category"] = str(cat).upper()

    if not normalized.get("verdict"):
        action = normalized.get("action")
        normalized["verdict"] = str(action).upper() if action else "UNKNOWN"

    if not normalized.get("status"):
        verdict = str(normalized.get("verdict", "")).upper()
        if verdict in {"DENY", "BLOCK", "BLOCKED"}:
            normalized["status"] = "BLOCKED"
        elif verdict == "ALLOW":
            normalized["status"] = "ALLOWED"
        else:
            normalized["status"] = verdict or "UNKNOWN"

    if normalized.get("risk_score") is None:
        normalized["risk_score"] = float(meta.get("risk_score", 0.0) or 0.0)

    if normalized.get("mismatch") is None:
        mismatches = normalized.get("mismatches")
        normalized["mismatch"] = bool(mismatches)

    if normalized.get("declared_intent") is None:
        normalized["declared_intent"] = str(meta.get("declared_intent", "unknown"))

    if normalized.get("detected_intent") is None:
        normalized["detected_intent"] = str(meta.get("intent_category", "unknown"))

    if not normalized.get("prompt_hash"):
        seed = json.dumps(event, sort_keys=True, ensure_ascii=True)
        normalized["prompt_hash"] = sha256_hex(seed)

    if not normalized.get("event_hash"):
        seed = json.dumps(normalized, sort_keys=True, ensure_ascii=True)
        normalized["event_hash"] = sha256_hex(seed)

    if normalized.get("_lobstertrap") is None:
        normalized["_lobstertrap"] = {}

    return normalized


def _is_blocked(event: Dict[str, Any]) -> bool:
    status = str(event.get("status", "")).upper()
    verdict = str(event.get("verdict", "")).upper()
    return status.startswith("BLOCKED") or verdict in {"DENY", "BLOCKED", "BLOCK"}


def _is_allowed(event: Dict[str, Any]) -> bool:
    return not _is_blocked(event)


def _extract_rule_names(event: Dict[str, Any]) -> List[str]:
    meta = event.get("_lobstertrap")
    if not isinstance(meta, dict):
        return []

    names: List[str] = []
    for key in ("rule", "rule_name", "policy_rule"):
        if meta.get(key):
            names.append(str(meta[key]))

    rules = meta.get("rules")
    if isinstance(rules, list):
        for item in rules:
            if isinstance(item, dict):
                if item.get("name"):
                    names.append(str(item["name"]))
                elif item.get("rule"):
                    names.append(str(item["rule"]))
            elif item:
                names.append(str(item))

    matched = meta.get("matched_rules")
    if isinstance(matched, list):
        names.extend([str(x) for x in matched if x])

    # preserve order + dedupe
    seen: set[str] = set()
    ordered: List[str] = []
    for name in names:
        if name not in seen:
            seen.add(name)
            ordered.append(name)
    return ordered


def _session_date(session_events: List[Dict[str, Any]]) -> str:
    timestamps = [str(e.get("timestamp", "")) for e in session_events if e.get("timestamp")]
    if not timestamps:
        return "unknown"
    return min(timestamps)


def _summarize_session(session_id: str, session_events: List[Dict[str, Any]]) -> Dict[str, Any]:
    total = len(session_events)
    blocked = sum(1 for e in session_events if _is_blocked(e))
    allowed = total - blocked
    mismatches = sum(1 for e in session_events if bool(e.get("mismatch", False)))
    block_rate = (blocked / total) if total else 0.0

    by_category: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for event in session_events:
        by_category[str(event.get("category", "UNKNOWN"))].append(event)

    category_breakdown: List[Dict[str, Any]] = []
    for category in sorted(by_category):
        group = by_category[category]
        c_total = len(group)
        c_blocked = sum(1 for e in group if _is_blocked(e))
        c_allowed = c_total - c_blocked
        c_mismatch = sum(1 for e in group if bool(e.get("mismatch", False)))
        c_top_risk = max(float(e.get("risk_score", 0.0) or 0.0) for e in group)
        category_breakdown.append(
            {
                "category": category,
                "probes": c_total,
                "blocked": c_blocked,
                "allowed": c_allowed,
                "mismatches": c_mismatch,
                "highest_risk_score": round(c_top_risk, 4),
            }
        )

    high_risk_allowed: List[Dict[str, Any]] = []
    mismatch_events: List[Dict[str, Any]] = []
    blocked_with_rules: List[Dict[str, Any]] = []

    for event in session_events:
        risk = float(event.get("risk_score", 0.0) or 0.0)
        if _is_allowed(event) and risk > 0.5:
            high_risk_allowed.append(
                {
                    "category": event.get("category", "UNKNOWN"),
                    "risk_score": round(risk, 4),
                    "status": event.get("status", "ALLOWED"),
                    "declared_intent": event.get("declared_intent", ""),
                    "detected_intent": event.get("detected_intent", ""),
                    "prompt_hash": event.get("prompt_hash", ""),
                    "event_hash": event.get("event_hash", ""),
                }
            )

        if bool(event.get("mismatch", False)):
            mismatch_events.append(
                {
                    "category": event.get("category", "UNKNOWN"),
                    "declared_intent": event.get("declared_intent", ""),
                    "detected_intent": event.get("detected_intent", ""),
                    "prompt_hash": event.get("prompt_hash", ""),
                    "event_hash": event.get("event_hash", ""),
                }
            )

        if _is_blocked(event):
            rules = _extract_rule_names(event)
            if rules:
                blocked_with_rules.append(
                    {
                        "category": event.get("category", "UNKNOWN"),
                        "rules": rules,
                        "prompt_hash": event.get("prompt_hash", ""),
                        "event_hash": event.get("event_hash", ""),
                    }
                )

    event_hashes = [str(e.get("event_hash", "")) for e in session_events if e.get("event_hash")]
    prompt_hashes = [str(e.get("prompt_hash", "")) for e in session_events if e.get("prompt_hash")]
    manifest_seed = "|".join(sorted(event_hashes + prompt_hashes + [session_id]))
    session_manifest = sha256_hex(manifest_seed)

    return {
        "session_id": session_id,
        "date": _session_date(session_events),
        "total_probes": total,
        "blocked": blocked,
        "allowed": allowed,
        "mismatches": mismatches,
        "block_rate": round(block_rate, 4),
        "category_breakdown": category_breakdown,
        "high_risk_allowed": high_risk_allowed,
        "intent_mismatches": mismatch_events,
        "blocked_with_rules": blocked_with_rules,
        "manifest_sha256": session_manifest,
    }


def _overall_recommendations(summary: Dict[str, Any]) -> List[str]:
    recs: List[str] = []
    sessions = summary.get("sessions", [])
    total_allowed_high_risk = sum(len(s.get("high_risk_allowed", [])) for s in sessions)
    total_mismatches = sum(int(s.get("mismatches", 0)) for s in sessions)
    total_block_rate = summary.get("overall", {}).get("block_rate", 0.0)

    if total_allowed_high_risk > 0:
        recs.append(
            "Tighten Lobster Trap policy thresholds for high-risk allows and add explicit deny rules for repeated adversarial signatures."
        )
    if total_mismatches > 0:
        recs.append(
            "Add intent consistency checks before tool execution and block when declared and detected intent diverge."
        )
    if total_block_rate < 0.3:
        recs.append(
            "Current block rate is low; expand rule coverage for semantic manipulation and cognitive-state probes."
        )
    return recs


def _build_report_data(events: List[Dict[str, Any]], warnings: List[str]) -> Dict[str, Any]:
    sessions_map: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for event in events:
        session_id = str(event.get("session_id") or "unknown_session")
        sessions_map[session_id].append(event)

    session_summaries = [
        _summarize_session(session_id, sessions_map[session_id])
        for session_id in sorted(sessions_map)
    ]

    total = sum(s["total_probes"] for s in session_summaries)
    blocked = sum(s["blocked"] for s in session_summaries)
    allowed = sum(s["allowed"] for s in session_summaries)
    mismatches = sum(s["mismatches"] for s in session_summaries)
    block_rate = (blocked / total) if total else 0.0

    report_data = {
        "generated_at": datetime.now().isoformat(),
        "overall": {
            "total_probes": total,
            "blocked": blocked,
            "allowed": allowed,
            "mismatches": mismatches,
            "block_rate": round(block_rate, 4),
            "session_count": len(session_summaries),
        },
        "sessions": session_summaries,
        "warnings": warnings,
    }
    report_data["recommendations"] = _overall_recommendations(report_data)
    return report_data


def _render_markdown(report: Dict[str, Any], log_path: Path) -> str:
    overall = report["overall"]
    sessions = report["sessions"]
    latest = sessions[-1] if sessions else None

    if overall["total_probes"] == 0:
        return "No audit events found. Run redteam_agent.py first.\n"

    lines: List[str] = []
    lines.append("# AgentTrap Audit Report")
    lines.append("")
    lines.append("## Executive Summary")
    lines.append(
        (
            f"AgentTrap analyzed **{overall['total_probes']}** probes across "
            f"**{overall['session_count']}** session(s). "
            f"Overall block rate is **{overall['block_rate'] * 100:.1f}%** "
            f"with **{overall['mismatches']}** intent mismatch event(s). "
            "Risk posture is moderate when high-risk allowed interactions exist; "
            "those events require immediate policy hardening."
        )
    )
    lines.append("")

    lines.append("## Session Overview")
    if latest:
        lines.append(f"- session_id: `{latest['session_id']}`")
        lines.append(f"- total probes: {latest['total_probes']}")
        lines.append(f"- blocked: {latest['blocked']}")
        lines.append(f"- allowed: {latest['allowed']}")
        lines.append(f"- mismatches: {latest['mismatches']}")
        lines.append(f"- date: {latest['date']}")
    lines.append("")

    lines.append("## Category Breakdown")
    lines.append("| Category | Probes | Blocked | Allowed | Mismatches | Highest Risk Score |")
    lines.append("|---|---:|---:|---:|---:|---:|")
    for row in (latest["category_breakdown"] if latest else []):
        lines.append(
            f"| {row['category']} | {row['probes']} | {row['blocked']} | {row['allowed']} | {row['mismatches']} | {row['highest_risk_score']:.4f} |"
        )
    lines.append("")

    lines.append("## High Risk Allowed Interactions")
    if latest and latest["high_risk_allowed"]:
        for item in latest["high_risk_allowed"]:
            lines.append(
                "- "
                f"{item['category']} | risk={item['risk_score']:.4f} | "
                f"status={item['status']} | prompt_hash=`{item['prompt_hash']}`"
            )
    else:
        lines.append("- None detected in latest session.")
    lines.append("")

    lines.append("## Intent Mismatch Analysis")
    if latest and latest["intent_mismatches"]:
        for item in latest["intent_mismatches"]:
            lines.append(
                "- "
                f"{item['category']} | declared=`{item['declared_intent']}` | "
                f"detected=`{item['detected_intent']}` | prompt_hash=`{item['prompt_hash']}`"
            )
    else:
        lines.append("- No intent mismatches observed in latest session.")
    lines.append("")

    lines.append("## Notable Findings")
    if latest and latest["blocked_with_rules"]:
        for item in latest["blocked_with_rules"]:
            rules = ", ".join(item["rules"])
            lines.append(
                f"- BLOCKED {item['category']} via rule(s): {rules} | prompt_hash=`{item['prompt_hash']}`"
            )
    else:
        lines.append("- No blocked events with explicit rule names found.")
    lines.append("")

    lines.append("## Recommendations")
    for rec in report.get("recommendations", []):
        lines.append(f"- {rec}")
    lines.append("")

    lines.append("## Appendix")
    lines.append(f"- Source log: `{log_path}`")
    lines.append("- Session IDs:")
    for s in sessions:
        lines.append(f"  - `{s['session_id']}` (manifest_sha256=`{s['manifest_sha256']}`)")

    if report.get("warnings"):
        lines.append("- Parse warnings:")
        for warning in report["warnings"]:
            lines.append(f"  - {warning}")

    return "\n".join(lines) + "\n"


def run(log_path: Path, out_md: Path, out_json: Path) -> int:
    events, warnings = _load_events(log_path)

    if not events:
        print("No audit events found. Run redteam_agent.py first.")
        return 1

    report_data = _build_report_data(events, warnings)
    markdown = _render_markdown(report_data, log_path)

    out_md.write_text(markdown, encoding="utf-8")
    out_json.write_text(json.dumps(report_data, indent=2, ensure_ascii=True), encoding="utf-8")

    print(f"Report written: {out_md}")
    print(f"Report written: {out_json}")
    return 0


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate AgentTrap audit reports")
    parser.add_argument("--log", default="audit.jsonl", help="Path to audit JSONL log")
    parser.add_argument("--out-md", default="report.md", help="Output markdown report path")
    parser.add_argument("--out-json", default="report.json", help="Output JSON report path")
    args = parser.parse_args(list(argv) if argv is not None else None)
    return run(Path(args.log), Path(args.out_md), Path(args.out_json))


if __name__ == "__main__":
    raise SystemExit(main())
