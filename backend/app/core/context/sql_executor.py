"""
SQL Function Executor

Helper module to execute PostgreSQL functions from Python.

FIXED: Added transaction isolation and proper error handling
"""

import json
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, ProgrammingError
import structlog

logger = structlog.get_logger(__name__)


class SQLExecutor:
    """Executes SQL functions and parses results with transaction safety"""

    def __init__(self, session: AsyncSession):
        """
        Initialize SQL executor

        Args:
            session: AsyncSession for database operations
        """
        self.session = session

    async def execute_sql_function(
        self, function_name: str, params: Dict[str, Any], retry_on_abort: bool = True
    ) -> Any:
        """
        Execute a PostgreSQL function with parameters

        Args:
            function_name: Name of the SQL function to execute
            params: Dictionary of parameters to pass to the function
            retry_on_abort: Whether to retry if transaction is aborted

        Returns:
            Function result (parsed from JSON if applicable)

        Raises:
            Exception: If function execution fails after retries
        """
        max_retries = 2 if retry_on_abort else 1
        last_error = None

        for attempt in range(max_retries):
            try:
                # Build parameter list for SQL function call
                param_names = list(params.keys())
                param_values = list(params.values())

                # Create parameterized query
                # e.g., SELECT * FROM function_name(:param1, :param2)
                param_placeholders = ", ".join(f":{name}" for name in param_names)
                query = text(f"SELECT * FROM {function_name}({param_placeholders})")

                logger.debug(
                    "executing_sql_function",
                    function=function_name,
                    params=params,
                    attempt=attempt + 1,
                )

                # Execute query
                result = await self.session.execute(query, params)

                # Fetch results
                rows = result.fetchall()

                # If no results, return None
                if not rows:
                    logger.warning("sql_function_no_results", function=function_name, params=params)
                    return None

                # If single row with single column, return that value
                if len(rows) == 1 and len(rows[0]) == 1:
                    value = rows[0][0]

                    # Try to parse as JSON if it's a string
                    if isinstance(value, str):
                        try:
                            return json.loads(value)
                        except json.JSONDecodeError:
                            return value

                    return value

                # If single row with multiple columns, return as dict
                if len(rows) == 1:
                    return dict(rows[0]._mapping)

                # If multiple rows, return as list of dicts
                return [dict(row._mapping) for row in rows]

            except (DBAPIError, ProgrammingError) as e:
                last_error = e
                error_msg = str(e)

                # Check if this is an "aborted transaction" error
                if (
                    "InFailedSQLTransactionError" in error_msg
                    or "current transaction is aborted" in error_msg
                ):
                    logger.warning(
                        "sql_function_transaction_aborted",
                        function=function_name,
                        params=params,
                        attempt=attempt + 1,
                        max_retries=max_retries,
                    )

                    if attempt < max_retries - 1:
                        # Rollback the current transaction
                        await self.session.rollback()
                        logger.info("transaction_rolled_back", function=function_name)
                        continue
                    else:
                        logger.error(
                            "sql_function_all_retries_failed",
                            function=function_name,
                            params=params,
                            error=error_msg,
                        )
                        raise

                # For other errors, log and raise immediately
                logger.error(
                    "sql_function_execution_failed",
                    function=function_name,
                    params=params,
                    error=error_msg,
                    exc_info=True,
                )
                raise

            except Exception as e:
                logger.error(
                    "sql_function_unexpected_error",
                    function=function_name,
                    params=params,
                    error=str(e),
                    exc_info=True,
                )
                raise

        # If we exhausted all retries
        if last_error:
            raise last_error

    async def call_build_user_context(self, user_id: int) -> Dict[str, Any]:
        """
        Call the build_user_context SQL function

        Args:
            user_id: User ID

        Returns:
            Complete user context as dict
        """
        try:
            result = await self.execute_sql_function(
                "developer_schema.build_user_context", {"p_user_id": user_id}, retry_on_abort=True
            )

            # Ensure we return a dict
            if result is None:
                logger.warning("build_user_context_returned_none", user_id=user_id)
                return {}

            if isinstance(result, str):
                return json.loads(result)

            return result

        except Exception as e:
            logger.error(
                "call_build_user_context_failed", user_id=user_id, error=str(e), exc_info=True
            )
            # Return empty context on error to prevent cascading failures
            return {}

    async def call_detect_weak_areas(self, user_id: int) -> List[Dict[str, Any]]:
        """
        Call the detect_weak_areas SQL function

        Args:
            user_id: User ID

        Returns:
            List of weak areas with details
        """
        try:
            result = await self.execute_sql_function(
                "developer_schema.detect_weak_areas", {"p_user_id": user_id}, retry_on_abort=True
            )

            # Ensure we return a list
            if result is None:
                return []

            if not isinstance(result, list):
                return [result]

            return result

        except Exception as e:
            logger.error(
                "call_detect_weak_areas_failed", user_id=user_id, error=str(e), exc_info=True
            )
            return []

    async def call_calculate_mastery(
        self, user_id: int, deck_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Call the calculate_mastery_v2 SQL function (multi-signal, adaptive weights).

        Args:
            user_id: User ID
            deck_id: Optional specific deck ID

        Returns:
            List of mastery score dictionaries with flashcard + quiz signals
        """
        try:
            params = {"p_user_id": user_id}
            if deck_id is not None:
                params["p_deck_id"] = deck_id

            result = await self.execute_sql_function(
                "developer_schema.calculate_mastery_v2", params, retry_on_abort=True
            )

            # Ensure we return a list
            if result is None:
                return []

            if not isinstance(result, list):
                return [result]

            return result

        except Exception as e:
            logger.error(
                "call_calculate_mastery_failed",
                user_id=user_id,
                deck_id=deck_id,
                error=str(e),
                exc_info=True,
            )
            return []

    async def call_traverse_graph(
        self,
        user_id: int,
        start_type: str,
        start_id: int,
        max_depth: int = 3,
        link_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Call the traverse_graph SQL function (recursive CTE).

        Args:
            user_id: User scope
            start_type: Starting entity type
            start_id: Starting entity ID
            max_depth: Maximum hops
            link_type: Optional filter by link type

        Returns:
            List of reachable node dicts with depth, path, etc.
        """
        try:
            params = {
                "p_user_id": user_id,
                "p_start_type": start_type,
                "p_start_id": start_id,
                "p_max_depth": max_depth,
            }
            if link_type is not None:
                params["p_link_type"] = link_type

            result = await self.execute_sql_function(
                "developer_schema.traverse_graph",
                params,
                retry_on_abort=True,
            )

            if result is None:
                return []
            if not isinstance(result, list):
                return [result]
            return result

        except Exception as e:
            logger.error(
                "call_traverse_graph_failed",
                user_id=user_id,
                start_type=start_type,
                start_id=start_id,
                error=str(e),
                exc_info=True,
            )
            return []

    async def call_graph_metrics(
        self,
        user_id: int,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Call the graph_metrics SQL function.

        Args:
            user_id: User scope
            limit: Max nodes to return

        Returns:
            List of node metric dicts (degree, avg_strength, orphan flag, etc.)
        """
        try:
            result = await self.execute_sql_function(
                "developer_schema.graph_metrics",
                {"p_user_id": user_id, "p_limit": limit},
                retry_on_abort=True,
            )

            if result is None:
                return []
            if not isinstance(result, list):
                return [result]
            return result

        except Exception as e:
            logger.error(
                "call_graph_metrics_failed",
                user_id=user_id,
                error=str(e),
                exc_info=True,
            )
            return []
