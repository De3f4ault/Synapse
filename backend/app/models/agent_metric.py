"""
Agent Metrics Model

Tracks detailed performance metrics for AI agents:
- Agent execution performance (latency, success rates)
- Resource usage (tokens, costs)
- Error tracking and patterns
- User satisfaction feedback

Complements:
- AIUsage: Tracks raw API calls to Gemini
- AgentMetric: Tracks high-level agent performance
- Redis Counters: Real-time metrics for monitoring
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
import enum

from sqlalchemy import String, Text, Integer, Boolean, DateTime, Numeric, ForeignKey, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Enum as SQLEnum

from .base import Base
from app.core.ai.registry.models import DEFAULT_CHAT_MODEL

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.core.ai.agents.base_agent import AgentResult


class AgentType(str, enum.Enum):
    """Types of agents in the system."""

    TUTOR = "tutor"
    DOCUMENT = "document"
    QUIZ = "quiz"
    CHAT = "chat"
    GENERAL = "general"


class AgentOperationType(str, enum.Enum):
    """Types of operations agents perform."""

    CHAT = "chat"
    GENERATION = "generation"
    ANALYSIS = "analysis"
    SUMMARIZATION = "summarization"
    QUESTION_ANSWERING = "question_answering"
    TOOL_USE = "tool_use"
    PLANNING = "planning"


class AgentMetric(Base):
    """
    Agent performance metrics model.

    Records detailed metrics for each agent execution:
    - Performance: Execution time, iteration count
    - Resources: Token usage, cost estimation
    - Success/Failure: Error tracking
    - Tools: Tool usage patterns
    - Feedback: User satisfaction (optional)

    Difference from AIUsage:
    - AIUsage: Low-level API call tracking (Gemini requests)
    - AgentMetric: High-level agent execution tracking (full ReAct loop)

    One agent execution may trigger multiple AIUsage records.
    """

    __tablename__ = "agent_metrics"
    __table_args__ = {"prefixes": ["UNLOGGED"]}

    # Primary Key
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, doc="Primary key")

    # Foreign Keys
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="ID of the user who initiated the agent request",
    )

    # Agent Identification
    agent_type: Mapped[AgentType] = mapped_column(
        SQLEnum(AgentType, native_enum=False),
        nullable=False,
        index=True,
        doc="Type of agent (tutor, document, quiz, etc.)",
    )

    agent_name: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True, doc="Specific agent instance name"
    )

    operation_type: Mapped[AgentOperationType] = mapped_column(
        SQLEnum(AgentOperationType, native_enum=False),
        nullable=False,
        index=True,
        doc="Type of operation performed",
    )

    # Performance Metrics
    execution_time_ms: Mapped[int] = mapped_column(
        Integer, nullable=False, doc="Total execution time in milliseconds"
    )

    iterations: Mapped[int] = mapped_column(
        Integer, default=1, nullable=False, doc="Number of ReAct loop iterations"
    )

    # Resource Usage
    total_tokens: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, doc="Total tokens used across all LLM calls"
    )

    estimated_cost: Mapped[Decimal] = mapped_column(
        Numeric(precision=10, scale=6),
        default=Decimal("0"),
        nullable=False,
        doc="Estimated total cost in USD",
    )

    # Model Information
    model_used: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True, doc="Primary model used (e.g., 'gemini-2.5-flash')"
    )

    # Success/Failure Tracking
    success: Mapped[bool] = mapped_column(
        Boolean, nullable=False, index=True, doc="Whether the agent execution succeeded"
    )

    error_type: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        doc="Type of error if failed (e.g., 'TimeoutError', 'ValidationError')",
    )

    error_message: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, doc="Detailed error message if failed"
    )

    # Tool Usage
    tool_calls_count: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, doc="Number of tool calls made during execution"
    )

    tools_used: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True, doc="List of tools used with call counts: {'tool_name': count}"
    )

    # Context Information
    context_used: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, doc="Whether user context was injected"
    )

    grounding_used: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, doc="Whether web search grounding was used"
    )

    # User Feedback (optional)
    user_rating: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, doc="User satisfaction rating (1-5)"
    )

    user_feedback: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, doc="User feedback text"
    )

    # Additional Metadata
    request_metadata: Mapped[Optional[dict]] = mapped_column(
        "metadata",  # Database column name
        JSON,
        nullable=True,
        doc="Additional execution metadata (input length, output length, etc.)",
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
        doc="Timestamp when execution started",
    )

    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, doc="Timestamp when execution completed"
    )

    # Relationships
    # user: Many-to-one with User

    def __repr__(self) -> str:
        """String representation of AgentMetric."""
        return (
            f"<AgentMetric(id={self.id}, agent={self.agent_name}, "
            f"type={self.agent_type.value}, success={self.success})>"
        )

    @property
    def tokens_per_iteration(self) -> float:
        """Calculate average tokens per iteration."""
        if self.iterations == 0:
            return 0.0
        return self.total_tokens / self.iterations

    @property
    def cost_per_token(self) -> Decimal:
        """Calculate cost per token."""
        if self.total_tokens == 0:
            return Decimal("0")
        return self.estimated_cost / self.total_tokens

    @property
    def execution_time_seconds(self) -> float:
        """Get execution time in seconds."""
        return self.execution_time_ms / 1000.0

    def to_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "agent_type": self.agent_type.value,
            "agent_name": self.agent_name,
            "operation_type": self.operation_type.value,
            "execution_time_ms": self.execution_time_ms,
            "execution_time_seconds": self.execution_time_seconds,
            "iterations": self.iterations,
            "total_tokens": self.total_tokens,
            "tokens_per_iteration": self.tokens_per_iteration,
            "estimated_cost": float(self.estimated_cost),
            "cost_per_token": float(self.cost_per_token),
            "model_used": self.model_used,
            "success": self.success,
            "error_type": self.error_type,
            "error_message": self.error_message,
            "tool_calls_count": self.tool_calls_count,
            "tools_used": self.tools_used,
            "context_used": self.context_used,
            "grounding_used": self.grounding_used,
            "user_rating": self.user_rating,
            "user_feedback": self.user_feedback,
            "metadata": self.request_metadata,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }

    @classmethod
    def from_agent_result(
        cls,
        user_id: int,
        agent_name: str,
        agent_type: AgentType,
        operation_type: AgentOperationType,
        result: "AgentResult",
        model_used: str = DEFAULT_CHAT_MODEL,
        estimated_cost: Decimal = Decimal("0"),
    ) -> "AgentMetric":
        """
        Create AgentMetric from AgentResult.

        Convenience factory method for creating metrics from agent execution.

        Args:
            user_id: User ID
            agent_name: Agent name
            agent_type: Agent type enum
            operation_type: Operation type enum
            result: AgentResult from agent execution
            model_used: Model identifier
            estimated_cost: Estimated cost in USD

        Returns:
            AgentMetric instance (not yet persisted)
        """
        # Extract tools used
        tools_used = {}
        for tool_call in result.tool_calls:
            tool_name = tool_call.get("tool", "unknown")
            tools_used[tool_name] = tools_used.get(tool_name, 0) + 1

        return cls(
            user_id=user_id,
            agent_type=agent_type,
            agent_name=agent_name,
            operation_type=operation_type,
            execution_time_ms=result.execution_time_ms,
            iterations=result.iterations,
            total_tokens=result.total_tokens,
            estimated_cost=estimated_cost,
            model_used=model_used,
            success=result.success,
            error_type=type(result.error).__name__ if result.error else None,
            error_message=result.error,
            tool_calls_count=len(result.tool_calls),
            tools_used=tools_used if tools_used else None,
            request_metadata=result.metadata,
            created_at=datetime.utcnow(),
            completed_at=datetime.utcnow(),
        )
