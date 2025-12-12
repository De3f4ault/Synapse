"""
Tool Registry

Singleton registry for managing all AI tools.
Provides tool discovery, registration, and Gemini function declaration generation.
"""

from typing import Dict, List, Optional
from .base import BaseTool, ToolPermission
import structlog

logger = structlog.get_logger()


class ToolRegistry:
    """
    Singleton registry for AI tools.

    Manages tool registration, discovery, and schema generation for Gemini.
    Thread-safe singleton pattern.
    """

    _instance = None
    _initialized = False

    def __new__(cls):
        """Ensure singleton instance."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize registry (only once)."""
        if not self._initialized:
            self._tools: Dict[str, BaseTool] = {}
            self._tools_by_permission: Dict[ToolPermission, List[str]] = {
                perm: [] for perm in ToolPermission
            }
            self.logger = logger.bind(component="tool_registry")
            ToolRegistry._initialized = True

    def register_tool(self, tool: BaseTool) -> None:
        """
        Register a tool in the registry.

        Args:
            tool: Tool instance to register

        Raises:
            ValueError: If tool with same name already registered
        """
        if tool.name in self._tools:
            self.logger.warning(
                "tool_already_registered",
                tool_name=tool.name,
                action="overwriting"
            )

        # Register tool
        self._tools[tool.name] = tool

        # Index by permissions
        for permission in tool.required_permissions:
            if tool.name not in self._tools_by_permission[permission]:
                self._tools_by_permission[permission].append(tool.name)

        self.logger.info(
            "tool_registered",
            tool_name=tool.name,
            version=tool.version,
            permissions=[p.value for p in tool.required_permissions],
            requires_auth=tool.requires_auth
        )

    def unregister_tool(self, name: str) -> bool:
        """
        Remove a tool from the registry.

        Args:
            name: Tool name to remove

        Returns:
            True if tool was removed, False if not found
        """
        if name not in self._tools:
            return False

        tool = self._tools[name]

        # Remove from permission indexes
        for permission in tool.required_permissions:
            if name in self._tools_by_permission[permission]:
                self._tools_by_permission[permission].remove(name)

        # Remove from main registry
        del self._tools[name]

        self.logger.info("tool_unregistered", tool_name=name)
        return True

    def get_tool(self, name: str) -> Optional[BaseTool]:
        """
        Get a tool by name.

        Args:
            name: Tool name

        Returns:
            Tool instance or None if not found
        """
        return self._tools.get(name)

    def get_all_tools(self) -> List[BaseTool]:
        """
        Get all registered tools.

        Returns:
            List of all tool instances
        """
        return list(self._tools.values())

    def get_tool_names(self) -> List[str]:
        """
        Get names of all registered tools.

        Returns:
            List of tool names
        """
        return list(self._tools.keys())

    def get_tools_for_user(
        self,
        user_id: int,
        user_permissions: List[ToolPermission]
    ) -> List[BaseTool]:
        """
        Get tools accessible to a user based on their permissions.

        Args:
            user_id: User ID (for logging)
            user_permissions: List of user's permissions

        Returns:
            List of tools user can access
        """
        accessible_tools = []

        for tool in self._tools.values():
            # Check if user has all required permissions
            has_access = all(
                perm in user_permissions
                for perm in tool.required_permissions
            )

            if has_access:
                accessible_tools.append(tool)

        self.logger.debug(
            "tools_filtered_for_user",
            user_id=user_id,
            user_permissions=[p.value for p in user_permissions],
            accessible_count=len(accessible_tools),
            total_count=len(self._tools)
        )

        return accessible_tools

    def get_tools_by_permission(
        self,
        permission: ToolPermission
    ) -> List[BaseTool]:
        """
        Get all tools requiring a specific permission.

        Args:
            permission: Permission to filter by

        Returns:
            List of tools requiring this permission
        """
        tool_names = self._tools_by_permission.get(permission, [])
        return [self._tools[name] for name in tool_names if name in self._tools]

    def generate_function_declarations(
        self,
        tools: Optional[List[BaseTool]] = None
    ) -> List[Dict]:
        """
        Generate Gemini-compatible function declarations.

        This is the key method for integrating tools with Gemini's
        function calling feature.

        Args:
            tools: List of specific tools to include, or None for all

        Returns:
            List of function declarations in Gemini format:
            [
                {
                    "name": "tool_name",
                    "description": "What it does",
                    "parameters": {...}
                },
                ...
            ]

        Example usage with Gemini:
            >>> registry = ToolRegistry()
            >>> declarations = registry.generate_function_declarations()
            >>>
            >>> model = genai.GenerativeModel(
            ...     "gemini-1.5-flash",
            ...     tools=declarations
            ... )
        """
        if tools is None:
            tools = self.get_all_tools()

        declarations = []

        for tool in tools:
            try:
                schema = tool.get_schema()
                declarations.append(schema)

            except Exception as e:
                self.logger.error(
                    "failed_to_generate_declaration",
                    tool_name=tool.name,
                    error=str(e)
                )

        self.logger.info(
            "function_declarations_generated",
            count=len(declarations),
            tool_names=[d["name"] for d in declarations]
        )

        return declarations

    def tool_exists(self, name: str) -> bool:
        """
        Check if a tool is registered.

        Args:
            name: Tool name to check

        Returns:
            True if tool exists, False otherwise
        """
        return name in self._tools

    def clear_registry(self) -> None:
        """
        Clear all registered tools.

        Warning: This is mainly for testing. Use with caution.
        """
        count = len(self._tools)
        self._tools.clear()

        for permission in ToolPermission:
            self._tools_by_permission[permission].clear()

        self.logger.warning("registry_cleared", tools_removed=count)

    def get_registry_stats(self) -> Dict:
        """
        Get statistics about the registry.

        Returns:
            Dict with registry statistics
        """
        return {
            "total_tools": len(self._tools),
            "tools_by_permission": {
                perm.value: len(tools)
                for perm, tools in self._tools_by_permission.items()
            },
            "tools_requiring_auth": sum(
                1 for tool in self._tools.values()
                if tool.requires_auth
            ),
            "tool_names": list(self._tools.keys())
        }

    def __repr__(self) -> str:
        return f"<ToolRegistry tools={len(self._tools)}>"

    def __len__(self) -> int:
        """Return number of registered tools."""
        return len(self._tools)

    def __contains__(self, name: str) -> bool:
        """Check if tool is registered."""
        return name in self._tools

    def __iter__(self):
        """Iterate over registered tools."""
        return iter(self._tools.values())


# Convenience function for getting singleton instance
def get_registry() -> ToolRegistry:
    """
    Get the global tool registry instance.

    Returns:
        ToolRegistry singleton
    """
    return ToolRegistry()
