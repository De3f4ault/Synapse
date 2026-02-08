"""
Red-Team Grounding Verification Script (Full Suite).

Systematically tests the 5 failure scenarios for the Grounding Middleware:
1. Evidence Starvation (Expected: No grounding)
2. Partial Evidence (Expected: Grounded, honest output)
3. Contradictory Evidence (Expected: Grounded, exposing conflict)
4. Low-Confidence Dominance (Expected: No grounding or low confidence)
5. Latency Degradation (Implicitly tested by empty results in starvation)

Usage:
    python scripts/red_team_grounding.py
"""

import asyncio
import os
import sys
import unittest.mock
from typing import List, Optional
from unittest.mock import AsyncMock, MagicMock

# Add backend to path
sys.path.append(os.getcwd())

from app.core.ai.agents.implementations.tutor_agent import TutorAgent
from app.core.ai.agents.base_agent import AgentConfig, AgentCapability
from app.core.ai.agents.middleware import GroundingMiddleware
from app.services.grounding import GroundingService
from app.schemas.search_result import UnifiedSearchResult, SearchRole, AssertionType
from app.schemas.search_identity import SearchEntityIdentity, IdentityAuthority
from app.schemas.search_context import SearchContext, SearchIntent
from app.schemas.search_response import UnifiedSearchResponse, EngineResult


# Mock Data Factory
def create_mock_result(
    id_val: str,
    text: str,
    confidence: float = 0.9,
    role: SearchRole = SearchRole.EVIDENCE,
    source: str = "rag",
) -> UnifiedSearchResult:
    return UnifiedSearchResult(
        id=SearchEntityIdentity(
            id=id_val,
            type="chunk",
            authority=IdentityAuthority.SYSTEM_DERIVED,
            root_id="doc_1",
            store="qdrant",
        ),
        role=role,
        title=f"Source {id_val}",
        snippet=text,
        source=source,
        assertion_type=AssertionType.INFERENTIAL,
        confidence=confidence,
        valid_at="2024-01-01T00:00:00Z",
        scores={"similarity": confidence},
    )


# Test Runner
async def run_scenario(name: str, mock_results: List[UnifiedSearchResult], query: str):
    print(f"\n--- Testing Scenario: {name} ---")
    print(f"Query: {query}")

    # 1. Mock Unified Search
    mock_search_service = AsyncMock()
    mock_search_service.search.return_value = UnifiedSearchResponse(
        query=query,
        context=SearchContext(user_id=1, intent=SearchIntent.RETRIEVE_CONTEXT, surface="chat"),
        engines=[EngineResult(engine="rag", results=mock_results, latency_ms=50, status="ok")],
        total_results=len(mock_results),
        response_time_ms=50,
    )

    # 2. Setup Grounding Service & Middleware
    grounding_service = GroundingService(mock_search_service)

    # Monkey patch the global getter to return our mock
    import app.services.grounding.grounding_service as gs_module

    gs_module._grounding_service = grounding_service

    middleware = GroundingMiddleware()

    # 3. Create Agent Config
    config = AgentConfig(
        name="test_tutor",
        display_name="Test Tutor",
        description="Test",
        capabilities=[AgentCapability.CHAT],
        system_prompt="You are a tutor.",
        middleware=[middleware],
        model="gemini-2.5-flash",
        max_iterations=1,
    )

    # 4. Mock LLM Provider and Execute
    with unittest.mock.patch("app.core.ai.providers.gemini.GeminiProvider") as MockProvider:
        mock_llm = MockProvider.return_value

        # Define mock behavior based on scenario/prompt content
        async def mock_generate(*args, **kwargs):
            prompt = kwargs.get("prompt", "")

            # Scenario 1: Starvation
            if "Starvation" in name:
                return {
                    "text": "I don't have notes on this. Shall I explain from general knowledge?",
                    "tool_calls": [],
                }
            # Scenario 2: Partial
            elif "Partial" in name:
                return {
                    "text": "Based on your notes, glycolysis starts with glucose. My notes don't mention the end product.",
                    "tool_calls": [],
                }
            # Scenario 3: Contradictory
            elif "Contradictory" in name:
                return {
                    "text": "Your notes have conflicting info: one says Pluto is a planet, one says dwarf planet.",
                    "tool_calls": [],
                }
            # Scenario 4: Low-Confidence
            elif "Low-Confidence" in name:
                return {
                    "text": "I found some loosely related notes but nothing specific to your strategy.",
                    "tool_calls": [],
                }

            # Fallback
            return {"text": "Response.", "tool_calls": []}

        mock_llm.generate_with_tools = AsyncMock(side_effect=mock_generate)

        agent = TutorAgent(config)

        try:
            result = await agent.execute(user_id=1, input=query)

            # 5. Analyze
            metadata = result.metadata
            evidence_usage = metadata.get("evidence_usage", {})

            print("\n[Result Analysis]")
            print(f"Agent Output Snippet: {result.output[:100]}...")
            print(f"Is Grounded: {evidence_usage.get('is_grounded')}")
            print(f"Evidence IDs: {evidence_usage.get('available_evidence_ids')}")
            print(f"Avg Confidence: {evidence_usage.get('avg_confidence')}")

            return result

        except Exception as e:
            print(f"FAILED: {e}")
            import traceback

            traceback.print_exc()


async def main():
    print("🚀 Starting Red-Team Grounding Tests (Full Suite)...")

    # Scenario 1: Evidence Starvation
    await run_scenario("1. Evidence Starvation", [], "Explain Quantum Chromodynamics")

    # Scenario 2: Partial Evidence
    await run_scenario(
        "2. Partial Evidence",
        [create_mock_result("1", "Glycolysis begins with glucose breaking down.", 0.9)],
        "How does glycolysis start and end?",
    )

    # Scenario 3: Contradictory Evidence
    await run_scenario(
        "3. Contradictory Evidence",
        [
            create_mock_result("1", "Pluto is a planet.", 0.85),
            create_mock_result("2", "Pluto is a dwarf planet.", 0.95),
        ],
        "Is Pluto a planet?",
    )

    # Scenario 4: Low-Confidence Dominance
    await run_scenario(
        "4. Low-Confidence Dominance",
        [
            create_mock_result("1", "Biology is the study of life.", 0.25),
            create_mock_result("2", "Cells are small.", 0.28),
        ],
        "What is my specific strategy for biology?",
    )


if __name__ == "__main__":
    asyncio.run(main())
