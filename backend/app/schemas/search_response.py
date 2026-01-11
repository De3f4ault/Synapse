"""Search Response Contracts.

Defines the engine envelope structure for graceful degradation.
Results are ALWAYS returned per-engine, never flattened.
"""

from pydantic import BaseModel
from typing import Literal, List, Optional

from app.schemas.search_result import UnifiedSearchResult
from app.schemas.search_context import SearchContext


class EngineResult(BaseModel):
    """
    Per-engine result envelope.

    IMMUTABLE CONTRACT:
    - Results are ALWAYS nested per-engine
    - Never return a flat cross-engine list
    - This prevents ranking logic leakage into the bus

    Status codes enable graceful degradation:
    - ok: Engine returned successfully
    - timeout: Engine exceeded latency budget
    - error: Engine failed (see error_message)
    - skipped: Engine did not participate (wrong intent)
    """

    engine: Literal["hybrid", "rag", "graph"]
    results: List[UnifiedSearchResult]
    latency_ms: int
    status: Literal["ok", "timeout", "error", "skipped"]
    error_message: Optional[str] = None

    @property
    def is_healthy(self) -> bool:
        return self.status == "ok"

    @property
    def result_count(self) -> int:
        return len(self.results)


class UnifiedSearchResponse(BaseModel):
    """
    Complete response from the Search Intelligence Bus.

    GUARANTEES:
    - No ordering is applied across engines
    - Consumers MUST explicitly flatten if needed
    - This prevents ranking logic from leaking into the bus
    - Partial truth beats silent failure
    """

    query: str
    context: SearchContext
    engines: List[EngineResult]
    total_results: int
    response_time_ms: int

    @property
    def healthy_engines(self) -> List[EngineResult]:
        return [e for e in self.engines if e.is_healthy]

    @property
    def failed_engines(self) -> List[EngineResult]:
        return [e for e in self.engines if not e.is_healthy]

    @property
    def has_partial_failure(self) -> bool:
        return len(self.failed_engines) > 0 and len(self.healthy_engines) > 0
