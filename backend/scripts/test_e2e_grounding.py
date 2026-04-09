#!/usr/bin/env python
"""
Synapse E2E Pipeline Tracer — Tests every hop from input to grounding.

Usage:
    cd /home/de3f4ault/Desktop/Projects/synapse/backend
    PYTHONPATH=. python scripts/test_e2e_grounding.py "What does malloc do?"

Tests:
    1. Embedding layer     — Can we vectorize the query?
    2. Unified search      — Does it return evidence chunks?
    3. Evidence selection   — Does grounding filter correctly?
    4. Prompt formatting    — Is the <EVIDENCE> block well-formed?
    5. Full grounding       — Does GroundingService.ground() work end-to-end?
    6. Middleware injection  — Does GroundingMiddleware inject into context?
    7. Agent system prompt  — Does the tutor prompt include evidence?
"""

import asyncio
import sys
import time
from typing import List, Dict, Any

# ============================================================================
# Color helpers for terminal output
# ============================================================================

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"


def ok(msg: str):
    print(f"  {GREEN}✅ {msg}{RESET}")


def fail(msg: str):
    print(f"  {RED}❌ {msg}{RESET}")


def info(msg: str):
    print(f"  {CYAN}ℹ  {msg}{RESET}")


def header(msg: str):
    print(f"\n{BOLD}{CYAN}{'=' * 60}")
    print(f"  {msg}")
    print(f"{'=' * 60}{RESET}")


def subheader(msg: str):
    print(f"\n{BOLD}  ── {msg}{RESET}")


# ============================================================================
# Test stages
# ============================================================================


async def test_embedding(query: str) -> List[float]:
    """Stage 1: Embedding — Can we vectorize the query?"""
    header("Stage 1: Embedding Layer")

    from app.core.ai.embeddings.boundary import embed_text_sync, EMBEDDING_DIM, EMBEDDING_MODEL_NAME

    info(f"Model: {EMBEDDING_MODEL_NAME}")
    info(f"Target dimension: {EMBEDDING_DIM}")

    start = time.time()
    embedding, status = embed_text_sync(query)
    elapsed = (time.time() - start) * 1000

    if embedding and len(embedding) == EMBEDDING_DIM:
        ok(f"Query embedded → {len(embedding)}d vector in {elapsed:.0f}ms (status={status.value})")
        ok(f"First 5 values: [{', '.join(f'{v:.4f}' for v in embedding[:5])}...]")
        return embedding
    else:
        dim = len(embedding) if embedding else 'None'
        fail(f"Embedding failed or wrong dimension: got {dim} (status={status.value})")
        return []


async def test_unified_search(query: str, user_id: int = 1) -> Dict[str, Any]:
    """Stage 2: Unified Search — Does it return evidence?"""
    header("Stage 2: Unified Search (Intelligence Bus)")

    from app.db.session import AsyncSessionLocal
    from app.services.search.unified_service import UnifiedSearchService
    from app.schemas.search_context import SearchContext, SearchIntent

    async with AsyncSessionLocal() as db:
        service = UnifiedSearchService(db)

        context = SearchContext(
            user_id=user_id,
            intent=SearchIntent.RETRIEVE_CONTEXT,
            surface="chat",
            max_latency_ms=30000,  # 30s for cold-start model loading
            max_results_per_engine=10,
        )

        start = time.time()
        response = await service.search(query, context)
        elapsed = (time.time() - start) * 1000
        await db.commit()

    # Flatten results from engines
    all_results = []
    engine_summary = []
    for engine in response.engines:
        count = len(engine.results) if engine.results else 0
        engine_summary.append(f"{engine.engine}: {count} results ({engine.status})")
        if engine.status == "ok" and engine.results:
            all_results.extend(engine.results)

    info(f"Latency: {elapsed:.0f}ms")
    for es in engine_summary:
        info(f"Engine: {es}")

    evidence_results = [r for r in all_results if str(getattr(r, "role", "")).lower() == "evidence"]
    nav_results = [r for r in all_results if str(getattr(r, "role", "")).lower() != "evidence"]

    if evidence_results:
        ok(f"Found {len(evidence_results)} evidence chunks + {len(nav_results)} navigation results")
        subheader("Top 3 Evidence Chunks")
        for i, r in enumerate(evidence_results[:3], 1):
            score = r.confidence if hasattr(r, "confidence") and r.confidence else 0
            snippet_text = ""
            if hasattr(r, "snippet") and r.snippet:
                snippet_text = r.snippet[:100]
            print(f"    {YELLOW}[{i}]{RESET} {BOLD}{r.title}{RESET}")
            print(f"        confidence={score:.2f}  snippet=\"{snippet_text}...\"")
    elif all_results:
        fail(f"No evidence-role results ({len(all_results)} results, but none with role='evidence')")
        subheader("Sample result roles")
        for r in all_results[:5]:
            role = getattr(r, "role", "?")
            title = getattr(r, "title", "?")
            print(f"    role={role}  title={title}")
    else:
        fail("No results returned from any engine")

    return {"response": response, "all_results": all_results, "evidence": evidence_results}


