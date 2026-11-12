import re
import yaml
from typing import Dict, Any, List

class Inspector:
    def __init__(self, policy_path: str = "policy.yaml"):
        self.policy_path = policy_path
        self.policy = self._load_policy()
        self.patterns = self._compile_patterns()

    def _load_policy(self) -> Dict[str, Any]:
        try:
            with open(self.policy_path, "r") as f:
                return yaml.safe_load(f)
        except Exception:
            return {"ingress_rules": [], "default_action": "ALLOW"}

    def _compile_patterns(self):
        return {
            "injection_patterns": re.compile(r"(ignore.*instructions|system override|INTERNAL NOTE)", re.IGNORECASE),
            "role_impersonation": re.compile(r"(act as|you are now|pretend you'?re)", re.IGNORECASE),
            "exfiltration": re.compile(r"(send to|upload|pastebin|webhook)", re.IGNORECASE),
            "sensitive_paths": re.compile(r"(/etc/shadow|~/\.ssh|\.env|/root/)", re.IGNORECASE),
            "system_commands": re.compile(r"(rm -rf|sudo|curl\s+\||chmod)", re.IGNORECASE),
            "credentials": re.compile(r"(API_KEY|token|password|secret)", re.IGNORECASE),
            "malware_request": re.compile(r"(exploit|payload|reverse shell)", re.IGNORECASE),
            "harm_patterns": re.compile(r"(kill|bomb|poison)", re.IGNORECASE),
            "obfuscation": re.compile(r"(base64|hex\s+enc|\\x)", re.IGNORECASE),
            "phishing_patterns": re.compile(r"(verify your account|click here urgently)", re.IGNORECASE),
            "pii_request": re.compile(r"(ssn|credit card|phone number)", re.IGNORECASE),
            "urls": re.compile(r"(http://|https://)", re.IGNORECASE)
        }

    def inspect(self, prompt: str) -> Dict[str, Any]:
        metadata = {}
        risk_score = 0.0
        
        # Check patterns
        for key, pattern in self.patterns.items():
            contains = bool(pattern.search(prompt))
            metadata[f"contains_{key}"] = contains
            if contains:
                risk_score += 0.1

        # Token count approximation
        metadata["token_count"] = len(prompt.split())
        
        # Determine intent_category (naive approach for DPI)
        intent_category = "unknown"
        if metadata.get("contains_credentials"):
            intent_category = "credential_access"
            risk_score += 0.2
        elif metadata.get("contains_sensitive_paths"):
            intent_category = "file_io"
            risk_score += 0.2
            
        metadata["intent_category"] = intent_category

        # Cap risk score at 1.0
        metadata["risk_score"] = min(1.0, risk_score)
        
        return metadata

    def evaluate_policy(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        rules = self.policy.get("ingress_rules", [])
        
        # Sort rules by priority (highest first)
        rules = sorted(rules, key=lambda x: x.get("priority", 0), reverse=True)
        
        for rule in rules:
            conditions = rule.get("conditions", [])
            matches = True
            
            for condition in conditions:
                field = condition.get("field")
                match_type = condition.get("match_type")
                value = condition.get("value")
                
                if field not in metadata:
                    matches = False
                    break
                    
                actual_val = metadata[field]
                
                if match_type == "boolean":
                    if bool(actual_val) != bool(value):
                        matches = False
                        break
                elif match_type == "exact":
                    if actual_val != value:
                        matches = False
                        break
                elif match_type == "threshold":
                    if float(actual_val) < float(value):
                        matches = False
                        break
            
            if matches:
                return {
                    "verdict": rule.get("action", "ALLOW"),
                    "matched_rule": rule.get("name"),
                    "deny_message": rule.get("deny_message")
                }
                
        return {
            "verdict": self.policy.get("default_action", "ALLOW"),
            "matched_rule": None,
            "deny_message": None
        }

    def process(self, prompt: str) -> Dict[str, Any]:
        metadata = self.inspect(prompt)
        policy_result = self.evaluate_policy(metadata)
        
        return {
            "metadata": metadata,
            "policy_result": policy_result
        }
