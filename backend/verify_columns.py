import asyncio
from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings


async def check_columns():
    database_url = str(settings.SQLALCHEMY_DATABASE_URI)
    engine = create_async_engine(database_url)

    async with engine.connect() as conn:
        result = await conn.execute(
            text("SELECT column_name FROM information_schema.columns WHERE table_name = 'notes';")
        )
        columns = [row[0] for row in result.fetchall()]

        print(f"Columns in 'notes' table: {columns}")
        if "editor_version" in columns:
            print("SUCCESS: 'editor_version' column FOUND.")
        else:
            print("FAILURE: 'editor_version' column MISSING.")


if __name__ == "__main__":
    asyncio.run(check_columns())
