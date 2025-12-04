"""
AI usage tracking model.

Records all AI API calls for cost tracking, quota management, and analytics.
Essential for monitoring Gemini API usage.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import String, Text, Integer, Boolean, DateTime, Numeric, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class AIUsage(Base):
    """
    AI usage tracking model.

    Records every call to AI APIs (Gemini) with detailed metrics:
    - Token usage (input, output, total)
    - Model used
    - Operation type
    - Success/failure status
    - Cost estimation
    - Grounding and function call usage
    """

    __tablename__ = "ai_usage"

    # Primary Key
    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
        doc="Primary key"
    )

    # Foreign Keys
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="ID of the user who initiated the request"
    )

    # Operation Details
    operation_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        doc="Type of operation (e.g., 'chat', 'generation', 'analysis')"
    )

    model_used: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        doc="AI model used (e.g., 'pro', 'flash', 'flash-lite')"
    )

    # Token Usage
    tokens_input: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Number of input tokens"
    )

    tokens_output: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Number of output tokens"
    )

    tokens_total: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Total tokens (input + output)"
    )

    # Cost Tracking
    cost: Mapped[Decimal] = mapped_column(
        Numeric(precision=10, scale=6),
        nullable=False,
        doc="Estimated cost in USD"
    )

    # Performance Metrics
    duration_ms: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Request duration in milliseconds"
    )

    # Status
    success: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        doc="Whether the request was successful"
    )

    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        default=None,
        doc="Error message if request failed"
    )

    # Feature Usage
    grounding_used: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        doc="Whether Google Search grounding was used"
    )

    function_calls: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Number of function calls made"
    )

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
        doc="Timestamp when request was made"
    )

    # Relationships
    # user: Many-to-one with User

    def __repr__(self) -> str:
        """String representation of AIUsage."""
        return (
            f"<AIUsage(id={self.id}, user_id={self.user_id}, "
            f"model={self.model_used}, tokens={self.tokens_total})>"
        )

    @property
    def cost_per_token(self) -> Decimal:
        """Calculate cost per token."""
        if self.tokens_total == 0:
            return Decimal("0")
        return self.cost / self.tokens_total
