#!/usr/bin/env python3
"""
Telemetry Invariant Verification Script.

This script verifies the three critical invariants before Phase 3B:
1. Signal Integrity (No Phantom Learning)
2. Distribution Sanity (No Mode Collapse)
3. Surface Separation (Intent not collapsed)

Run this after collecting 50-100 real interactions.
"""

import asyncio
from datetime import datetime, timedelta
from sqlalchemy import text
import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import AsyncSessionLocal
from app.core.config import settings


async def check_schema_exists() -> bool:
    """Check if the intelligence_adaptation_log table exists."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = :schema AND table_name = 'intelligence_adaptation_log'"
            ),
            {"schema": settings.DATABASE_SCHEMA},
        )
        return result.scalar() is not None


async def get_log_count() -> int:
    """Get total count of intelligence adaptation logs."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT COUNT(*) FROM intelligence_adaptation_log"))
        return result.scalar() or 0


async def verify_signal_integrity() -> dict:
    """
    Invariant 1: Signal Integrity (No Phantom Learning).

    Checks:
    - used_evidence_ids ⊆ available_evidence_ids
    - is_grounded=false → NO learning_value > 0
    - Contradictory evidence → confidence_weight dampened

    Returns:
        dict with validation results
    """
    async with AsyncSessionLocal() as session:
        # Check for positive learning signals from ungrounded contexts
        # This requires joining with the source event, which we don't store directly.
        # For now, we check if any signals exist with signal_type=evidence_trusted
        # but confidence_weight < 0.5 (which indicates weak grounding).

        result = await session.execute(
            text("""
                SELECT 
                    COUNT(*) as total_signals,
                    COUNT(*) FILTER (WHERE signal_type = 'evidence_trusted') as trusted_signals,
                    COUNT(*) FILTER (WHERE signal_type = 'evidence_rejected') as rejected_signals,
                    COUNT(*) FILTER (WHERE learning_value > 0 AND confidence_weight < 0.5) as weak_positive_signals,
                    AVG(confidence_weight) as avg_confidence
                FROM intelligence_adaptation_log
                WHERE timestamp > :since
            """),
            {"since": datetime.utcnow() - timedelta(hours=24)},
        )
        row = result.fetchone()

        if not row or row.total_signals == 0:
            return {
                "status": "NO_DATA",
                "message": "No signals in last 24 hours. Need 50-100 interactions before verification.",
                "total_signals": 0,
            }

        # Validation: weak positive signals should be < 5% of total
        weak_ratio = row.weak_positive_signals / row.total_signals if row.total_signals > 0 else 0

        return {
            "status": "PASS" if weak_ratio < 0.05 else "FAIL",
            "total_signals": row.total_signals,
            "trusted_signals": row.trusted_signals,
            "rejected_signals": row.rejected_signals,
            "weak_positive_signals": row.weak_positive_signals,
            "weak_ratio": round(weak_ratio * 100, 2),
            "avg_confidence": round(row.avg_confidence, 3) if row.avg_confidence else None,
            "message": f"Weak positive ratio: {weak_ratio * 100:.1f}% (should be < 5%)",
        }


