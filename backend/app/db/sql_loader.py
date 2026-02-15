"""
SQL function loader - Deploy SQL functions from files to PostgreSQL.

This module handles:
- Scanning SQL function directories
- Reading SQL files
- Executing SQL functions in PostgreSQL
- Error handling and logging
- Deployment tracking
"""

import asyncio
from pathlib import Path
from typing import Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import engine
from app.utils.logging import get_logger

logger = get_logger(__name__)


class SQLFunctionLoader:
    """
    Loads and executes SQL functions from the app/sql directory.

    Scans directories recursively for .sql files and executes them
    in dependency order.
    """

    def __init__(self, sql_root: Path = None):
        """
        Initialize the SQL function loader.

        Args:
            sql_root: Root directory containing SQL files (default: app/sql)
        """
        self.sql_root = sql_root or Path(__file__).parent.parent / "sql"
        self.loaded_functions: Dict[str, bool] = {}

    def _get_sql_files(self, directory: str = "functions") -> List[Path]:
        """
        Recursively scan directory for SQL files.

        Args:
            directory: Subdirectory to scan (default: functions)

        Returns:
            List of Path objects for .sql files, sorted alphabetically
        """
        sql_dir = self.sql_root / directory

        if not sql_dir.exists():
            logger.warning(
                "sql_directory_not_found",
                directory=str(sql_dir),
            )
            return []

        # Recursively find all .sql files
        sql_files = list(sql_dir.rglob("*.sql"))

        # Sort to ensure consistent loading order
        sql_files.sort()

        logger.info(
            "sql_files_discovered",
            directory=directory,
            count=len(sql_files),
        )

        return sql_files

    def _read_sql_file(self, file_path: Path) -> Optional[str]:
        """
        Read SQL file contents.

        Args:
            file_path: Path to SQL file

        Returns:
            SQL content as string, or None if read fails
        """
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Skip empty files
            if not content.strip():
                logger.warning(
                    "empty_sql_file",
                    file=str(file_path),
                )
                return None

            return content

        except Exception as e:
            logger.error(
                "sql_file_read_failed",
                file=str(file_path),
                error=str(e),
            )
            return None

    async def _execute_sql(
        self,
        sql: str,
        file_name: str,
        session: AsyncSession,
    ) -> bool:
        """
        Execute SQL statement(s) directly without prepared statements.

        For DDL scripts with multiple commands, we need to use asyncpg's
        raw connection execute() method WITHOUT parameters, which allows
        multiple statements in one call.

        Args:
            sql: SQL statement(s) to execute
            file_name: Name of file (for logging)
            session: Database session

        Returns:
            True if successful, False otherwise
        """
        try:
            # Get the raw asyncpg connection
            connection = await session.connection()
            raw_conn = await connection.get_raw_connection()

            # CRITICAL: Execute without parameters to allow multiple commands
            # asyncpg only allows multiple statements when no parameters are passed
            await raw_conn.driver_connection.execute(sql)

            await session.commit()

            logger.info(
                "sql_function_loaded",
                file=file_name,
            )

            return True

        except Exception as e:
            await session.rollback()

            logger.error(
                "sql_function_load_failed",
                file=file_name,
                error=repr(e),
            )

            return False

    async def load_functions(
        self,
        directory: str = "functions",
        fail_fast: bool = False,
    ) -> Dict[str, bool]:
        """
        Load all SQL functions from specified directory.

        Batches all SQL files in the directory into a single transaction for speed.
        Falls back to individual execution on failure to identify the specific file.

        Args:
            directory: Directory to scan (default: functions)
            fail_fast: If True, stop on first error (default: False)

        Returns:
            Dict mapping file names to success status
        """
        logger.info(
            "loading_sql_functions",
            directory=directory,
        )

        # Get all SQL files
        sql_files = self._get_sql_files(directory)

        if not sql_files:
            logger.warning("no_sql_files_found", directory=directory)
            return {}

        results: Dict[str, bool] = {}

        # Read all SQL files first
        file_contents: list[tuple[Path, str, str]] = []  # (path, relative_path, content)
        for sql_file in sql_files:
            relative_path = str(sql_file.relative_to(self.sql_root))
            sql_content = self._read_sql_file(sql_file)

            if sql_content is None:
                results[relative_path] = False
                if fail_fast:
                    return results
                continue

            file_contents.append((sql_file, relative_path, sql_content))

        if not file_contents:
            return results

        # Try batch execution: concatenate all files with delimiter comments
        batch_sql = "\n".join(
            f"-- FILE: {rel_path}\n{content}" for _, rel_path, content in file_contents
        )

        async with AsyncSession(engine) as session:
            batch_success = await self._execute_sql(
                batch_sql,
                f"batch:{directory} ({len(file_contents)} files)",
                session,
            )

            if batch_success:
                # All files succeeded as a batch
                for _, rel_path, _ in file_contents:
                    results[rel_path] = True
                    self.loaded_functions[rel_path] = True
            else:
                # Batch failed — fall back to individual execution for diagnostics
                logger.warning(
                    "sql_batch_failed_falling_back",
                    directory=directory,
                    file_count=len(file_contents),
                )
                for _, rel_path, sql_content in file_contents:
                    success = await self._execute_sql(
                        sql_content,
                        rel_path,
                        session,
                    )
                    results[rel_path] = success
                    self.loaded_functions[rel_path] = success

                    if not success and fail_fast:
                        logger.error(
                            "stopping_due_to_error",
                            file=rel_path,
                        )
                        break

        # Log summary
        success_count = sum(1 for v in results.values() if v)
        failure_count = len(results) - success_count

        logger.info(
            "sql_functions_load_complete",
            total=len(results),
            success=success_count,
            failed=failure_count,
            batched=batch_success if "batch_success" in dir() else False,
        )

        return results

    async def load_views(self) -> Dict[str, bool]:
        """
        Load materialized views from sql/views directory.

        Returns:
            Dict mapping file names to success status
        """
        return await self.load_functions(directory="views")

    async def load_tables(self) -> Dict[str, bool]:
        """
        Load table definitions from sql/tables directory.

        Creates UNLOGGED cache tables, event bus tables, etc.
        Uses IF NOT EXISTS, so safe to run on every startup.

        Returns:
            Dict mapping file names to success status
        """
        return await self.load_functions(directory="tables")


