"""
Workflows Package — Multi-agent orchestration pipelines.

Provides SequentialPipeline for chaining agents with typed state passing,
replacing the previous LangGraph-based workflow system.
"""

from app.core.ai.workflows.pipeline import (
    SequentialPipeline,
    PipelineStep,
    PipelineResult,
    ANALYZE_AND_PREPARE,
)
from app.core.ai.workflows.multi_agent_collab import execute_multi_agent_workflow

__all__ = [
    "SequentialPipeline",
    "PipelineStep",
    "PipelineResult",
    "ANALYZE_AND_PREPARE",
    "execute_multi_agent_workflow",
]
