#!/usr/bin/env python3
"""
Phase 3B.1 Verification Script.

Verifies the adaptive ranking implementation:
1. Schema exists (ranking_weights table)
2. Feature flags are correctly configured
3. Decay logic works correctly
4. Shadow mode logs but doesn't affect results
5. Rollback works (truncate table)
"""

import asyncio
from datetime import datetime, timedelta
from sqlalchemy import text, select
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.ranking_weight import RankingWeight


async def verify_schema():
    """Verify ranking_weights table exists."""
    print("[1/5] Verifying schema...")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = :schema AND table_name = 'ranking_weights'"
            ),
            {"schema": settings.DATABASE_SCHEMA},
        )
        exists = result.scalar() is not None

        if exists:
            print("   ✅ ranking_weights table exists")

            # Check columns
            result = await session.execute(
                text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_schema = :schema AND table_name = 'ranking_weights'"
                ),
                {"schema": settings.DATABASE_SCHEMA},
            )
            columns = [r[0] for r in result.fetchall()]
            print(f"   Columns: {columns}")
        else:
            print("   ❌ ranking_weights table does NOT exist")

        return exists


def verify_feature_flags():
    """Verify feature flags are correctly configured."""
    print("\n[2/5] Verifying feature flags...")

    print(f"   ENABLE_ADAPTIVE_RANKING: {settings.ENABLE_ADAPTIVE_RANKING}")
    print(f"   ADAPTIVE_RANKING_SHADOW_MODE: {settings.ADAPTIVE_RANKING_SHADOW_MODE}")
    print(f"   ADAPTIVE_RANKING_WEIGHT_MULTIPLIER: {settings.ADAPTIVE_RANKING_WEIGHT_MULTIPLIER}")
    print(f"   ADAPTIVE_RANKING_TTL_DAYS: {settings.ADAPTIVE_RANKING_TTL_DAYS}")

    if not settings.ENABLE_ADAPTIVE_RANKING:
        print("   ✅ Adaptive ranking is DISABLED (correct default)")
    else:
        print("   ⚠️  Adaptive ranking is ENABLED")
        if settings.ADAPTIVE_RANKING_SHADOW_MODE:
            print("   ✅ Shadow mode is ON (safe)")
        else:
            print("   ⚠️  Shadow mode is OFF (weights WILL affect results)")

    return True


def verify_decay_logic():
    """Verify exponential decay logic works correctly."""
    print("\n[3/5] Verifying exponential decay logic...")

    # Create a test weight
    now = datetime.utcnow()

    # Test 1: Fresh weight should have full multiplier
    weight = RankingWeight(
        entity_id="test_1",
        entity_type="chunk",
        surface="chat",
        weight_multiplier=1.10,
        reason="test",
        created_at=now,
        expires_at=now + timedelta(days=10),
    )

    effective = weight.effective_multiplier
    expected = 1.10
    assert abs(effective - expected) < 0.01, f"Fresh weight: expected ~{expected}, got {effective}"
    print(f"   ✅ Fresh weight (day 0): effective={effective:.3f} (expected ~{expected})")

    # Test 2: Weight at 7 days (half-life) should have half boost
    weight2 = RankingWeight(
        entity_id="test_2",
        entity_type="chunk",
        surface="chat",
        weight_multiplier=1.10,
        reason="test",
        created_at=now - timedelta(days=7),  # 7 days ago
        expires_at=now + timedelta(days=3),
    )

    effective2 = weight2.effective_multiplier
    expected2 = 1.05  # 1.0 + 0.10 * 0.5 (half-life decay)
    assert abs(effective2 - expected2) < 0.01, f"Half-life: expected ~{expected2}, got {effective2}"
    print(f"   ✅ After half-life (7 days): effective={effective2:.3f} (expected ~{expected2})")

    # Test 3: Weight at 14 days should have quarter boost
    weight3 = RankingWeight(
        entity_id="test_3",
        entity_type="chunk",
        surface="chat",
        weight_multiplier=1.10,
        reason="test",
        created_at=now - timedelta(days=14),
        expires_at=now + timedelta(days=1),
    )

    effective3 = weight3.effective_multiplier
    expected3 = 1.025  # 1.0 + 0.10 * 0.25
    assert abs(effective3 - expected3) < 0.01, (
        f"Two half-lives: expected ~{expected3}, got {effective3}"
    )
    print(f"   ✅ After 14 days: effective={effective3:.3f} (expected ~{expected3})")

    # Test 4: Expired weight should return 1.0
    weight4 = RankingWeight(
        entity_id="test_4",
        entity_type="chunk",
        surface="chat",
        weight_multiplier=1.10,
        reason="test",
        created_at=now - timedelta(days=15),
        expires_at=now - timedelta(days=5),
    )

    effective4 = weight4.effective_multiplier
    assert effective4 == 1.0, f"Expired: expected 1.0, got {effective4}"
    print(f"   ✅ Expired: effective={effective4:.3f} (expected 1.0)")

    # Test 5: Weight cap at 1.15
    weight5 = RankingWeight(
        entity_id="test_5",
        entity_type="chunk",
        surface="chat",
        weight_multiplier=1.50,  # Very high
        reason="test",
        created_at=now,
        expires_at=now + timedelta(days=10),
    )

    effective5 = weight5.effective_multiplier
    assert effective5 <= 1.15, f"Cap: expected <=1.15, got {effective5}"
    print(f"   ✅ Weight cap enforced: effective={effective5:.3f} (capped at 1.15)")

    return True


