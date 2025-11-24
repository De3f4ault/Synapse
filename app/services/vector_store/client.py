"""
LanceDB client for vector database operations.

Handles connection management, table creation, and provides
a consistent interface for vector operations.
"""

import logging
from pathlib import Path
from typing import Optional, Any
from datetime import timedelta

import lancedb
from lancedb import DBConnection
from lancedb.table import Table

logger = logging.getLogger(__name__)


class VectorStoreClient:
    """
    Client for managing LanceDB vector store connections.

    Provides connection pooling, table management, and
    configuration for optimal vector operations performance.
    """

    def __init__(
        self,
        uri: str,
        *,
        api_key: Optional[str] = None,
        region: str = "us-east-1",
        read_consistency_interval: Optional[timedelta] = None,
    ):
        """
        Initialize LanceDB client.

        Args:
            uri: Database URI (local path or cloud endpoint)
            api_key: API key for LanceDB Cloud (optional)
            region: Region for LanceDB Cloud
            read_consistency_interval: Consistency check interval
        """
        self.uri = uri
        self.api_key = api_key
        self.region = region
        self.read_consistency_interval = read_consistency_interval
        self._connection: Optional[DBConnection] = None

        logger.info(f"Initialized VectorStoreClient with uri: {uri}")

    def connect(self) -> DBConnection:
        """
        Establish connection to LanceDB.

        Returns:
            DBConnection: Active database connection
        """
        if self._connection is None:
            logger.info("Establishing LanceDB connection...")

            connect_kwargs: dict[str, Any] = {"uri": self.uri}

            if self.api_key:
                connect_kwargs["api_key"] = self.api_key
                connect_kwargs["region"] = self.region

            if self.read_consistency_interval is not None:
                connect_kwargs["read_consistency_interval"] = self.read_consistency_interval

            self._connection = lancedb.connect(**connect_kwargs)
            logger.info("LanceDB connection established successfully")

        return self._connection

    def get_connection(self) -> DBConnection:
        """
        Get active connection or create new one.

        Returns:
            DBConnection: Database connection
        """
        return self.connect()

    def list_tables(self) -> list[str]:
        """
        List all tables in the database.

        Returns:
            list[str]: Table names
        """
        conn = self.get_connection()
        tables = conn.table_names()
        logger.debug(f"Found {len(tables)} tables")
        return tables

    def table_exists(self, name: str) -> bool:
        """
        Check if table exists.

        Args:
            name: Table name

        Returns:
            bool: True if table exists
        """
        return name in self.list_tables()

    def get_table(self, name: str) -> Table:
        """
        Get existing table by name.

        Args:
            name: Table name

        Returns:
            Table: LanceDB table instance

        Raises:
            ValueError: If table doesn't exist
        """
        if not self.table_exists(name):
            raise ValueError(f"Table '{name}' does not exist")

        conn = self.get_connection()
        table = conn.open_table(name)
        logger.debug(f"Opened table: {name}")
        return table

    def create_table(
        self,
        name: str,
        data: Optional[Any] = None,
        schema: Optional[Any] = None,
        mode: str = "create",
    ) -> Table:
        """
        Create new table with data or schema.

        Args:
            name: Table name
            data: Initial data (optional)
            schema: PyArrow schema (required if no data)
            mode: Creation mode ('create', 'overwrite', 'append')

        Returns:
            Table: Created table instance

        Raises:
            ValueError: If neither data nor schema provided
        """
        if data is None and schema is None:
            raise ValueError("Either data or schema must be provided")

        conn = self.get_connection()

        create_kwargs: dict[str, Any] = {
            "name": name,
            "mode": mode,
        }

        if data is not None:
            create_kwargs["data"] = data
        if schema is not None:
            create_kwargs["schema"] = schema

        table = conn.create_table(**create_kwargs)
        logger.info(f"Created table: {name} (mode={mode})")
        return table

    def drop_table(self, name: str) -> None:
        """
        Drop table from database.

        Args:
            name: Table name
        """
        conn = self.get_connection()
        conn.drop_table(name)
        logger.info(f"Dropped table: {name}")

    def close(self) -> None:
        """Close database connection."""
        if self._connection is not None:
            self._connection = None
            logger.info("LanceDB connection closed")

    def __enter__(self):
        """Context manager entry."""
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()
