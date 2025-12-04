"""
BaseTool Interface

Defines the abstract base class for all SYNAPSE AI tools.
Follows DeepAgents pattern with built-in validation, timeout, and retry support.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from enum import Enum
import asyncio
import time
from pydantic import BaseModel, Field
import structlog

logger = structlog.get_logger()


class ToolExecutionError(Exception):
    """Raised when tool execution fails."""
    pass


class ToolValidationError(Exception):
    """Raised when tool input validation fails."""
    pass


class ToolPermission(str, Enum):
    """Tool permission levels."""
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    ADMIN = "admin"


class BaseTool(ABC):
    """
    Abstract base class for all AI tools.

    Inspired by DeepAgents architecture:
    - Clear input/output schemas
    - Built-in validation
    - Timeout and retry support
    - Permission checking
    - Execution tracking

    Attributes:
        name: Unique tool identifier (used in function calling)
        description: What the tool does (shown to LLM)
        version: Tool version for tracking changes
        parameters: JSON Schema for parameters
        returns: JSON Schema for return type
        requires_auth: Whether authentication is required
        required_permissions: List of permissions needed
        timeout_seconds: Maximum execution time
        retry_attempts: Number of retries on failure
    """

    def __init__(self):
        """Initialize tool with default values."""
        self._validate_tool_definition()
        self.logger = logger.bind(tool=self.name, version=self.version)

    @property
    @abstractmethod
    def name(self) -> str:
        """Tool identifier (e.g., 'create_flashcard')."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Tool description shown to LLM."""
        pass

    @property
    def version(self) -> str:
        """Tool version."""
        return "1.0.0"

    @property
    @abstractmethod
    def parameters(self) -> Dict[str, Any]:
        """
        JSON Schema for tool parameters.

        Example:
            {
                "type": "object",
                "properties": {
                    "deck_id": {"type": "integer", "description": "Deck ID"},
                    "front_text": {"type": "string", "description": "Front of card"}
                },
                "required": ["deck_id", "front_text"]
            }
        """
        pass

    @property
    def returns(self) -> Dict[str, Any]:
        """
        JSON Schema for return type.

        Default returns a result with success flag.
        """
        return {
            "type": "object",
            "properties": {
                "success": {"type": "boolean"},
                "data": {"type": "object"},
                "message": {"type": "string"}
            }
        }

    @property
    def requires_auth(self) -> bool:
        """Whether this tool requires authentication."""
        return True

    @property
    def required_permissions(self) -> List[ToolPermission]:
        """Permissions required to use this tool."""
        return [ToolPermission.READ]

    @property
    def timeout_seconds(self) -> int:
        """Maximum execution time in seconds."""
        return 30

    @property
    def retry_attempts(self) -> int:
        """Number of retry attempts on failure."""
        return 2

    @abstractmethod
    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """
        Execute the tool with given parameters.

        Args:
            user_id: ID of the user executing the tool
            **kwargs: Tool-specific parameters

        Returns:
            Dict containing:
                - success: bool
                - data: Any (tool-specific result)
                - message: str (optional error/success message)

        Raises:
            ToolExecutionError: If execution fails
            ToolValidationError: If input validation fails
        """
        pass

    async def validate_input(self, **kwargs) -> bool:
        """
        Validate input parameters against schema.

        Args:
            **kwargs: Parameters to validate

        Returns:
            True if valid

        Raises:
            ToolValidationError: If validation fails
        """
        try:
            # Extract required fields from schema
            schema = self.parameters
            required_fields = schema.get("required", [])
            properties = schema.get("properties", {})

            # Check required fields present
            for field in required_fields:
                if field not in kwargs:
                    raise ToolValidationError(
                        f"Missing required parameter: {field}"
                    )

            # Basic type checking
            for field, value in kwargs.items():
                if field in properties:
                    expected_type = properties[field].get("type")
                    actual_type = type(value).__name__

                    # Map Python types to JSON schema types
                    type_map = {
                        "str": "string",
                        "int": "integer",
                        "float": "number",
                        "bool": "boolean",
                        "list": "array",
                        "dict": "object"
                    }

                    if type_map.get(actual_type) != expected_type:
                        raise ToolValidationError(
                            f"Invalid type for {field}: expected {expected_type}, "
                            f"got {actual_type}"
                        )

            return True

        except Exception as e:
            raise ToolValidationError(f"Input validation failed: {str(e)}")

    def get_schema(self) -> Dict[str, Any]:
        """
        Get Gemini-compatible function declaration schema.

        Returns:
            Dict in format expected by Gemini function calling:
            {
                "name": "tool_name",
                "description": "What it does",
                "parameters": {...}
            }
        """
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters
        }

    async def run_with_timeout(
        self,
        user_id: int,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Execute tool with timeout protection.

        Args:
            user_id: User ID
            **kwargs: Tool parameters

        Returns:
            Execution result

        Raises:
            asyncio.TimeoutError: If execution exceeds timeout
        """
        try:
            result = await asyncio.wait_for(
                self.execute(user_id, **kwargs),
                timeout=self.timeout_seconds
            )
            return result

        except asyncio.TimeoutError:
            self.logger.error(
                "tool_timeout",
                user_id=user_id,
                timeout=self.timeout_seconds
            )
            raise ToolExecutionError(
                f"Tool execution exceeded {self.timeout_seconds}s timeout"
            )

    async def run_with_retry(
        self,
        user_id: int,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Execute tool with retry logic.

        Implements exponential backoff: 1s, 2s, 4s, ...

        Args:
            user_id: User ID
            **kwargs: Tool parameters

        Returns:
            Execution result
        """
        last_error = None

        for attempt in range(self.retry_attempts + 1):
            try:
                if attempt > 0:
                    # Exponential backoff
                    wait_time = 2 ** (attempt - 1)
                    self.logger.info(
                        "tool_retry",
                        attempt=attempt,
                        wait_seconds=wait_time
                    )
                    await asyncio.sleep(wait_time)

                result = await self.run_with_timeout(user_id, **kwargs)

                if attempt > 0:
                    self.logger.info(
                        "tool_retry_success",
                        attempt=attempt
                    )

                return result

            except Exception as e:
                last_error = e
                self.logger.warning(
                    "tool_execution_failed",
                    attempt=attempt,
                    error=str(e)
                )

                if attempt >= self.retry_attempts:
                    break

        # All attempts failed
        self.logger.error(
            "tool_all_retries_failed",
            attempts=self.retry_attempts + 1,
            final_error=str(last_error)
        )
        raise ToolExecutionError(
            f"Tool execution failed after {self.retry_attempts + 1} attempts: "
            f"{str(last_error)}"
        )

    async def __call__(
        self,
        user_id: int,
        validate: bool = True,
        retry: bool = True,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Convenience method to execute tool.

        Args:
            user_id: User ID
            validate: Whether to validate input
            retry: Whether to retry on failure
            **kwargs: Tool parameters

        Returns:
            Execution result
        """
        start_time = time.time()

        try:
            # Validate input if requested
            if validate:
                await self.validate_input(**kwargs)

            # Execute with or without retry
            if retry:
                result = await self.run_with_retry(user_id, **kwargs)
            else:
                result = await self.run_with_timeout(user_id, **kwargs)

            # Log success
            duration_ms = int((time.time() - start_time) * 1000)
            self.logger.info(
                "tool_executed",
                user_id=user_id,
                duration_ms=duration_ms,
                success=result.get("success", False)
            )

            return result

        except Exception as e:
            # Log failure
            duration_ms = int((time.time() - start_time) * 1000)
            self.logger.error(
                "tool_execution_error",
                user_id=user_id,
                duration_ms=duration_ms,
                error=str(e)
            )
            raise

    def _validate_tool_definition(self):
        """Validate that tool is properly defined."""
        try:
            # Check required properties exist
            assert self.name, "Tool name is required"
            assert self.description, "Tool description is required"
            assert self.parameters, "Tool parameters schema is required"

            # Check name follows convention (lowercase_with_underscores)
            assert self.name.islower(), "Tool name must be lowercase"
            assert "_" in self.name or self.name.isalpha(), \
                "Tool name must use underscores"

            # Check parameters is valid JSON Schema
            assert isinstance(self.parameters, dict), \
                "Parameters must be a dictionary"
            assert self.parameters.get("type") == "object", \
                "Parameters must be of type 'object'"

        except AssertionError as e:
            raise ValueError(f"Invalid tool definition: {str(e)}")

    def __repr__(self) -> str:
        return (
            f"<{self.__class__.__name__} "
            f"name='{self.name}' "
            f"version='{self.version}'>"
        )
