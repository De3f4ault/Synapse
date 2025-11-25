"""
SQL Function Executor

Helper module to execute PostgreSQL functions from Python.
"""

import json
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import structlog

logger = structlog.get_logger(__name__)


class SQLExecutor:
    """Executes SQL functions and parses results"""

    def __init__(self, session: AsyncSession):
        """
        Initialize SQL executor

        Args:
            session: AsyncSession for database operations
        """
        self.session = session

    async def execute_sql_function(
        self,
        function_name: str,
        params: Dict[str, Any]
    ) -> Any:
        """
        Execute a PostgreSQL function with parameters

        Args:
            function_name: Name of the SQL function to execute
            params: Dictionary of parameters to pass to the function

        Returns:
            Function result (parsed from JSON if applicable)

        Raises:
            Exception: If function execution fails
        """
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
                params=params
            )

            # Execute query
            result = await self.session.execute(query, params)

            # Fetch results
            rows = result.fetchall()

            # If no results, return None
            if not rows:
                logger.warning(
                    "sql_function_no_results",
                    function=function_name,
                    params=params
                )
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

        except Exception as e:
            logger.error(
                "sql_function_execution_failed",
                function=function_name,
                params=params,
                error=str(e),
                exc_info=True
            )
            raise

    async def call_build_user_context(self, user_id: int) -> Dict[str, Any]:
        """
        Call the build_user_context SQL function

        Args:
            user_id: User ID

        Returns:
            Complete user context as dict
        """
        result = await self.execute_sql_function(
            "build_user_context",
            {"p_user_id": user_id}
        )

        # Ensure we return a dict
        if result is None:
            return {}

        if isinstance(result, str):
            return json.loads(result)

        return result

    async def call_detect_weak_areas(self, user_id: int) -> List[Dict[str, Any]]:
        """
        Call the detect_weak_areas SQL function

        Args:
            user_id: User ID

        Returns:
            List of weak areas with details
        """
        result = await self.execute_sql_function(
            "detect_weak_areas",
            {"p_user_id": user_id}
        )

        # Ensure we return a list
        if result is None:
            return []

        if not isinstance(result, list):
            return [result]

        return result

    async def call_calculate_mastery(
        self,
        user_id: int,
        topic: Optional[str] = None
    ) -> Dict[str, float]:
        """
        Call the calculate_mastery SQL function

        Args:
            user_id: User ID
            topic: Optional specific topic (if None, get all topics)

        Returns:
            Dict mapping topics to mastery scores
        """
        params = {"p_user_id": user_id}
        if topic:
            params["p_topic"] = topic

        result = await self.execute_sql_function(
            "calculate_mastery",
            params
        )

        # Convert result to dict format
        if result is None:
            return {}

        if isinstance(result, list):
            # Convert list of {topic, score} to dict
            return {item["topic"]: item["score"] for item in result}

        return result
