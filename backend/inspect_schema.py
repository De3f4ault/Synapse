import asyncio
from sqlalchemy import create_engine, inspect
from app.core.config import settings


def inspect_db():
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URI.replace("+asyncpg", ""))
    inspector = inspect(engine)
    columns = [c["name"] for c in inspector.get_columns("notes")]
    indexes = [i["name"] for i in inspector.get_indexes("notes")]

    print(f"Columns in notes table: {columns}")
    print(f"Indexes on notes table: {indexes}")

    if "journal_date" in columns:
        print("journal_date column EXISTS")
    else:
        print("journal_date column MISSING")

    if "ix_notes_journal_date" in indexes:
        print("ix_notes_journal_date index EXISTS")
    else:
        print("ix_notes_journal_date index MISSING")


if __name__ == "__main__":
    inspect_db()
