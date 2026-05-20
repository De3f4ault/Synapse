"""Contract Enforcement for the Search Intelligence Bus.

Validates that engine outputs conform to the unified contract.
Logs violations loudly. Never silently drops.
"""

import structlog
from typing import List

from app.schemas.search import SearchEntityIdentity, IdentityAuthority
from app.schemas.search import UnifiedSearchResult, SearchRole, AssertionType


logger = structlog.get_logger(__name__)


class ContractViolationError(Exception):
    """Raised when an engine violates the search contract."""

    pass


def enforce_contract(
    results: List[UnifiedSearchResult], engine: str, strict: bool = False
) -> List[UnifiedSearchResult]:
    """
    Validate that engine output conforms to the Intelligence Bus contract.

    GUARANTEES:
    - All required fields are present and correct
    - Identity authority rules are enforced
    - Source matches the declared engine
    - Temporal validity is set

    Args:
        results: List of search results from an engine
        engine: The engine that produced these results
        strict: If True, raise on any violation. If False, log and filter.

    Returns:
        List of valid results (may be filtered if strict=False)
    """
    valid_results = []

    for r in results:
        violations = _check_violations(r, engine)

        if violations:
            for v in violations:
                logger.error(
                    "contract_violation",
                    engine=engine,
                    result_id=str(r.id.id) if r.id else "unknown",
                    violation=v,
                )

            if strict:
                raise ContractViolationError(f"Contract violations in {engine}: {violations}")
            # Non-strict: skip this result
            continue

        valid_results.append(r)

    if len(valid_results) < len(results):
        logger.warning(
            "contract_enforcement_filtered",
            engine=engine,
            original_count=len(results),
            valid_count=len(valid_results),
        )

    return valid_results


def _check_violations(result: UnifiedSearchResult, engine: str) -> List[str]:
    """Check a single result for contract violations."""
    violations = []

    # 1. Source must match engine
    if result.source != engine:
        violations.append(f"Source mismatch: {result.source} != {engine}")

    # 2. Role must be set
    if result.role is None:
        violations.append("Role cannot be None")

    # 3. Assertion type must be set
    if result.assertion_type is None:
        violations.append("AssertionType cannot be None")

    # 4. Temporal validity must be set
    if result.valid_at is None:
        violations.append("valid_at is required")

    # 5. Identity authority rules
    if result.id:
        _check_identity_rules(result.id, violations)
    else:
        violations.append("SearchEntityIdentity is required")

    return violations


def _check_identity_rules(identity: SearchEntityIdentity, violations: List[str]) -> None:
    """Enforce identity authority rules."""

    # Rule: SYSTEM_DERIVED entities MUST have root_id (inherited from parent)
    if identity.authority == IdentityAuthority.SYSTEM_DERIVED:
        if identity.root_id is None:
            violations.append("SYSTEM_DERIVED entities must have root_id (inherited from parent)")
        if identity.parent_id is None:
            violations.append("SYSTEM_DERIVED entities must have parent_id")

    # Rule: USER_CONTENT entities should have root_id = self.id
    if identity.authority == IdentityAuthority.USER_CONTENT:
        if identity.root_id is not None and identity.root_id != identity.id:
            violations.append(
                f"USER_CONTENT root_id should equal id, got {identity.root_id} != {identity.id}"
            )

    # Rule: KNOWLEDGE_GRAPH entities should not have root_id (self-referential)
    if identity.authority == IdentityAuthority.KNOWLEDGE_GRAPH:
        if identity.root_id is not None:
            violations.append("KNOWLEDGE_GRAPH entities should not have root_id")
