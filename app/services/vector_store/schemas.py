"""
Vector store table schemas.

Defines PyArrow schemas for different vector tables
including embeddings, documents, and metadata structures.
"""

import pyarrow as pa
from typing import Optional
from dataclasses import dataclass


@dataclass
class VectorSchema:
    """Configuration for vector table schema."""

    vector_dim: int
    include_metadata: bool = True
    include_timestamp: bool = True


def get_document_schema(vector_dim: int) -> pa.Schema:
    """
    Get schema for document embeddings table.

    Args:
        vector_dim: Embedding vector dimension

    Returns:
        pa.Schema: PyArrow schema for documents
    """
    fields = [
        pa.field("id", pa.string(), nullable=False),
        pa.field("vector", pa.list_(pa.float32(), vector_dim), nullable=False),
        pa.field("text", pa.string(), nullable=False),
        pa.field("document_id", pa.string(), nullable=False),
        pa.field("chunk_index", pa.int32(), nullable=False),
        pa.field("metadata", pa.string(), nullable=True),  # JSON string
        pa.field("created_at", pa.timestamp("ms"), nullable=False),
        pa.field("updated_at", pa.timestamp("ms"), nullable=False),
    ]

    return pa.schema(fields)


def get_query_schema(vector_dim: int) -> pa.Schema:
    """
    Get schema for query embeddings table.

    Args:
        vector_dim: Embedding vector dimension

    Returns:
        pa.Schema: PyArrow schema for queries
    """
    fields = [
        pa.field("id", pa.string(), nullable=False),
        pa.field("vector", pa.list_(pa.float32(), vector_dim), nullable=False),
        pa.field("query_text", pa.string(), nullable=False),
        pa.field("user_id", pa.string(), nullable=False),
        pa.field("session_id", pa.string(), nullable=True),
        pa.field("timestamp", pa.timestamp("ms"), nullable=False),
    ]

    return pa.schema(fields)


def get_user_embedding_schema(vector_dim: int) -> pa.Schema:
    """
    Get schema for user preference embeddings.

    Args:
        vector_dim: Embedding vector dimension

    Returns:
        pa.Schema: PyArrow schema for user embeddings
    """
    fields = [
        pa.field("user_id", pa.string(), nullable=False),
        pa.field("vector", pa.list_(pa.float32(), vector_dim), nullable=False),
        pa.field("profile_data", pa.string(), nullable=True),  # JSON string
        pa.field("interaction_count", pa.int32(), nullable=False),
        pa.field("last_updated", pa.timestamp("ms"), nullable=False),
    ]

    return pa.schema(fields)


def get_image_embedding_schema(vector_dim: int) -> pa.Schema:
    """
    Get schema for image embeddings.

    Args:
        vector_dim: Embedding vector dimension

    Returns:
        pa.Schema: PyArrow schema for images
    """
    fields = [
        pa.field("id", pa.string(), nullable=False),
        pa.field("vector", pa.list_(pa.float32(), vector_dim), nullable=False),
        pa.field("image_url", pa.string(), nullable=False),
        pa.field("caption", pa.string(), nullable=True),
        pa.field("tags", pa.list_(pa.string()), nullable=True),
        pa.field("width", pa.int32(), nullable=True),
        pa.field("height", pa.int32(), nullable=True),
        pa.field("created_at", pa.timestamp("ms"), nullable=False),
    ]

    return pa.schema(fields)


def get_table_schema(
    schema_type: str,
    vector_dim: int,
    custom_fields: Optional[list[pa.Field]] = None
) -> pa.Schema:
    """
    Get predefined or custom schema.

    Args:
        schema_type: Schema type ('document', 'query', 'user', 'image', 'custom')
        vector_dim: Vector dimension
        custom_fields: Additional fields for custom schema

    Returns:
        pa.Schema: Requested schema

    Raises:
        ValueError: If schema_type is invalid
    """
    schemas = {
        "document": get_document_schema,
        "query": get_query_schema,
        "user": get_user_embedding_schema,
        "image": get_image_embedding_schema,
    }

    if schema_type == "custom":
        if not custom_fields:
            raise ValueError("custom_fields required for custom schema")
        return pa.schema(custom_fields)

    if schema_type not in schemas:
        raise ValueError(
            f"Invalid schema_type: {schema_type}. "
            f"Must be one of: {', '.join(schemas.keys())}, custom"
        )

    return schemas[schema_type](vector_dim)


def validate_vector_data(data: dict, schema: pa.Schema) -> bool:
    """
    Validate data against schema.

    Args:
        data: Data dict to validate
        schema: PyArrow schema

    Returns:
        bool: True if valid

    Raises:
        ValueError: If validation fails
    """
    schema_fields = {field.name for field in schema}
    data_fields = set(data.keys())

    # Check for missing required fields
    missing = schema_fields - data_fields
    required_missing = {
        field.name for field in schema
        if not field.nullable and field.name in missing
    }

    if required_missing:
        raise ValueError(f"Missing required fields: {required_missing}")

    # Check for extra fields
    extra = data_fields - schema_fields
    if extra:
        raise ValueError(f"Extra fields not in schema: {extra}")

    return True