async def test_evidence_selection(search_results: List) -> List:
    """Stage 3: Evidence Selection — Does grounding filter correctly?"""
    header("Stage 3: Evidence Selection (Grounding Service)")

    from app.services.grounding.grounding_service import select_evidence

    evidence = select_evidence(
        results=search_results,
        max_chunks=5,
        min_confidence=0.3,
    )

    if evidence:
        ok(f"Selected {len(evidence)} evidence chunks (min_confidence=0.3)")
        for i, e in enumerate(evidence, 1):
            print(f"    {YELLOW}[{i}]{RESET} {BOLD}{e.title}{RESET}")
            print(f"        confidence={e.confidence:.2f}  level={e.confidence_level.value}")
            snippet = e.snippet[:80] if e.snippet else ""
            print(f"        snippet=\"{snippet}...\"")
        return evidence
    else:
        fail("No evidence passed the selection filter")
        info("Possible causes:")
        info("  - All results have role != 'evidence'")
        info("  - All results have confidence < 0.3")
        info("  - Results missing parent_id/root_id")
        return []


async def test_prompt_formatting(evidence: List) -> str:
    """Stage 4: Prompt Formatting — Is the <EVIDENCE> block well-formed?"""
    header("Stage 4: Prompt Formatting")

    from app.services.grounding.grounding_service import format_evidence_for_prompt

    block = format_evidence_for_prompt(evidence)

    if block:
        ok(f"Evidence block generated ({len(block)} chars)")
        has_open = "<EVIDENCE>" in block
        has_close = "</EVIDENCE>" in block
        source_count = block.count("Source ")

        ok(f"<EVIDENCE> tag: {has_open}")
        ok(f"</EVIDENCE> tag: {has_close}")
        ok(f"Source entries: {source_count}")

        subheader("Formatted Block (preview)")
        lines = block.split("\n")
        for line in lines[:15]:
            print(f"    {DIM}{line}{RESET}")
        if len(lines) > 15:
            print(f"    {DIM}... ({len(lines) - 15} more lines){RESET}")

        return block
    else:
        fail("Empty evidence block")
        return ""


async def test_grounding_service(query: str, user_id: int = 1) -> Dict:
    """Stage 5: Full Grounding Service — Does .ground() work end-to-end?"""
    header("Stage 5: Full Grounding Service (.ground())")

    from app.db.session import AsyncSessionLocal
    from app.services.grounding.grounding_service import GroundingService

    async with AsyncSessionLocal() as db:
        service = GroundingService(db)

        start = time.time()
        result = await service.ground(
            query=query,
            user_id=user_id,
            surface="chat",
            max_chunks=5,
            min_confidence=0.3,
            max_latency_ms=15000,
        )
        elapsed = (time.time() - start) * 1000
        await db.commit()

    info(f"Latency: {elapsed:.0f}ms")
    info(f"has_grounding: {result.has_grounding}")
    info(f"source_count: {result.source_count}")
    info(f"confidence_level: {result.confidence_level.value}")
    info(f"avg_confidence: {result.avg_confidence:.2f}")

    if result.has_grounding:
        ok(f"Grounding successful — {result.source_count} sources, avg confidence {result.avg_confidence:.2f}")

        subheader("Evidence Summary")
        for i, e in enumerate(result.evidence, 1):
            print(f"    {YELLOW}[{i}]{RESET} {e.title} (conf={e.confidence:.2f})")

        subheader("Prompt Block Preview")
        lines = result.formatted_prompt_block.split("\n")
        for line in lines[:8]:
            print(f"    {DIM}{line}{RESET}")
        if len(lines) > 8:
            print(f"    {DIM}... ({len(lines) - 8} more lines){RESET}")
    else:
        fail("Grounding returned no evidence")

    return {
        "result": result,
        "has_grounding": result.has_grounding,
        "source_count": result.source_count,
    }


