"""
DuckDB client for analytics operations.

Manages DuckDB connections and provides interface for
fast analytical queries on application data.
"""

import logging
from pathlib import Path
from typing import Any, Optional, Union

import duckdb
import pandas as pd
import pyarrow as pa

logger = logging.getLogger(__name__)


class AnalyticsClient:
    """
    Client for DuckDB analytics database.

    Provides in-process OLAP capabilities with columnar storage
    and vectorized execution for fast analytical queries.
    """

    def __init__(
        self,
        database: Union[str, Path] = ":memory:",
        read_only: bool = False,
        config: Optional[dict[str, Any]] = None,
    ):
        """
        Initialize DuckDB client.

        Args:
            database: Database path or ':memory:' for in-memory
            read_only: Open in read-only mode
            config: DuckDB configuration options
        """
        self.database = str(database)
        self.read_only = read_only
        self.config = config or {}
        self._connection: Optional[duckdb.DuckDBPyConnection] = None

        logger.info(f"Initialized AnalyticsClient with database: {self.database}")

    def connect(self) -> duckdb.DuckDBPyConnection:
        """
        Establish connection to DuckDB.

        Returns:
            duckdb.DuckDBPyConnection: Active connection
        """
        if self._connection is None:
            logger.info("Establishing DuckDB connection...")

            self._connection = duckdb.connect(
                database=self.database,
                read_only=self.read_only,
                config=self.config,
            )

            # Apply common optimizations
            self._apply_optimizations()

            logger.info("DuckDB connection established successfully")

        return self._connection

    def _apply_optimizations(self) -> None:
        """Apply performance optimizations."""
        if self._connection is None:
            return

        # Set memory limit (default: 80% of available memory)
        # self._connection.execute("PRAGMA memory_limit='4GB'")

        # Enable parallel query execution
        self._connection.execute("PRAGMA threads=4")

        # Enable progress bar for long queries (optional)
        # self._connection.execute("PRAGMA enable_progress_bar=true")

        logger.debug("Applied DuckDB optimizations")

    def get_connection(self) -> duckdb.DuckDBPyConnection:
        """
        Get active connection or create new one.

        Returns:
            duckdb.DuckDBPyConnection: Database connection
        """
        return self.connect()

    def execute(
        self,
        query: str,
        parameters: Optional[tuple] = None
    ) -> duckdb.DuckDBPyRelation:
        """
        Execute SQL query.

        Args:
            query: SQL query string
            parameters: Query parameters (optional)

        Returns:
            duckdb.DuckDBPyRelation: Query result relation
        """
        conn = self.get_connection()

        try:
            if parameters:
                result = conn.execute(query, parameters)
            else:
                result = conn.execute(query)

            logger.debug(f"Executed query: {query[:100]}...")
            return result

        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            logger.error(f"Query: {query}")
            raise

    def query(
        self,
        query: str,
        parameters: Optional[tuple] = None
    ) -> pd.DataFrame:
        """
        Execute query and return as DataFrame.

        Args:
            query: SQL query string
            parameters: Query parameters (optional)

        Returns:
            pd.DataFrame: Query results
        """
        result = self.execute(query, parameters)
        return result.df()

    def query_arrow(
        self,
        query: str,
        parameters: Optional[tuple] = None
    ) -> pa.Table:
        """
        Execute query and return as Arrow table.

        Args:
            query: SQL query string
            parameters: Query parameters (optional)

        Returns:
            pa.Table: Query results as Arrow table
        """
        result = self.execute(query, parameters)
        return result.arrow()

    def register_dataframe(
        self,
        df: pd.DataFrame,
        name: str,
        replace: bool = False
    ) -> None:
        """
        Register pandas DataFrame as virtual table.

        Args:
            df: Pandas DataFrame
            name: Table name
            replace: Replace if exists
        """
        conn = self.get_connection()

        try:
            if replace and name in self.list_tables():
                conn.execute(f"DROP TABLE IF EXISTS {name}")

            conn.register(name, df)
            logger.info(f"Registered DataFrame as table: {name}")

        except Exception as e:
            logger.error(f"Failed to register DataFrame: {e}")
            raise

    def register_arrow(
        self,
        table: pa.Table,
        name: str,
        replace: bool = False
    ) -> None:
        """
        Register Arrow table as virtual table.

        Args:
            table: PyArrow Table
            name: Table name
            replace: Replace if exists
        """
        conn = self.get_connection()

        try:
            if replace and name in self.list_tables():
                conn.execute(f"DROP TABLE IF EXISTS {name}")

            conn.register(name, table)
            logger.info(f"Registered Arrow table: {name}")

        except Exception as e:
            logger.error(f"Failed to register Arrow table: {e}")
            raise

    def query_file(
        self,
        file_path: Union[str, Path],
        file_type: str = "auto"
    ) -> pd.DataFrame:
        """
        Query data file directly (CSV, Parquet, JSON).

        Args:
            file_path: Path to data file
            file_type: File type ('csv', 'parquet', 'json', 'auto')

        Returns:
            pd.DataFrame: Query results
        """
        file_path = str(file_path)

        if file_type == "auto":
            if file_path.endswith(".csv"):
                file_type = "csv"
            elif file_path.endswith(".parquet"):
                file_type = "parquet"
            elif file_path.endswith(".json"):
                file_type = "json"
            else:
                raise ValueError(f"Cannot auto-detect file type: {file_path}")

        query_map = {
            "csv": f"SELECT * FROM read_csv_auto('{file_path}')",
            "parquet": f"SELECT * FROM read_parquet('{file_path}')",
            "json": f"SELECT * FROM read_json_auto('{file_path}')",
        }

        if file_type not in query_map:
            raise ValueError(f"Unsupported file type: {file_type}")

        return self.query(query_map[file_type])

    def list_tables(self) -> list[str]:
        """
        List all tables in database.

        Returns:
            list[str]: Table names
        """
        result = self.query("SHOW TABLES")
        return result["name"].tolist() if not result.empty else []

    def table_info(self, table_name: str) -> pd.DataFrame:
        """
        Get table schema information.

        Args:
            table_name: Table name

        Returns:
            pd.DataFrame: Table schema
        """
        return self.query(f"DESCRIBE {table_name}")

    def create_table(
        self,
        name: str,
        schema: str,
        replace: bool = False
    ) -> None:
        """
        Create table with schema.

        Args:
            name: Table name
            schema: Column definitions (e.g., "id INTEGER, name VARCHAR")
            replace: Replace if exists
        """
        if replace:
            self.execute(f"DROP TABLE IF EXISTS {name}")

        self.execute(f"CREATE TABLE {name} ({schema})")
        logger.info(f"Created table: {name}")

    def insert_dataframe(
        self,
        df: pd.DataFrame,
        table_name: str,
        replace: bool = False
    ) -> None:
        """
        Insert DataFrame into table.

        Args:
            df: Pandas DataFrame
            table_name: Target table name
            replace: Replace table if exists
        """
        conn = self.get_connection()

        if replace:
            self.execute(f"DROP TABLE IF EXISTS {table_name}")
            conn.execute(f"CREATE TABLE {table_name} AS SELECT * FROM df")
        else:
            conn.execute(f"INSERT INTO {table_name} SELECT * FROM df")

        logger.info(f"Inserted {len(df)} rows into {table_name}")

    def close(self) -> None:
        """Close database connection."""
        if self._connection is not None:
            self._connection.close()
            self._connection = None
            logger.info("DuckDB connection closed")

    def __enter__(self):
        """Context manager entry."""
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()
