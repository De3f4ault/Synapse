"""
Agent Registry - Singleton registry for managing agents

Provides:
- Agent registration and lookup
- Agent lifecycle management
- Agent metrics tracking
- Thread-safe operations

Pattern: Singleton with lazy initialization
"""

from typing import Dict, Optional, List
import structlog
from threading import Lock

from app.core.ai.agents.base_agent import BaseAgent

logger = structlog.get_logger(__name__)


class AgentRegistry:
    """
    Global registry for agent instances

    Thread-safe singleton that manages:
    - Agent registration and retrieval
    - Agent health monitoring
    - Agent capability queries

    Usage:
        registry = AgentRegistry()

        # Register agent
        registry.register(tutor_agent)

        # Get agent
        agent = registry.get("tutor")

        # List all
        agents = registry.list_agents()
    """

    _instance = None
    _lock = Lock()

    def __new__(cls):
        """Ensure singleton instance"""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        """Initialize registry (only once)"""
        if self._initialized:
            return

        self._agents: Dict[str, BaseAgent] = {}
        self._metrics: Dict[str, Dict] = {}
        self.logger = logger.bind(component="agent_registry")
        self._initialized = True

        self.logger.info("agent_registry_initialized")

    def register(self, agent: BaseAgent) -> None:
        """
        Register agent instance

        Args:
            agent: Agent to register

        Raises:
            ValueError: If agent with same name already registered
        """
        with self._lock:
            if agent.name in self._agents:
                raise ValueError(
                    f"Agent '{agent.name}' already registered. "
                    f"Use unregister() first to replace."
                )

            self._agents[agent.name] = agent
            self._metrics[agent.name] = {
                "registered_at": None,  # Will be set by monitoring
                "total_calls": 0,
                "successful_calls": 0,
                "failed_calls": 0,
                "avg_execution_time_ms": 0
            }

            self.logger.info(
                "agent_registered",
                agent=agent.name,
                display_name=agent.display_name,
                capabilities=len(agent.capabilities)
            )

    def unregister(self, agent_name: str) -> None:
        """
        Remove agent from registry

        Args:
            agent_name: Name of agent to remove
        """
        with self._lock:
            if agent_name in self._agents:
                del self._agents[agent_name]
                del self._metrics[agent_name]
                self.logger.info("agent_unregistered", agent=agent_name)

    def get(self, agent_name: str) -> BaseAgent:
        """
        Get agent by name

        Args:
            agent_name: Name of agent

        Returns:
            Agent instance

        Raises:
            ValueError: If agent not found
        """
        if agent_name not in self._agents:
            available = list(self._agents.keys())
            raise ValueError(
                f"Agent '{agent_name}' not found. "
                f"Available: {available}"
            )

        return self._agents[agent_name]

    def exists(self, agent_name: str) -> bool:
        """
        Check if agent registered

        Args:
            agent_name: Agent name to check

        Returns:
            True if registered
        """
        return agent_name in self._agents

    def list_agents(self) -> List[str]:
        """
        Get list of all registered agent names

        Returns:
            List of agent names
        """
        return list(self._agents.keys())

    def get_all_agents(self) -> Dict[str, BaseAgent]:
        """
        Get all registered agents

        Returns:
            Dict mapping name to agent
        """
        return self._agents.copy()

    def get_agents_by_capability(self, capability: str) -> List[BaseAgent]:
        """
        Find agents with specific capability

        Args:
            capability: Capability to filter by

        Returns:
            List of agents with capability
        """
        matching = []
        for agent in self._agents.values():
            if capability in [c.value for c in agent.capabilities]:
                matching.append(agent)
        return matching

    def get_agent_info(self, agent_name: str) -> Dict:
        """
        Get agent information including metrics

        Args:
            agent_name: Agent name

        Returns:
            Agent info dict with metrics
        """
        agent = self.get(agent_name)
        info = agent.get_info()
        info["metrics"] = self._metrics.get(agent_name, {})
        return info

    def get_all_info(self) -> Dict[str, Dict]:
        """
        Get info for all agents

        Returns:
            Dict mapping agent name to info
        """
        return {
            name: self.get_agent_info(name)
            for name in self._agents.keys()
        }

    def update_metrics(
        self,
        agent_name: str,
        success: bool,
        execution_time_ms: int
    ) -> None:
        """
        Update agent metrics after execution

        Args:
            agent_name: Agent name
            success: Whether execution succeeded
            execution_time_ms: Execution time in milliseconds
        """
        if agent_name not in self._metrics:
            return

        with self._lock:
            metrics = self._metrics[agent_name]
            metrics["total_calls"] += 1

            if success:
                metrics["successful_calls"] += 1
            else:
                metrics["failed_calls"] += 1

            # Update rolling average execution time
            total = metrics["total_calls"]
            current_avg = metrics["avg_execution_time_ms"]
            metrics["avg_execution_time_ms"] = (
                (current_avg * (total - 1) + execution_time_ms) / total
            )

    def get_metrics(self, agent_name: str) -> Dict:
        """
        Get metrics for agent

        Args:
            agent_name: Agent name

        Returns:
            Metrics dict
        """
        return self._metrics.get(agent_name, {}).copy()

    def reset_metrics(self, agent_name: Optional[str] = None) -> None:
        """
        Reset metrics (for testing)

        Args:
            agent_name: Specific agent or None for all
        """
        with self._lock:
            if agent_name:
                if agent_name in self._metrics:
                    self._metrics[agent_name] = {
                        "registered_at": None,
                        "total_calls": 0,
                        "successful_calls": 0,
                        "failed_calls": 0,
                        "avg_execution_time_ms": 0
                    }
            else:
                for name in self._metrics:
                    self._metrics[name] = {
                        "registered_at": None,
                        "total_calls": 0,
                        "successful_calls": 0,
                        "failed_calls": 0,
                        "avg_execution_time_ms": 0
                    }

    def clear(self) -> None:
        """Clear all agents (for testing)"""
        with self._lock:
            self._agents.clear()
            self._metrics.clear()
            self.logger.info("agent_registry_cleared")


# Convenience function
def get_agent_registry() -> AgentRegistry:
    """Get global agent registry instance"""
    return AgentRegistry()
