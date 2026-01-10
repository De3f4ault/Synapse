"""
Custom SQLAlchemy types for SYNAPSE.

Includes support for PostgreSQL vector extension without requiring
the pgvector Python package as a dependency.
"""

from typing import Any, Optional

from sqlalchemy import Dialect
from sqlalchemy.types import UserDefinedType


class Vector(UserDefinedType):
    """
    SQLAlchemy type for PostgreSQL vector columns (pgvector extension).

    This is a lightweight wrapper that:
    - Tells Alembic about the vector column type
    - Allows SQLAlchemy to track the column in models
    - Does NOT require the pgvector Python package

    The actual vector operations (similarity search, etc.) are handled
    by raw SQL functions in app/sql/functions/.

    Usage:
        from app.db.types import Vector

        class Note(Base):
            embedding: Mapped[Optional[list[float]]] = mapped_column(
                Vector(1536),  # 1536 dimensions for text-embedding-3-small
                nullable=True
            )
    """

    cache_ok = True

    def __init__(self, dim: int = 1536):
        """
        Initialize Vector type with dimension.

        Args:
            dim: Number of dimensions for the vector (default: 1536 for OpenAI)
        """
        self.dim = dim

    def get_col_spec(self) -> str:
        """Return the column specification for DDL."""
        return f"vector({self.dim})"

    def bind_processor(self, dialect: Dialect):
        """Convert Python value to database value."""

        def process(value: Optional[list[float]]) -> Optional[str]:
            if value is None:
                return None
            # Convert list to PostgreSQL vector literal format: [1.0, 2.0, 3.0]
            return f"[{','.join(str(v) for v in value)}]"

        return process

    def result_processor(self, dialect: Dialect, coltype: Any):
        """Convert database value to Python value."""

        def process(value: Optional[str]) -> Optional[list[float]]:
            if value is None:
                return None
            # Parse PostgreSQL vector format: [1.0, 2.0, 3.0]
            if isinstance(value, str):
                # Remove brackets and split
                inner = value.strip("[]")
                if not inner:
                    return []
                return [float(x) for x in inner.split(",")]
            # Some drivers return as list already
            return list(value)

        return process

    def __repr__(self) -> str:
        return f"Vector({self.dim})"