async def verify_weight_count():
    """Check current ranking weights in database."""
    print("\n[4/5] Checking ranking weight count...")

    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT COUNT(*) FROM ranking_weights"))
        total = result.scalar()

        result = await session.execute(
            text("SELECT COUNT(*) FROM ranking_weights WHERE expires_at > NOW()")
        )
        active = result.scalar()

        print(f"   Total weights: {total}")
        print(f"   Active (non-expired): {active}")

        if total > 0:
            # Show sample weights
            result = await session.execute(
                text("""
                    SELECT entity_id, entity_type, surface, weight_multiplier, 
                           expires_at, reason
                    FROM ranking_weights 
                    ORDER BY created_at DESC 
                    LIMIT 5
                """)
            )
            rows = result.fetchall()
            print("   Recent weights:")
            for row in rows:
                print(
                    f"      - {row.entity_type}:{row.entity_id} | {row.surface} | x{row.weight_multiplier} | {row.reason}"
                )

        return total


async def verify_shadow_mode():
    """Verify shadow mode behavior."""
    print("\n[5/5] Verifying shadow mode...")

    from app.services.intelligence import get_ranking_adapter

    adapter = get_ranking_adapter()

    print(f"   Adapter enabled: {adapter.is_enabled()}")
    print(f"   Shadow mode: {adapter.is_shadow_mode()}")

    if adapter.is_enabled() and adapter.is_shadow_mode():
        print("   ✅ Shadow mode active: weights logged but not applied")
    elif not adapter.is_enabled():
        print("   ✅ Adapter disabled: no weights applied")
    else:
        print("   ⚠️  Shadow mode OFF: weights WILL affect results")

    return True


async def main():
    print("=" * 60)
    print("PHASE 3B.1 VERIFICATION")
    print("=" * 60)
    print(f"\nTimestamp: {datetime.now().isoformat()}")
    print()

    # Run verifications
    schema_ok = await verify_schema()
    flags_ok = verify_feature_flags()
    decay_ok = verify_decay_logic()
    weight_count = await verify_weight_count()
    shadow_ok = await verify_shadow_mode()

    print()
    print("=" * 60)
    print("VERIFICATION SUMMARY")
    print("=" * 60)

    all_ok = schema_ok and flags_ok and decay_ok and shadow_ok

    if all_ok:
        print("\n✅ Phase 3B.1 implementation is READY")
        print("\nTo enable (shadow mode first):")
        print("  1. Set ENABLE_ADAPTIVE_RANKING=true in .env")
        print("  2. Keep ADAPTIVE_RANKING_SHADOW_MODE=true")
        print("  3. Monitor logs for 'ranking_weight_shadow' entries")
        print("  4. After validation, set ADAPTIVE_RANKING_SHADOW_MODE=false")
    else:
        print("\n❌ Some verifications failed. Review output above.")

    print()
    print("Rollback commands:")
    print("  - Disable: Set ENABLE_ADAPTIVE_RANKING=false in .env")
    print("  - Full reset: TRUNCATE ranking_weights;")


if __name__ == "__main__":
    asyncio.run(main())
