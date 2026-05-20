"""
Sequential Pipeline — Chain multiple agents with typed state passing.

Replaces the LangGraph-based multi_agent_collab workflow with a native,
typed pipeline that chains agents via AgentState.

Each step receives the previous step's output as context in its prompt
and all steps share a single AgentState that accumulates messages.

Usage:
    pipeline = SequentialPipeline(steps=[
        PipelineStep(agent_name="document", prompt_template="Analyze: {initial_input}", ...),
        PipelineStep(agent_name="quiz", prompt_template="Generate quiz: {previous_output}", ...),
    ])
    result = await pipeline.execute(user_id=1, initial_input="...", context={})
"""

from __future__ import annotations

import time
import structlog
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from app.core.ai.agents.base_agent import AgentState, AgentResult
from app.core.ai.agents.messages import AIMessage
from app.core.ai.agents.factory import get_agent_factory

logger = structlog.get_logger(__name__)


@dataclass
class PipelineStep:
    """One step in a sequential pipeline."""

    agent_name: str
    prompt_template: str  # Uses {previous_output} and {initial_input} placeholders
    description: str = ""


@dataclass
class PipelineResult:
    """Output of a complete pipeline execution."""

    success: bool
    output: str
    steps_completed: int
    total_steps: int
    step_results: List[Dict[str, Any]] = field(default_factory=list)
    state: Optional[AgentState] = None
    execution_time_ms: int = 0
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Serialize for the orchestrator's _execute_workflow return path."""
        return {
            "success": self.success,
            "output": self.output,
            "steps_completed": self.steps_completed,
            "total_steps": self.total_steps,
            "step_results": self.step_results,
            "execution_time_ms": self.execution_time_ms,
            "error": self.error,
            # Orchestrator reads these specific keys:
            "analysis": self._get_step_by_agent("document"),
            "quiz": self._get_step_by_agent("quiz"),
            "study_plan": self._get_step_by_agent("tutor"),
        }

    def _get_step_by_agent(self, agent_name: str) -> Dict[str, Any]:
        """Extract a step result by agent name for backward compat."""
        for step in self.step_results:
            if step.get("agent") == agent_name:
                return {"summary": step.get("output", ""), "result": step.get("output", "")}
        return {}


class SequentialPipeline:
    """
    Chain multiple agents with typed state passing.

    The pipeline:
    1. Runs agents in order, passing each step's output to the next
    2. Accumulates all messages into a shared AgentState
    3. Fails fast on any step failure (returns partial result)
    4. Logs structured observability at each step boundary
    """

    def __init__(self, steps: List[PipelineStep]):
        self.steps = steps
        self.logger = logger.bind(component="sequential_pipeline")

    async def execute(
        self,
        user_id: int,
        initial_input: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> PipelineResult:
        """
        Execute the pipeline end-to-end.

        Args:
            user_id: User performing the workflow
            initial_input: The original user message/task
            context: Shared context dict passed to all agents

        Returns:
            PipelineResult with accumulated output and per-step details
        """
        context = context or {}
        state = AgentState()
        previous_output = initial_input
        step_results: List[Dict[str, Any]] = []
        start_time = time.time()

        factory = get_agent_factory()

        self.logger.info(
            "pipeline_started",
            user_id=user_id,
            total_steps=len(self.steps),
            step_agents=[s.agent_name for s in self.steps],
        )

        for i, step in enumerate(self.steps):
            step_start = time.time()

            # Format the prompt with placeholders
            prompt = step.prompt_template.format(
                previous_output=previous_output,
                initial_input=initial_input,
            )

            self.logger.info(
                "pipeline_step_started",
                step=i + 1,
                total=len(self.steps),
                agent=step.agent_name,
                description=step.description,
                prompt_length=len(prompt),
            )

            try:
                # Create a fresh agent for each step
                agent = await factory.create(step.agent_name)
                result: AgentResult = await agent.execute(
                    user_id=user_id,
                    input=prompt,
                    context=context,
                    chat_history=[],  # Each step starts fresh, context is in the prompt
                )

                step_elapsed = int((time.time() - step_start) * 1000)

                step_detail = {
                    "step": i + 1,
                    "agent": step.agent_name,
                    "description": step.description,
                    "success": result.success,
                    "output": result.output,
                    "execution_time_ms": step_elapsed,
                    "iterations": result.iterations,
                    "tool_calls": len(result.tool_calls),
                }
                step_results.append(step_detail)

                # Accumulate into shared state
                state.add_message(
                    AIMessage(
                        content=result.output,
                        model_used=agent.config.model,
                        iteration=i + 1,
                    )
                )

                if not result.success:
                    self.logger.error(
                        "pipeline_step_failed",
                        step=i + 1,
                        agent=step.agent_name,
                        error=result.error,
                    )
                    return PipelineResult(
                        success=False,
                        output=f"Pipeline failed at step {i + 1} ({step.description}): {result.error}",
                        steps_completed=i,
                        total_steps=len(self.steps),
                        step_results=step_results,
                        state=state,
                        execution_time_ms=int((time.time() - start_time) * 1000),
                        error=result.error,
                    )

                previous_output = result.output

                self.logger.info(
                    "pipeline_step_completed",
                    step=i + 1,
                    agent=step.agent_name,
                    output_length=len(result.output),
                    execution_time_ms=step_elapsed,
                )

            except Exception as e:
                self.logger.error(
                    "pipeline_step_exception",
                    step=i + 1,
                    agent=step.agent_name,
                    error=str(e),
                    error_type=type(e).__name__,
                )
                return PipelineResult(
                    success=False,
                    output=f"Pipeline failed at step {i + 1} ({step.description}): {str(e)}",
                    steps_completed=i,
                    total_steps=len(self.steps),
                    step_results=step_results,
                    state=state,
                    execution_time_ms=int((time.time() - start_time) * 1000),
                    error=str(e),
                )

        total_elapsed = int((time.time() - start_time) * 1000)

        self.logger.info(
            "pipeline_completed",
            user_id=user_id,
            steps_completed=len(self.steps),
            total_execution_time_ms=total_elapsed,
        )

        return PipelineResult(
            success=True,
            output=previous_output,
            steps_completed=len(self.steps),
            total_steps=len(self.steps),
            step_results=step_results,
            state=state,
            execution_time_ms=total_elapsed,
        )


# ── Pre-built pipelines ──────────────────────────────────────────────────

ANALYZE_AND_PREPARE = SequentialPipeline(
    steps=[
        PipelineStep(
            agent_name="document",
            prompt_template=(
                "Analyze this document thoroughly. Extract key concepts, "
                "core topics, learning objectives, and any areas that would "
                "benefit from deeper study. Be specific and structured.\n\n"
                "{initial_input}"
            ),
            description="Document analysis and concept extraction",
        ),
        PipelineStep(
            agent_name="quiz",
            prompt_template=(
                "Based on this analysis, generate a comprehensive 10-question quiz "
                "that tests understanding at multiple depth levels (recall, application, "
                "and synthesis). Include explanations for each answer.\n\n"
                "Analysis:\n{previous_output}"
            ),
            description="Quiz generation from analysis",
        ),
        PipelineStep(
            agent_name="tutor",
            prompt_template=(
                "Based on this topic analysis and quiz, create a structured 7-day "
                "study plan. Prioritize weak areas, schedule spaced repetition review "
                "points, and suggest specific study techniques for each topic.\n\n"
                "Material:\n{previous_output}"
            ),
            description="Study plan creation",
        ),
    ]
)
