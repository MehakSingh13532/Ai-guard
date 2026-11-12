"""
RedGuard Probe Validator
=========================

Validates probe dataset entries against the benchmark specification.

Every probe must satisfy all required field checks before it can be
included in a published benchmark run. This prevents silent failures
caused by incomplete or malformed probe definitions.

Design rationale:
    Incomplete probes are a serious threat to benchmark validity.
    If 'expected_behavior' is missing, evaluation logic cannot determine
    what a secure agent should do. If 'references' are absent, the probe
    cannot be cited. Validation gates publication on completeness.

Usage:

    from redguard.datasets.validator import ProbeValidator

    validator = ProbeValidator()

    # Validate a single entry
    result = validator.validate(entry)
    if not result.valid:
        print(result.errors)

    # Validate all and raise on first failure
    validator.assert_valid(entries)

    # CLI
    python -m redguard.datasets.validator
"""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

REQUIRED_FIELDS = [
    "id",
    "title",
    "attack_family",
    "attack_variant",
    "scenario",
    "difficulty",
    "threat_model",
    "attacker_capability",
    "prompt",
    "expected_behavior",
    "failure_behavior",
    "attack_goal",
    "evaluation_rules",
    "references",
    "probe_version",
    "dataset_version",
]

REQUIRED_EVALUATION_RULE_FIELDS = ["success_indicators", "blocked_indicators"]

VALID_FAMILIES = {
    "direct_injection",
    "content_injection",
    "memory_poisoning",
    "tool_manipulation",
    "planning_manipulation",
    "goal_diversion",
    "data_exfiltration",
    "autonomous_actions",
}

VALID_DIFFICULTIES = {"trivial", "easy", "medium", "hard", "expert"}

VALID_SCENARIOS = {
    "generic",
    "github_issue",
    "gitlab_issue",
    "reddit_post",
    "forum_discussion",
    "documentation_page",
    "wiki",
    "support_ticket",
    "email_assistant",
    "calendar_assistant",
    "travel_assistant",
    "banking_assistant",
    "shopping_assistant",
}

VALID_THREAT_MODELS = {
    "adversarial_user",
    "malicious_third_party_content",
    "compromised_tool",
    "insider_threat",
    "supply_chain",
}

VALID_ATTACKER_CAPABILITIES = {
    "prompt_level",
    "document_level",
    "tool_output_level",
    "memory_level",
    "network_level",
}

ID_PATTERN = re.compile(r"^RG-[A-Z]{2,4}-\d{3}$")
SEMVER_PATTERN = re.compile(r"^\d+\.\d+\.\d+$")

MIN_PROMPT_LENGTH = 10
MIN_BEHAVIOR_LENGTH = 10
MIN_REFERENCES = 1
MIN_SUCCESS_INDICATORS = 1
MIN_BLOCKED_INDICATORS = 1


# ─────────────────────────────────────────────────────────────────────────────
# Result Types
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class ValidationResult:
    """Result of validating a single probe entry."""

    probe_id: str
    valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

    def __str__(self) -> str:
        status = "PASS" if self.valid else "FAIL"
        parts = [f"[{status}] {self.probe_id}"]
        for e in self.errors:
            parts.append(f"  ERROR: {e}")
        for w in self.warnings:
            parts.append(f"  WARN:  {w}")
        return "\n".join(parts)


@dataclass
class ValidationReport:
    """Aggregated validation report across all probes."""

    results: List[ValidationResult] = field(default_factory=list)

    @property
    def total(self) -> int:
        return len(self.results)

    @property
    def passed(self) -> int:
        return sum(1 for r in self.results if r.valid)

    @property
    def failed(self) -> int:
        return self.total - self.passed

    @property
    def is_clean(self) -> bool:
        return self.failed == 0

    def summary(self) -> str:
        lines = [
            "=" * 60,
            "RedGuard Probe Validation Report",
            "=" * 60,
            f"Total: {self.total} | Passed: {self.passed} | Failed: {self.failed}",
            "",
        ]
        for r in self.results:
            lines.append(str(r))
        lines.append("")
        lines.append("=" * 60)
        if self.is_clean:
            lines.append("✓ All probes passed validation")
        else:
            lines.append(f"✗ {self.failed} probe(s) failed validation — fix before publishing")
        return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# Validator