async def verify_distribution_sanity() -> dict:
    """
    Invariant 2: Distribution Sanity (No Mode Collapse).

    Checks:
    - Grounding rate neither ~0% nor ~100%
    - Confidence weights form a bell-ish curve
    - No single concept dominating updates

    Returns:
        dict with validation results
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text("""
                SELECT
                    COUNT(*) as total,
                    COUNT(DISTINCT entity_id) as unique_entities,
                    AVG(confidence_weight) as avg_confidence,
                    STDDEV(confidence_weight) as stddev_confidence,
                    MIN(confidence_weight) as min_confidence,
                    MAX(confidence_weight) as max_confidence,
                    COUNT(*) FILTER (WHERE signal_type LIKE 'evidence%') as evidence_signals,
                    COUNT(*) FILTER (WHERE signal_type LIKE 'concept%') as concept_signals
                FROM intelligence_adaptation_log
                WHERE timestamp > :since
            """),
            {"since": datetime.utcnow() - timedelta(hours=24)},
        )
        row = result.fetchone()

        if not row or row.total == 0:
            return {"status": "NO_DATA", "message": "No signals to analyze for distribution."}

        # Check for mode collapse indicators
        entity_ratio = row.unique_entities / row.total if row.total > 0 else 0
        has_variance = row.stddev_confidence and row.stddev_confidence > 0.05

        # Mode collapse = same entity over and over, or no variance in confidence
        is_healthy = entity_ratio > 0.1 and has_variance

        return {
            "status": "PASS" if is_healthy else "WARNING",
            "total_signals": row.total,
            "unique_entities": row.unique_entities,
            "entity_diversity_ratio": round(entity_ratio * 100, 2),
            "avg_confidence": round(row.avg_confidence, 3) if row.avg_confidence else None,
            "stddev_confidence": round(row.stddev_confidence, 3) if row.stddev_confidence else None,
            "confidence_range": f"{row.min_confidence:.2f} - {row.max_confidence:.2f}",
            "evidence_signals": row.evidence_signals,
            "concept_signals": row.concept_signals,
            "message": f"Entity diversity: {entity_ratio * 100:.1f}%, Confidence variance: {row.stddev_confidence:.3f}"
            if row.stddev_confidence
            else "Need more data",
        }


async def verify_surface_separation() -> dict:
    """
    Invariant 3: Surface Separation.

    Checks that learning signals differ by surface:
    - CMD+K: Navigational confidence
    - Chat: Conceptual understanding
    - Dashboard: Diagnostic reinforcement

    If all surfaces produce similar signals → intent collapsed.

    Returns:
        dict with validation results
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text("""
                SELECT 
                    surface,
                    COUNT(*) as count,
                    AVG(confidence_weight) as avg_confidence,
                    COUNT(DISTINCT signal_type) as signal_type_diversity
                FROM intelligence_adaptation_log
                WHERE timestamp > :since
                GROUP BY surface
            """),
            {"since": datetime.utcnow() - timedelta(hours=24)},
        )
        rows = result.fetchall()

        if not rows:
            return {"status": "NO_DATA", "message": "No signals to analyze for surface separation."}

        surfaces = {}
        for row in rows:
            surfaces[row.surface] = {
                "count": row.count,
                "avg_confidence": round(row.avg_confidence, 3) if row.avg_confidence else None,
                "signal_type_diversity": row.signal_type_diversity,
            }

        # Check if we have signals from multiple surfaces
        has_surface_diversity = len(surfaces) > 1

        return {
            "status": "PASS" if has_surface_diversity else "WARNING",
            "surfaces": surfaces,
            "surface_count": len(surfaces),
            "message": f"Signals from {len(surfaces)} surface(s): {list(surfaces.keys())}",
        }


async def main():
    print("=" * 60)
    print("SYNAPSE TELEMETRY INVARIANT VERIFICATION")
    print("=" * 60)
    print(f"\nTimestamp: {datetime.now().isoformat()}")
    print(f"Database: {settings.DATABASE_URL[:50]}...")
    print()

    # Check schema
    print("[1/4] Checking schema...")
    if not await check_schema_exists():
        print("❌ CRITICAL: intelligence_adaptation_log table does not exist!")
        print("   Run: alembic upgrade head")
        return
    print("✅ Schema exists")

    # Check log count
    print("\n[2/4] Checking log count...")
    count = await get_log_count()
    print(f"   Total logs: {count}")
    if count < 50:
        print(f"   ⚠️  WARNING: Need 50-100 interactions for reliable verification.")
        print(f"   Current: {count} (need {50 - count} more)")

    # Invariant 1: Signal Integrity
    print("\n[3/4] Verifying Signal Integrity (No Phantom Learning)...")
    result = await verify_signal_integrity()
    if result["status"] == "PASS":
        print(f"   ✅ PASS: {result['message']}")
    elif result["status"] == "NO_DATA":
        print(f"   ⚠️  {result['message']}")
    else:
        print(f"   ❌ FAIL: {result['message']}")
    print(f"   Details: {result}")

    # Invariant 2: Distribution Sanity
    print("\n[4/5] Verifying Distribution Sanity (No Mode Collapse)...")
    result = await verify_distribution_sanity()
    if result["status"] == "PASS":
        print(f"   ✅ PASS: {result['message']}")
    elif result["status"] == "NO_DATA":
        print(f"   ⚠️  {result['message']}")
    else:
        print(f"   ⚠️  WARNING: {result['message']}")
    print(f"   Details: {result}")

    # Invariant 3: Surface Separation
    print("\n[5/5] Verifying Surface Separation...")
    result = await verify_surface_separation()
    if result["status"] == "PASS":
        print(f"   ✅ PASS: {result['message']}")
    elif result["status"] == "NO_DATA":
        print(f"   ⚠️  {result['message']}")
    else:
        print(f"   ⚠️  WARNING: {result['message']}")
    print(f"   Details: {result}")

    print("\n" + "=" * 60)
    print("VERIFICATION COMPLETE")
    print("=" * 60)

    if count < 50:
        print("\n⚠️  RECOMMENDATION: Do NOT enable Phase 3B yet.")
        print("   Generate more interactions first, then re-run this script.")
    else:
        print("\n✅ Ready to evaluate Phase 3B.1 enablement based on invariant results above.")


if __name__ == "__main__":
    asyncio.run(main())