async def test_middleware_injection(query: str, user_id: int = 1) -> Dict:
    """Stage 6: Middleware — Does GroundingMiddleware inject into context?"""
    header("Stage 6: Middleware Injection (GroundingMiddleware)")

    from app.core.ai.agents.middleware.grounding import GroundingMiddleware
    from app.core.ai.agents.base_agent import AgentState

    middleware = GroundingMiddleware(
        max_chunks=5,
        min_confidence=0.3,
        max_latency_ms=15000,
        surface="chat",
    )

    state = AgentState()
    context = {"input": query}

    start = time.time()
    await middleware.before_execution(
        agent=None,
        state=state,
        context=context,
        user_id=user_id,
    )
    elapsed = (time.time() - start) * 1000

    grounding = context.get("grounding")

    info(f"Latency: {elapsed:.0f}ms")

    if grounding and grounding.has_grounding:
        ok(f"Middleware injected grounding into context")
        ok(f"  evidence_count: {grounding.source_count}")
        ok(f"  prompt_block_length: {len(grounding.formatted_prompt_block)} chars")
        ok(f"  confidence: {grounding.avg_confidence:.2f} ({grounding.confidence_level.value})")
        return {"grounding": grounding, "success": True}
    elif grounding:
        fail("Middleware ran but returned empty grounding (no evidence met threshold)")
        return {"grounding": grounding, "success": False}
    else:
        fail("Middleware did not set context['grounding']")
        return {"grounding": None, "success": False}


async def test_agent_prompt(query: str, user_id: int = 1) -> str:
    """Stage 7: Agent System Prompt — Does it include evidence?"""
    header("Stage 7: Agent System Prompt (TutorAgent)")

    from app.core.ai.agents.implementations.tutor_agent import TutorAgent
    from app.core.ai.agents.middleware.grounding import GroundingMiddleware
    from app.core.ai.agents.base_agent import AgentState, AgentConfig, AgentCapability

    # Simulate middleware injection (same as execute_stream does now)
    middleware = GroundingMiddleware(max_chunks=5, min_confidence=0.3, max_latency_ms=15000)
    state = AgentState()
    context = {"input": query}

    await middleware.before_execution(agent=None, state=state, context=context, user_id=user_id)

    grounding = context.get("grounding")

    # Directly instantiate TutorAgent with minimal config (bypasses tool registry)
    config = AgentConfig(
        name="tutor",
        display_name="Tutor",
        description="Test tutor",
        capabilities=[AgentCapability.CHAT],
        system_prompt="",
        tools=[],
        middleware=[],
    )
    agent = TutorAgent(config)
    prompt = await agent._get_system_prompt(context)

    has_evidence_block = "<EVIDENCE>" in prompt
    has_student_notes = "Student's Notes" in prompt or "Knowledge Base" in prompt

    info(f"Prompt length: {len(prompt)} chars")

    if has_evidence_block:
        ok("System prompt contains <EVIDENCE> block")
        ev_start = prompt.find("<EVIDENCE>")
        ev_end = prompt.find("</EVIDENCE>") + len("</EVIDENCE>")
        if ev_start >= 0 and ev_end > ev_start:
            evidence_section = prompt[ev_start:ev_end]
            subheader("Evidence block in system prompt")
            for line in evidence_section.split("\n")[:10]:
                print(f"    {DIM}{line}{RESET}")
    elif has_student_notes:
        ok("System prompt contains grounding context section")
    else:
        if grounding and grounding.has_grounding:
            fail("Grounding exists but NOT injected into prompt — check _get_system_prompt()")
        else:
            info("No grounding available — LLM will answer from knowledge only")

    return prompt


# ============================================================================
# Main
# ============================================================================