# Module-level function for easy import
async def load_sql_functions(
    fail_fast: bool = False,
    load_views: bool = True,
) -> bool:
    """
    Load all SQL tables, functions, and optionally views.

    This is the main entry point for loading SQL during
    application startup. Order: tables -> functions -> views.

    Args:
        fail_fast: Stop on first error (default: False)
        load_views: Also load materialized views (default: True)

    Returns:
        True if all loaded successfully, False otherwise

    Usage:
        @app.on_event("startup")
        async def startup():
            await load_sql_functions()
    """
    loader = SQLFunctionLoader()

    all_success = True

    # Load tables first (cache infrastructure, event bus, etc.)
    table_results = await loader.load_tables()
    all_success = all_success and (all(table_results.values()) if table_results else True)

    # Load functions
    function_results = await loader.load_functions(fail_fast=fail_fast)

    all_success = all(function_results.values()) if function_results else True

    # Load views if requested
    if load_views:
        view_results = await loader.load_views()
        all_success = all_success and (all(view_results.values()) if view_results else True)

    if not all_success:
        logger.warning(
            "sql_load_completed_with_errors",
            check_logs=True,
        )

    return all_success


# Utility function to reload functions in development
async def reload_sql_functions() -> bool:
    """
    Reload all SQL functions (useful in development).

    This drops and recreates all functions.

    Returns:
        True if successful, False otherwise

    Warning:
        This will drop all existing functions. Use with caution.
    """
    logger.info("reloading_sql_functions")

    # In production, you might want to use migrations instead
    if settings.ENVIRONMENT == "production":
        logger.error(
            "reload_not_allowed_in_production",
            environment=settings.ENVIRONMENT,
        )
        return False

    # Drop schema cascade to remove all functions
    # Then reload
    async with AsyncSession(engine) as session:
        try:
            # Note: This is destructive and should only be used in development
            await session.execute(text(f"DROP SCHEMA IF EXISTS {settings.DATABASE_SCHEMA} CASCADE"))
            await session.execute(text(f"CREATE SCHEMA {settings.DATABASE_SCHEMA}"))
            await session.commit()

            logger.info("schema_recreated", schema=settings.DATABASE_SCHEMA)

        except Exception as e:
            await session.rollback()
            logger.error("schema_recreation_failed", error=str(e))
            return False

    # Reload functions
    return await load_sql_functions()
