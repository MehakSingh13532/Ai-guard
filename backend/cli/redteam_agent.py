"""Autonomous red-team probe runner for AgentTrap (Phase 2)."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

import requests

import os

# Add parent directory to sys.path to access redguard module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from redguard.datasets.loader import FAMILY_FILES, load_family_dataset
from schema import ProbeEvent, generate_session_id, sha256_hex

TARGET_URL = "http://localhost:8080/v1/chat/completions"
AUDIT_LOG = Path("audit.jsonl")
TIMEOUT_SECONDS = 10

RED = "\033[31m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
RESET = "\033[0m"


def _probe_groups() -> List[Tuple[str, List[str]]]:
    base_groups = []
    for family in FAMILY_FILES:
        cat = family.upper()
        try:
            entries = load_family_dataset(family, validate=False)
            prompts = [entry["prompt"] for entry in entries if "prompt" in entry]
            base_groups.append((cat, prompts))
        except Exception as e:
            print(f"Error loading family {family}: {e}")
    return base_groups


def _extract_verdict(resp: requests.Response, body: Dict[str, Any]) -> str:
    headers = {k.lower(): v for k, v in resp.headers.items()}
    for key, value in headers.items():
        if "lobstertrap" in key and "verdict" in key:
            return str(value).upper()

    lobster_meta = body.get("_lobstertrap") if isinstance(body, dict) else None
    if isinstance(lobster_meta, dict):
        for k in ("verdict", "decision", "action"):
            if lobster_meta.get(k):
                return str(lobster_meta[k]).upper()

    if resp.status_code in {401, 403, 429}:
        return "DENY"
    return "ALLOW"


def _extract_lobster_meta(resp: requests.Response, body: Dict[str, Any]) -> Dict[str, Any]:
    meta: Dict[str, Any] = {
        "status_code": resp.status_code,
        "headers": {k: v for k, v in resp.headers.items() if "lobstertrap" in k.lower()},
    }
    if isinstance(body, dict) and isinstance(body.get("_lobstertrap"), dict):
        meta.update(body["_lobstertrap"])
    return meta


def _response_excerpt(body: Dict[str, Any]) -> str:
    if not isinstance(body, dict):
        return ""
    choices = body.get("choices")
    if not isinstance(choices, list) or not choices:
        return ""
    first = choices[0]
    if not isinstance(first, dict):
        return ""
    msg = first.get("message")
    if isinstance(msg, dict):
        return str(msg.get("content") or "")[:500]
    return ""


def _post_probe(target_url: str, prompt: str) -> requests.Response:
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0,
    }
    return requests.post(target_url, json=payload, timeout=TIMEOUT_SECONDS)


def _print_event(status: str, mismatch: bool, category: str, index: int, total: int) -> None:
    color = GREEN
    if status in {"BLOCKED", "DENY"}:
        color = RED
    label = f"{color}{status}{RESET}"
    mismatch_label = ""
    if mismatch:
        mismatch_label = f" {YELLOW}MISMATCH{RESET}"
    print(f"[{category} {index}/{total}] {label}{mismatch_label}")


def run(target_url: str, log_path: Path) -> int:
    session_id = generate_session_id()
    groups = _probe_groups()

    fired = 0
    blocked = 0
    allowed = 0
    mismatches = 0

    with log_path.open("a", encoding="utf-8") as handle:
        for category, probes in groups:
            category_unreachable = False
            for idx, prompt in enumerate(probes, start=1):
                if category_unreachable:
                    break

                timestamp = datetime.now(timezone.utc).isoformat()
                prompt_hash = sha256_hex(prompt)

                try:
                    response = _post_probe(target_url, prompt)
                    body = response.json()
                except requests.RequestException as exc:
                    if idx == 1 or "Connection refused" in str(exc) or "Failed to establish" in str(exc):
                        print(f"{category}: target unreachable, skipping category")
                        category_unreachable = True
                        break

                    event = ProbeEvent(
                        timestamp=timestamp,
                        session_id=session_id,
                        category=category,
                        prompt_hash=prompt_hash,
                        verdict="TIMEOUT",
                        risk_score=0.0,
                        declared_intent=f"redteam:{category.lower()}",
                        detected_intent="unknown",
                        regex_only=True,
                        lobstertrap_metadata={"error": "probe_timeout"},
                        status="TIMEOUT",
                        prompt_text=prompt,
                        response_excerpt="",
                    )
                    event.finalize()
                    handle.write(json.dumps(event.to_dict(), ensure_ascii=True) + "\n")
                    fired += 1
                    _print_event("TIMEOUT", False, category, idx, len(probes))
                    continue
                except ValueError:
                    body = {}

                verdict = _extract_verdict(response, body)
                risk_score = 0.8 if verdict == "DENY" else 0.2
                declared_intent = f"redteam:{category.lower()}"
                detected_intent = "unknown"
                mismatch = False

                status = "BLOCKED" if verdict in {"DENY", "BLOCKED"} else "ALLOWED"
                if status == "ALLOWED" and risk_score > 0.7:
                    status = "ALLOWED_HIGH_RISK"

                event = ProbeEvent(
                    timestamp=timestamp,
                    session_id=session_id,
                    category=category,
                    prompt_hash=prompt_hash,
                    verdict=verdict,
                    risk_score=risk_score,
                    declared_intent=declared_intent,
                    detected_intent=detected_intent,
                    regex_only=True,
                    lobstertrap_metadata=_extract_lobster_meta(response, body),
                    status=status,
                    prompt_text=prompt,
                    response_excerpt=_response_excerpt(body),
                )
                event.finalize()
                handle.write(json.dumps(event.to_dict(), ensure_ascii=True) + "\n")

                fired += 1
                if status.startswith("BLOCKED") or verdict in {"DENY", "BLOCKED"}:
                    blocked += 1
                else:
                    allowed += 1
                if mismatch:
                    mismatches += 1

                _print_event(status, mismatch, category, idx, len(probes))

    print(
        f"Summary: {fired} probes fired, {blocked} blocked, {allowed} allowed, {mismatches} mismatches"
    )
    return 0


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run AgentTrap red-team probes")
    parser.add_argument(
        "--target",
        default=TARGET_URL,
        help="Target chat completions endpoint (default: http://localhost:8080/v1/chat/completions)",
    )
    parser.add_argument(
        "--log",
        default=str(AUDIT_LOG),
        help="Audit log path (JSONL)",
    )
    args = parser.parse_args(list(argv) if argv is not None else None)
    return run(args.target, Path(args.log))


if __name__ == "__main__":
    raise SystemExit(main())