async def main():
    query = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "What does malloc do in C?"

    print(f"\n{BOLD}{'=' * 60}")
    print(f"  SYNAPSE E2E PIPELINE TRACER")
    print(f"{'=' * 60}{RESET}")
    print(f"  Query: \"{query}\"")
    print(f"  User:  1")

    results = {}

    # Stage 1: Embedding
    try:
        embedding = await test_embedding(query)
        results["embedding"] = bool(embedding)
    except Exception as e:
        fail(f"Embedding failed: {e}")
        results["embedding"] = False

    # Stage 2: Unified Search
    search_data = {"all_results": [], "evidence": []}
    try:
        search_data = await test_unified_search(query)
        results["search"] = len(search_data["all_results"]) > 0
        results["evidence_found"] = len(search_data["evidence"]) > 0
    except Exception as e:
        fail(f"Search failed: {e}")
        import traceback; traceback.print_exc()
        results["search"] = False
        results["evidence_found"] = False

    # Stage 3: Evidence Selection (only if we have results with evidence role)
    if search_data["evidence"]:
        try:
            evidence = await test_evidence_selection(search_data["all_results"])
            results["evidence_selected"] = len(evidence) > 0
        except Exception as e:
            fail(f"Evidence selection failed: {e}")
            import traceback; traceback.print_exc()
            results["evidence_selected"] = False
            evidence = []
    else:
        info("Skipping evidence selection — no evidence-role results")
        evidence = []
        results["evidence_selected"] = False

    # Stage 4: Prompt Formatting
    if evidence:
        try:
            block = await test_prompt_formatting(evidence)
            results["formatting"] = bool(block)
        except Exception as e:
            fail(f"Formatting failed: {e}")
            results["formatting"] = False
    else:
        info("Skipping formatting — no evidence")
        results["formatting"] = False

    # Stage 5: Full Grounding Service
    try:
        grounding_data = await test_grounding_service(query)
        results["grounding"] = grounding_data["has_grounding"]
    except Exception as e:
        fail(f"Grounding service failed: {e}")
        import traceback; traceback.print_exc()
        results["grounding"] = False

    # Stage 6: Middleware Injection
    try:
        mw_data = await test_middleware_injection(query)
        results["middleware"] = mw_data["success"]
    except Exception as e:
        fail(f"Middleware failed: {e}")
        import traceback; traceback.print_exc()
        results["middleware"] = False

    # Stage 7: Agent System Prompt
    try:
        prompt = await test_agent_prompt(query)
        results["agent_prompt"] = "<EVIDENCE>" in prompt or "Student's Notes" in prompt or "Knowledge Base" in prompt
    except Exception as e:
        fail(f"Agent prompt failed: {e}")
        import traceback; traceback.print_exc()
        results["agent_prompt"] = False

    # ====================================================================
    # Summary
    # ====================================================================
    header("PIPELINE SUMMARY")

    stages = [
        ("1. Embedding (768d Nomic)", "embedding"),
        ("2. Unified Search (Intelligence Bus)", "search"),
        ("3. Evidence Found (role=evidence)", "evidence_found"),
        ("4. Evidence Selected (confidence≥0.3)", "evidence_selected"),
        ("5. Prompt Formatting (<EVIDENCE> block)", "formatting"),
        ("6. Grounding Service (.ground())", "grounding"),
        ("7. Middleware Injection (context['grounding'])", "middleware"),
        ("8. Agent Prompt (evidence in system prompt)", "agent_prompt"),
    ]

    passed = 0
    total = len(stages)

    for label, key in stages:
        status = results.get(key, False)
        if status:
            print(f"  {GREEN}✅ {label}{RESET}")
            passed += 1
        else:
            print(f"  {RED}❌ {label}{RESET}")

    print(f"\n  {BOLD}Result: {passed}/{total} stages passed{RESET}")

    if passed == total:
        print(f"\n  {GREEN}{BOLD}🎉 FULL PIPELINE OPERATIONAL — Grounding is live!{RESET}")
    elif passed >= 6:
        print(f"\n  {YELLOW}{BOLD}⚠️  Mostly working — check failed stages above{RESET}")
    else:
        print(f"\n  {RED}{BOLD}🔴 Pipeline issues detected — see individual stage output{RESET}")

    print()


if __name__ == "__main__":
    asyncio.run(main())
