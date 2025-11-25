"""
Vector store service using LanceDB.

Provides vector database capabilities for similarity search,
embeddings storage, and retrieval operations.
"""

from .client import VectorStoreClient
from .operations import VectorOperations
from .schemas import get_table_schema, VectorSchema

__all__ = [
    "VectorStoreClient",
    "VectorOperations",
    "get_table_schema",
    "VectorSchema",
]
