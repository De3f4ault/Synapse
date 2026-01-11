import asyncio
import sys
from pathlib import Path
from sqlalchemy import text

# Add parent directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings
from app.db.session import async_session_maker


async def verify_schema():
    print(f"Connecting to database: {settings.DATABASE_URL}")

    async with async_session_maker() as session:
        # Check if table exists
        result = await session.execute(
            text(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'developer_schema' AND table_name = 'intelligence_adaptation_log';"
            )
        )
        table = result.scalar()

        if not table:
            print(
                "❌ FAILURE: Table 'intelligence_adaptation_log' does NOT exist in 'developer_schema'."
            )
            return

        print(f"✅ SUCCESS: Table '{table}' found.")

        # Check columns
        result = await session.execute(
            text(
                "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'developer_schema' AND table_name = 'intelligence_adaptation_log';"
            )
        )
        columns = result.fetchall()

        print("Columns found:")
        expected_cols = {
            "id",
            "timestamp",
            "source_event_id",
            "surface",
            "entity_id",
            "entity_type",
            "signal_type",
            "learning_value",
            "confidence_weight",
            "applied_actions",
        }
        found_cols = set()

        for col in columns:
            print(f"  - {col[0]} ({col[1]})")
            found_cols.add(col[0])

        missing = expected_cols - found_cols
        if missing:
            print(f"❌ FAILURE: Missing columns: {missing}")
        else:
            print("✅ SUCCESS: All expected columns are present.")


if __name__ == "__main__":
    asyncio.run(verify_schema())
