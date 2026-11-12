"""Shared helpers and data contracts for Ai-guard.

Active usage:
  - sha256_hex()          → used by scanner.py and report_generator.py
  - generate_session_id() → used by legacy CLI tools (backend/cli/)

Legacy CLI usage only (not used by the live FastAPI app):
  - DecisionEvent dataclass
  - ProbeEvent dataclass (with finalize() and event hash logic)

The live app writes audit events directly to Prisma (SQLite) via scanner.py.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from hashlib import sha256
from typing import Any, Dict, Optional


def generate_session_id(now: Optional[datetime] = None) -> str:
    """Return a session id in format run_YYYYMMDD_HHMMSS."""
    current = now or datetime.now()
    return current.strftime("run_%Y%m%d_%H%M%S")


def sha256_hex(value: str) -> str:
    """Return SHA256 hex digest for a UTF-8 string."""
    return sha256(value.encode("utf-8")).hexdigest()


@dataclass
class DecisionEvent:
    """Normalized decision metadata captured per probe response."""

    session_id: str
    category: str
    verdict: str
    status: str
    risk_score: float
    declared_intent: str
    detected_intent: str
    regex_only: bool = False
    lobstertrap_metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ProbeEvent:
    """Full audit event contract for every fired probe.

    Contract aligns with APP_FLOW section 9.
    """

    timestamp: str
    session_id: str
    category: str
    prompt_hash: str
    verdict: str
    risk_score: float
    declared_intent: str
    detected_intent: str
    regex_only: bool = False
    lobstertrap_metadata: Dict[str, Any] = field(default_factory=dict)
    status: str = "ALLOWED"
    prompt_text: str = ""
    response_excerpt: str = ""
    event_hash: str = ""

    def compute_event_hash(self) -> str:
        """Compute deterministic event hash from stable fields."""
        payload = "|".join(
            [
                self.timestamp,
                self.session_id,
                self.category,
                self.prompt_hash,
                self.verdict,
                f"{self.risk_score:.6f}",
                self.declared_intent,
                self.detected_intent,
                self.status,
            ]
        )
        return sha256_hex(payload)

    def finalize(self) -> None:
        """Populate event_hash if missing."""
        if not self.event_hash:
            self.event_hash = self.compute_event_hash()

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["_lobstertrap"] = data.pop("lobstertrap_metadata")
        return data
