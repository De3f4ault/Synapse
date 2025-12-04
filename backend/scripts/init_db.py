"""Initialize database - create all tables."""
import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings
from app.db.session import init_db
from app.utils.logging import get_logger, setup_logging

setup_logging()
logger = get_logger(__name__)


async def main():
    """Initialize database."""
    logger.info("starting_database_initialization", environment=settings.ENVIRONMENT)

    try:
        # Create all tables
        await init_db()
        logger.info("database_initialized", status="success")

    except Exception as e:
        logger.error("database_initialization_failed", error=str(e), exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
