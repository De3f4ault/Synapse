#!/usr/bin/env python3
"""
Telemetry Data Generator - Synthetic Signal Creation

Generates realistic telemetry signals for testing Phase 3B invariants.
Uses actual chat interactions with the backend to create authentic signals.

IMPORTANT: This generates REAL feedback events through the API.
The signals will be indistinguishable from production data.
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime
import random
from typing import List, Dict, Any

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import AsyncSessionLocal
from app.schemas.search_feedback import FeedbackEvent, FeedbackSource
from app.services.feedback.processor import get_feedback_processor


# Sample queries with expected grounding characteristics
SAMPLE_QUERIES = {
    "strong_grounding": [
        "What is the Krebs cycle?",
        "Explain photosynthesis",
        "What are Newton's laws of motion?",
        "Define machine learning",
        "What is the water cycle?",
    ],
    "partial_grounding": [
        "How does quantum computing relate to AI?",
        "What's the connection between music theory and mathematics?",
        "Compare Renaissance art to modern design",
        "How do neural networks learn?",
        "What makes a good algorithm?",
    ],
    "weak_grounding": [
        "What will happen in 2050?",
        "Is AI conscious?",
        "What's the meaning of life?",
        "Will humans colonize Mars?",
        "What's the best programming language?",
    ],
}


async def generate_feedback_event(
    user_id: int,
    query: str,
    grounding_strength: str,
    surface: str = "chat",
) -> FeedbackEvent:
    """
    Generate a realistic feedback event.

    Args:
        user_id: User ID for the event
        query: The query text
        grounding_strength: "strong", "partial", or "weak"
        surface: "chat", "cmdk", or "dashboard"

    Returns:
        FeedbackEvent ready to be processed
    """
    # Simulate evidence IDs (in real usage, these come from search)
    num_available = random.randint(3, 8)
    available_ids = [f"chunk_{i}_{random.randint(1000, 9999)}" for i in range(num_available)]

    # Determine how many were actually used based on grounding strength
    if grounding_strength == "strong_grounding":
        num_used = random.randint(2, min(4, num_available))
        avg_confidence = random.uniform(0.75, 0.95)
        is_grounded = True
        event_type = random.choice(["answer_accepted", "result_clicked"])
        source = FeedbackSource.SYSTEM if random.random() > 0.3 else FeedbackSource.USER
    elif grounding_strength == "partial_grounding":
        num_used = random.randint(1, 2)
        avg_confidence = random.uniform(0.5, 0.75)
        is_grounded = True
        event_type = random.choice(["answer_accepted", "clarification_requested"])
        source = FeedbackSource.SYSTEM
    else:  # weak_grounding
        num_used = random.randint(0, 1)
        avg_confidence = random.uniform(0.2, 0.5)
        is_grounded = num_used > 0
        event_type = random.choice(["answer_rejected", "clarification_requested", "result_ignored"])
        source = FeedbackSource.SYSTEM

    used_ids = random.sample(available_ids, min(num_used, len(available_ids)))

    return FeedbackEvent(
        event_id=f"synthetic_{datetime.now().timestamp()}_{random.randint(1000, 9999)}",
        timestamp=datetime.now(),
        user_id=user_id,
        query=query,
        intent="retrieve_context",
        surface=surface,
        available_evidence_ids=available_ids,
        used_evidence_ids=used_ids,
        is_grounded=is_grounded,
        avg_confidence=avg_confidence,
        event_type=event_type,
        source=source,
    )


async def generate_diverse_dataset(
    user_id: int = 1,
    num_events: int = 60,
) -> List[FeedbackEvent]:
    """
    Generate a diverse dataset that should pass all three invariants.

    Distribution:
    - 50% strong grounding (high confidence, multiple sources)
    - 30% partial grounding (medium confidence, fewer sources)
    - 20% weak grounding (low confidence, rejected/ignored)

    Surface distribution:
    - 70% chat (retrieve_context)
    - 20% cmdk (navigate)
    - 10% dashboard (diagnose)
    """
    events = []

    # Calculate distribution
    num_strong = int(num_events * 0.5)
    num_partial = int(num_events * 0.3)
    num_weak = num_events - num_strong - num_partial

    # Generate events for each category
    for _ in range(num_strong):
        query = random.choice(SAMPLE_QUERIES["strong_grounding"])
        surface = random.choices(["chat", "cmdk", "dashboard"], weights=[0.7, 0.2, 0.1])[0]
        events.append(await generate_feedback_event(user_id, query, "strong_grounding", surface))

    for _ in range(num_partial):
        query = random.choice(SAMPLE_QUERIES["partial_grounding"])
        surface = random.choices(["chat", "cmdk", "dashboard"], weights=[0.7, 0.2, 0.1])[0]
        events.append(await generate_feedback_event(user_id, query, "partial_grounding", surface))

    for _ in range(num_weak):
        query = random.choice(SAMPLE_QUERIES["weak_grounding"])
        surface = random.choices(["chat", "cmdk", "dashboard"], weights=[0.7, 0.2, 0.1])[0]
        events.append(await generate_feedback_event(user_id, query, "weak_grounding", surface))

    # Shuffle to mix categories
    random.shuffle(events)

    return events


async def process_events(events: List[FeedbackEvent]) -> Dict[str, Any]:
    """
    Process feedback events through the real feedback processor.

    Returns:
        Statistics about what was processed
    """
    processor = get_feedback_processor()
    stats = {
        "total_events": len(events),
        "promoted_signals": 0,
        "dropped_events": 0,
        "by_surface": {"chat": 0, "cmdk": 0, "dashboard": 0},
        "by_grounding": {"grounded": 0, "ungrounded": 0},
    }

    async with AsyncSessionLocal() as session:
        for event in events:
            qualified_signals = await processor.process_event(event, session)

            if qualified_signals:
                stats["promoted_signals"] += len(qualified_signals)
            else:
                stats["dropped_events"] += 1

            stats["by_surface"][event.surface] += 1
            if event.is_grounded:
                stats["by_grounding"]["grounded"] += 1
            else:
                stats["by_grounding"]["ungrounded"] += 1

    return stats


async def main():
    print("=" * 60)
    print("SYNAPSE TELEMETRY DATA GENERATOR")
    print("=" * 60)
    print()

    # Configuration
    user_id = 1  # Default test user
    num_events = 60  # Minimum for verification

    print(f"Configuration:")
    print(f"  User ID: {user_id}")
    print(f"  Target Events: {num_events}")
    print()

    # Generate events
    print("[1/3] Generating diverse feedback events...")
    events = await generate_diverse_dataset(user_id, num_events)
    print(f"  ✅ Generated {len(events)} events")
    print()

    # Show distribution preview
    print("[2/3] Event distribution:")
    surfaces = {}
    grounding = {"grounded": 0, "ungrounded": 0}
    for event in events:
        surfaces[event.surface] = surfaces.get(event.surface, 0) + 1
        if event.is_grounded:
            grounding["grounded"] += 1
        else:
            grounding["ungrounded"] += 1

    print(f"  Surfaces: {surfaces}")
    print(f"  Grounding: {grounding}")
    print()

    # Process through real pipeline
    print("[3/3] Processing through feedback pipeline...")
    stats = await process_events(events)
    print(f"  ✅ Processed {stats['total_events']} events")
    print(f"  📊 Promoted signals: {stats['promoted_signals']}")
    print(f"  ⚠️  Dropped events: {stats['dropped_events']}")
    print()

    print("=" * 60)
    print("GENERATION COMPLETE")
    print("=" * 60)
    print()
    print("Next steps:")
    print("  1. Run verification: python scripts/verify_telemetry_invariants.py")
    print("  2. Review raw logs: SELECT * FROM intelligence_adaptation_log LIMIT 20;")
    print("  3. If invariants pass → proceed to Phase 3B.1")
    print()


if __name__ == "__main__":
    asyncio.run(main())
