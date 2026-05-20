"""
Multi-Agent Collaboration — Workflow entry point.

Delegates to SequentialPipeline for multi-step agent orchestration.
Called by orchestrator._execute_workflow() when intent is classified as "workflow".
"""

from typing import Any, Dict, Optional

from app.core.ai.workflows.pipeline import ANALYZE_AND_PREPARE


async def execute_multi_agent_workflow(
    user_id: int,
    document_id: Optional[int] = None,
    task: str = "",
) -> Dict[str, Any]:
    """
    Execute a multi-agent workflow using the native SequentialPipeline.

    This is the entry point called by orchestrator._execute_workflow().
    Routes to the appropriate pre-built pipeline based on the task.

    Args:
        user_id: User performing the workflow
        document_id: Optional document ID for context
        task: The user's original message/task

    Returns:
        Dict with workflow results (consumed by orchestrator)
    """
    context: Dict[str, Any] = {}
    if document_id:
        context["document_id"] = document_id

    result = await ANALYZE_AND_PREPARE.execute(
        user_id=user_id,
        initial_input=task,
        context=context,
    )

    return result.to_dict()
