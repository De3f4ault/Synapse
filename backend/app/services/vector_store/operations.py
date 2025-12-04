"""
Vector store operations for insert, search, and delete.

Provides high-level operations for working with vector data
including similarity search, filtering, and batch operations.
"""

import logging
from typing import Any, Optional, Union

import pyarrow as pa
from lancedb.table import Table

logger = logging.getLogger(__name__)


class VectorOperations:
    """
    High-level operations for vector store manipulation.

    Handles common patterns like similarity search, filtering,
    batch inserts, and deletions with proper error handling.
    """

    def __init__(self, table: Table):
        """
        Initialize operations for a table.

        Args:
            table: LanceDB table instance
        """
        self.table = table
        self.table_name = table.name
        logger.debug(f"Initialized VectorOperations for table: {self.table_name}")

    def insert(
        self,
        data: Union[list[dict[str, Any]], pa.Table],
        mode: str = "append"
    ) -> None:
        """
        Insert data into table.

        Args:
            data: Data to insert (list of dicts or PyArrow table)
            mode: Insert mode ('append' or 'overwrite')
        """
        try:
            self.table.add(data, mode=mode)
            count = len(data) if isinstance(data, list) else len(data)
            logger.info(f"Inserted {count} records into {self.table_name} (mode={mode})")
        except Exception as e:
            logger.error(f"Failed to insert data into {self.table_name}: {e}")
            raise

    def search(
        self,
        query_vector: list[float],
        limit: int = 10,
        filter_expr: Optional[str] = None,
        select_columns: Optional[list[str]] = None,
    ) -> list[dict[str, Any]]:
        """
        Perform vector similarity search.

        Args:
            query_vector: Query embedding vector
            limit: Maximum results to return
            filter_expr: SQL-like filter expression
            select_columns: Columns to return (None = all)

        Returns:
            list[dict]: Search results with scores
        """
        try:
            query = self.table.search(query_vector).limit(limit)

            if filter_expr:
                query = query.where(filter_expr)

            if select_columns:
                query = query.select(select_columns)

            results = query.to_list()
            logger.debug(f"Vector search returned {len(results)} results from {self.table_name}")
            return results

        except Exception as e:
            logger.error(f"Vector search failed on {self.table_name}: {e}")
            raise

    def hybrid_search(
        self,
        query_vector: list[float],
        query_text: str,
        limit: int = 10,
        filter_expr: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        """
        Perform hybrid vector + full-text search.

        Args:
            query_vector: Query embedding vector
            query_text: Full-text search query
            limit: Maximum results to return
            filter_expr: SQL-like filter expression

        Returns:
            list[dict]: Hybrid search results
        """
        try:
            # LanceDB hybrid search combining vector and FTS
            query = (
                self.table.search(query_vector, query_type="hybrid")
                .limit(limit)
            )

            if filter_expr:
                query = query.where(filter_expr)

            results = query.to_list()
            logger.debug(f"Hybrid search returned {len(results)} results from {self.table_name}")
            return results

        except Exception as e:
            logger.error(f"Hybrid search failed on {self.table_name}: {e}")
            raise

    def delete(self, filter_expr: str) -> None:
        """
        Delete records matching filter.

        Args:
            filter_expr: SQL-like filter expression
        """
        try:
            self.table.delete(filter_expr)
            logger.info(f"Deleted records from {self.table_name} where: {filter_expr}")
        except Exception as e:
            logger.error(f"Delete failed on {self.table_name}: {e}")
            raise

    def update(
        self,
        updates: dict[str, Any],
        filter_expr: Optional[str] = None
    ) -> None:
        """
        Update records in table.

        Args:
            updates: Column updates as dict
            filter_expr: SQL-like filter (None = all records)
        """
        try:
            if filter_expr:
                self.table.update(where=filter_expr, values=updates)
            else:
                self.table.update(values=updates)

            logger.info(f"Updated records in {self.table_name}")
        except Exception as e:
            logger.error(f"Update failed on {self.table_name}: {e}")
            raise

    def count(self, filter_expr: Optional[str] = None) -> int:
        """
        Count records in table.

        Args:
            filter_expr: Optional filter expression

        Returns:
            int: Record count
        """
        try:
            if filter_expr:
                # Count with filter
                result = self.table.search().where(filter_expr).to_arrow()
                count = len(result)
            else:
                count = self.table.count_rows()

            logger.debug(f"Count for {self.table_name}: {count}")
            return count

        except Exception as e:
            logger.error(f"Count failed on {self.table_name}: {e}")
            raise

    def create_index(
        self,
        column: str = "vector",
        index_type: str = "IVF_PQ",
        num_partitions: Optional[int] = None,
        num_sub_vectors: Optional[int] = None,
    ) -> None:
        """
        Create vector index for faster search.

        Args:
            column: Vector column name
            index_type: Index type ('IVF_PQ', 'IVF_FLAT', etc.)
            num_partitions: Number of IVF partitions
            num_sub_vectors: Number of PQ sub-vectors
        """
        try:
            index_config = {"type": index_type}

            if num_partitions:
                index_config["num_partitions"] = num_partitions
            if num_sub_vectors:
                index_config["num_sub_vectors"] = num_sub_vectors

            self.table.create_index(
                column=column,
                config=index_config
            )
            logger.info(f"Created {index_type} index on {self.table_name}.{column}")

        except Exception as e:
            logger.error(f"Index creation failed on {self.table_name}: {e}")
            raise

    def compact(self) -> None:
        """Compact table to optimize storage."""
        try:
            self.table.compact_files()
            logger.info(f"Compacted table: {self.table_name}")
        except Exception as e:
            logger.error(f"Compaction failed on {self.table_name}: {e}")
            raise

    def get_schema(self) -> pa.Schema:
        """
        Get table schema.

        Returns:
            pa.Schema: PyArrow schema
        """
        return self.table.schema
