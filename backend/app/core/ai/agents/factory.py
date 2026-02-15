"""
Agent Factory - Create and configure agents

Provides:
- Agent instantiation with dependency injection
- Configuration loading
- Middleware attachment
- Tool loading

Based on Factory pattern for clean agent creation.
"""

from typing import Dict, Any, List, Optional, Type
import structlog
from app.core.ai.registry.models import DEFAULT_CHAT_MODEL, DEFAULT_GENERATION_MODEL
from pathlib import Path

from app.core.ai.agents.base_agent import BaseAgent, AgentConfig, AgentCapability
from app.core.ai.agents.middleware import GroundingMiddleware
from app.core.ai.tools.registry import ToolRegistry
from langchain_core.tools import BaseTool

logger = structlog.get_logger(__name__)


class AgentFactory:
    """
    Factory for creating agents with proper configuration

    Usage:
        factory = AgentFactory()

        # Create with config dict
        agent = await factory.create("tutor", config={...})

        # Create with defaults
        agent = await factory.create_default("tutor")
    """

    def __init__(self, tool_registry: Optional[ToolRegistry] = None):
        """
        Initialize factory

        Args:
            tool_registry: Tool registry for loading tools
        """
        self.tool_registry = tool_registry or ToolRegistry()
        self.logger = logger.bind(component="agent_factory")

        # Agent class registry
        self._agent_classes: Dict[str, Type[BaseAgent]] = {}

    def register_agent_class(self, name: str, agent_class: Type[BaseAgent]) -> None:
        """
        Register agent class for factory creation

        Args:
            name: Agent identifier
            agent_class: Agent class to register
        """
        self._agent_classes[name] = agent_class
        self.logger.info("agent_class_registered", agent=name)

    async def create(
        self,
        agent_name: str,
        config: Optional[Dict[str, Any]] = None,
        tools: Optional[List[str]] = None,
        middleware: Optional[List[Any]] = None,
    ) -> BaseAgent:
        """
        Create agent instance

        Args:
            agent_name: Name of agent to create
            config: Configuration overrides
            tools: List of tool names to attach
            middleware: Middleware instances to attach

        Returns:
            Configured agent instance

        Raises:
            ValueError: If agent class not registered
        """
        if agent_name not in self._agent_classes:
            raise ValueError(
                f"Agent '{agent_name}' not registered. "
                f"Available: {list(self._agent_classes.keys())}"
            )

        self.logger.info("creating_agent", agent=agent_name)

        # Build agent config
        agent_config = await self._build_config(
            agent_name, config or {}, tools or [], middleware or []
        )

        # Instantiate agent
        agent_class = self._agent_classes[agent_name]
        agent = agent_class(agent_config)

        self.logger.info(
            "agent_created",
            agent=agent_name,
            tools_count=len(agent_config.tools),
            middleware_count=len(agent_config.middleware),
        )

        return agent

    async def create_default(self, agent_name: str) -> BaseAgent:
        """
        Create agent with default configuration

        Args:
            agent_name: Name of agent to create

        Returns:
            Agent with default config
        """
        return await self.create(agent_name)

    async def _build_config(
        self,
        agent_name: str,
        config_overrides: Dict[str, Any],
        tool_names: List[str],
        middleware_instances: List[Any],
    ) -> AgentConfig:
        """
        Build complete agent configuration

        Args:
            agent_name: Agent name
            config_overrides: User-provided config
            tool_names: Tool names to load
            middleware_instances: Middleware to attach

        Returns:
            Complete AgentConfig
        """
        # Default configuration
        base_config = self._get_default_config(agent_name)

        # Apply overrides
        base_config.update(config_overrides)

        # Combine default tools with explicitly provided tools
        all_tool_names = list(base_config.get("default_tools", []))
        for tool_name in tool_names:
            if tool_name not in all_tool_names:
                all_tool_names.append(tool_name)

        # Load tools from registry
        tools = self._load_tools(all_tool_names)

        # Combine default middleware with explicitly provided middleware
        default_middleware = base_config.get("default_middleware", [])
        all_middleware = default_middleware + middleware_instances

        # Build AgentConfig
        return AgentConfig(
            name=agent_name,
            display_name=base_config.get("display_name", agent_name.title()),
            description=base_config.get("description", ""),
            capabilities=base_config.get("capabilities", []),
            system_prompt=base_config.get("system_prompt", ""),
            model=base_config.get("model", DEFAULT_CHAT_MODEL),
            temperature=base_config.get("temperature", 0.0),
            max_iterations=base_config.get("max_iterations", 10),
            max_tokens=base_config.get("max_tokens", 8000),
            timeout_seconds=base_config.get("timeout_seconds", 120),
            retry_attempts=base_config.get("retry_attempts", 3),
            tools=tools,
            middleware=all_middleware,
            enable_memory=base_config.get("enable_memory", False),
            memory_type=base_config.get("memory_type", "buffer"),
            verbose=base_config.get("verbose", False),
        )

    def _get_default_config(self, agent_name: str) -> Dict[str, Any]:
        """
        Get default configuration for agent

        Args:
            agent_name: Agent name

        Returns:
            Default configuration dict
        """
        defaults = {
            "tutor": {
                "display_name": "AI Tutor",
                "description": "Patient AI tutor using Socratic questioning",
                "capabilities": [
                    AgentCapability.CHAT,
                    AgentCapability.TOOL_USE,
                    AgentCapability.MEMORY,
                ],
                "model": DEFAULT_CHAT_MODEL,
                "temperature": 0.3,  # Slightly creative for teaching
                "max_iterations": 8,
                "default_tools": [
                    "search_notes",  # RAG: Search user's notes
                    "search_flashcards",  # RAG: Search flashcards
                    "analyze_document",  # RAG: Deep document analysis
                ],
                "default_middleware": [
                    GroundingMiddleware(),  # Inject RAG evidence for grounding
                ],
            },
            "document": {
                "display_name": "Document Analyst",
                "description": "Analyzes documents and extracts insights",
                "capabilities": [
                    AgentCapability.CHAT,
                    AgentCapability.TOOL_USE,
                    AgentCapability.FILE_ACCESS,
                ],
                "model": DEFAULT_GENERATION_MODEL,  # Use Pro for complex analysis
                "temperature": 0.0,
                "max_iterations": 5,
            },
            "quiz": {
                "display_name": "Quiz Generator",
                "description": "Generates high-quality quiz questions",
                "capabilities": [AgentCapability.CHAT, AgentCapability.TOOL_USE],
                "model": DEFAULT_CHAT_MODEL,
                "temperature": 0.5,  # Creative for varied questions
                "max_iterations": 5,
            },
            "dashboard": {
                "display_name": "Dashboard Orchestrator",
                "description": "All-knowing AI assistant with full system access",
                "capabilities": [
                    AgentCapability.CHAT,
                    AgentCapability.TOOL_USE,
                    AgentCapability.MEMORY,
                    AgentCapability.PLANNING,
                    AgentCapability.FILE_ACCESS,
                ],
                "model": DEFAULT_CHAT_MODEL,  # Fast model for orchestration
                "temperature": 0.4,  # Balanced creativity
                "max_iterations": 12,  # Allow complex operations
            },
            "general": {
                "display_name": "AI Assistant",
                "description": "Helpful AI assistant with direct, clear answers",
                "capabilities": [
                    AgentCapability.CHAT,
                    AgentCapability.TOOL_USE,
                    AgentCapability.MEMORY,
                ],
                "temperature": 0.4,  # Natural conversational tone
                "max_iterations": 6,
                "default_tools": [
                    "search_notes",
                    "search_flashcards",
                ],
                "default_middleware": [
                    GroundingMiddleware(),
                ],
            },
        }

        return defaults.get(agent_name, {})

    def _load_tools(self, tool_names: List[str]) -> List[BaseTool]:
        """
        Load tools from registry

        Args:
            tool_names: List of tool names

        Returns:
            List of tool instances
        """
        tools = []
        for tool_name in tool_names:
            try:
                tool = self.tool_registry.get_tool(tool_name)
                tools.append(tool)
            except Exception as e:
                self.logger.warning("tool_load_failed", tool=tool_name, error=str(e))
        return tools

    def get_available_agents(self) -> List[str]:
        """
        Get list of registered agent names

        Returns:
            List of agent names
        """
        return list(self._agent_classes.keys())


# Global factory instance
_factory: Optional[AgentFactory] = None


def get_agent_factory() -> AgentFactory:
    """Get global agent factory instance"""
    global _factory
    if _factory is None:
        _factory = AgentFactory()
    return _factory


async def create_agent(agent_name: str, **kwargs) -> BaseAgent:
    """
    Convenience function to create agent

    Args:
        agent_name: Name of agent
        **kwargs: Configuration overrides

    Returns:
        Agent instance

    Example:
        agent = await create_agent(
            "tutor",
            tools=["create_flashcard", "search_flashcards"],
            model="gemini-2.5-pro"
        )
    """
    factory = get_agent_factory()
    return await factory.create(agent_name, **kwargs)