# ─────────────────────────────────────────────────────────────────────────────

class ProbeValidator:
    """Validates probe dataset entries against the benchmark specification.

    Checks performed:
      1. All required fields are present and non-empty
      2. ID matches the RG-XX-NNN pattern
      3. attack_family is a known family
      4. difficulty is a valid level
      5. scenario is a valid scenario
      6. threat_model is a valid model
      7. attacker_capability is valid
      8. prompt meets minimum length
      9. expected_behavior meets minimum length
      10. failure_behavior meets minimum length
      11. evaluation_rules has required sub-fields with at least one indicator each
      12. references has at least one entry, each with title and year
      13. probe_version and dataset_version are valid semver strings
    """

    def validate(self, entry: Dict[str, Any]) -> ValidationResult:
        """Validate a single probe entry.

        Args:
            entry: Dict representing one probe from a dataset JSON file.

        Returns:
            ValidationResult with errors and warnings.
        """
        probe_id = entry.get("id", "<no id>")
        errors: List[str] = []
        warnings: List[str] = []

        # 1. Required fields
        for field_name in REQUIRED_FIELDS:
            if field_name not in entry:
                errors.append(f"Missing required field: '{field_name}'")
            elif entry[field_name] is None:
                errors.append(f"Field '{field_name}' is null")
            elif isinstance(entry[field_name], str) and not entry[field_name].strip():
                errors.append(f"Field '{field_name}' is empty string")

        # Stop early if id is missing — can't usefully continue
        if "id" not in entry or not entry["id"]:
            return ValidationResult(probe_id="<no id>", valid=False, errors=errors)

        # 2. ID format
        if not ID_PATTERN.match(probe_id):
            errors.append(
                f"ID '{probe_id}' does not match pattern RG-XX-NNN (e.g. RG-DI-001)"
            )

        # 3. attack_family
        family = entry.get("attack_family", "")
        if family and family not in VALID_FAMILIES:
            errors.append(
                f"Unknown attack_family '{family}'. Valid values: {sorted(VALID_FAMILIES)}"
            )

        # 4. difficulty
        difficulty = entry.get("difficulty", "")
        if difficulty and difficulty not in VALID_DIFFICULTIES:
            errors.append(
                f"Unknown difficulty '{difficulty}'. Valid values: {sorted(VALID_DIFFICULTIES)}"
            )

        # 5. scenario
        scenario = entry.get("scenario", "")
        if scenario and scenario not in VALID_SCENARIOS:
            errors.append(
                f"Unknown scenario '{scenario}'. Valid values: {sorted(VALID_SCENARIOS)}"
            )

        # 6. threat_model
        threat_model = entry.get("threat_model", "")
        if threat_model and threat_model not in VALID_THREAT_MODELS:
            errors.append(
                f"Unknown threat_model '{threat_model}'. Valid values: {sorted(VALID_THREAT_MODELS)}"
            )

        # 7. attacker_capability
        capability = entry.get("attacker_capability", "")
        if capability and capability not in VALID_ATTACKER_CAPABILITIES:
            errors.append(
                f"Unknown attacker_capability '{capability}'. Valid values: {sorted(VALID_ATTACKER_CAPABILITIES)}"
            )

        # 8. prompt length
        prompt = entry.get("prompt", "")
        if isinstance(prompt, str) and len(prompt.strip()) < MIN_PROMPT_LENGTH:
            errors.append(
                f"'prompt' is too short ({len(prompt.strip())} chars, minimum {MIN_PROMPT_LENGTH})"
            )

        # 9. expected_behavior length
        expected = entry.get("expected_behavior", "")
        if isinstance(expected, str) and len(expected.strip()) < MIN_BEHAVIOR_LENGTH:
            errors.append(
                f"'expected_behavior' is too short ({len(expected.strip())} chars, minimum {MIN_BEHAVIOR_LENGTH})"
            )

        # 10. failure_behavior length
        failure = entry.get("failure_behavior", "")
        if isinstance(failure, str) and len(failure.strip()) < MIN_BEHAVIOR_LENGTH:
            errors.append(
                f"'failure_behavior' is too short ({len(failure.strip())} chars, minimum {MIN_BEHAVIOR_LENGTH})"
            )

        # 11. evaluation_rules structure
        rules = entry.get("evaluation_rules")
        if isinstance(rules, dict):
            for sub_field in REQUIRED_EVALUATION_RULE_FIELDS:
                if sub_field not in rules:
                    errors.append(
                        f"evaluation_rules missing sub-field '{sub_field}'"
                    )
                elif not isinstance(rules[sub_field], list):
                    errors.append(
                        f"evaluation_rules.{sub_field} must be a list"
                    )
                elif len(rules[sub_field]) < 1:
                    errors.append(
                        f"evaluation_rules.{sub_field} must have at least one entry"
                    )
        elif rules is not None:
            errors.append("'evaluation_rules' must be a JSON object")

        # 12. references
        references = entry.get("references", [])
        if isinstance(references, list):
            if len(references) < MIN_REFERENCES:
                errors.append(
                    f"'references' must have at least {MIN_REFERENCES} entry"
                )
            for i, ref in enumerate(references):
                if not isinstance(ref, dict):
                    errors.append(f"references[{i}] must be an object")
                else:
                    if not ref.get("title"):
                        errors.append(f"references[{i}] missing 'title'")
                    if not ref.get("year"):
                        errors.append(f"references[{i}] missing 'year'")
        elif references is not None:
            errors.append("'references' must be a list")

        # 13. Version semver
        for ver_field in ("probe_version", "dataset_version"):
            ver = entry.get(ver_field, "")
            if isinstance(ver, str) and ver and not SEMVER_PATTERN.match(ver):
                errors.append(
                    f"'{ver_field}' value '{ver}' is not a valid semver string (X.Y.Z)"
                )

        # Warnings (non-fatal)
        if not entry.get("synthetic"):
            warnings.append(
                "Field 'synthetic' is missing or false — document the origin of this probe"
            )
        if not entry.get("research_notes"):
            warnings.append(
                "No 'research_notes' — consider adding context for reviewers"
            )
        if not entry.get("tags"):
            warnings.append("No 'tags' — tagging improves discoverability and filtering")

        return ValidationResult(
            probe_id=probe_id,
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
        )

    def validate_all(self, entries: List[Dict[str, Any]]) -> List[ValidationResult]:
        """Validate all entries in a dataset.

        Args:
            entries: List of probe entry dicts.

        Returns:
            List of ValidationResult, one per entry.
        """
        return [self.validate(entry) for entry in entries]

    def assert_valid(
        self,
        entries: List[Dict[str, Any]],
        stop_on_first: bool = False,
    ) -> None:
        """Validate all entries and raise if any fail.

        Args:
            entries: List of probe entry dicts.
            stop_on_first: If True, raise on the first failure (faster).
                           If False (default), collect all errors before raising.

        Raises:
            ValueError: If any probes fail validation.
        """
        results = self.validate_all(entries)
        failures = [r for r in results if not r.valid]

        if not failures:
            return

        error_lines = [
            f"Probe validation failed: {len(failures)} of {len(entries)} probes are invalid.",
            "",
        ]
        for r in failures:
            error_lines.append(str(r))

        raise ValueError("\n".join(error_lines))

    def generate_report(self, entries: List[Dict[str, Any]]) -> ValidationReport:
        """Generate a full validation report.

        Args:
            entries: List of probe entry dicts.

        Returns:
            ValidationReport instance.
        """
        results = self.validate_all(entries)
        return ValidationReport(results=results)


# ─────────────────────────────────────────────────────────────────────────────
# CLI Entry Point
# ─────────────────────────────────────────────────────────────────────────────

def main() -> int:
    """Command-line interface for probe validation.

    Returns:
        Exit code: 0 for clean, 1 for failures.
    """
    from .loader import load_all_datasets

    print("RedGuard Probe Validator")
    print("-" * 40)

    entries = load_all_datasets(validate=False)
    print(f"Loaded {len(entries)} probe entries")
    print()

    validator = ProbeValidator()
    report = validator.generate_report(entries)

    print(report.summary())

    return 0 if report.is_clean else 1


if __name__ == "__main__":
    sys.exit(main())
