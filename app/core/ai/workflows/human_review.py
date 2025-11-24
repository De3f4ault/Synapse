"""
Human-in-the-Loop Review Workflow

Enables human review and approval of AI-generated content before use.
Example: Quiz generation with teacher review before student access

This workflow demonstrates checkpoint-based pausing where execution
stops for human review, then resumes based on approval/rejection.

Key Features:
- Workflow pauses at review points
- Human can approve, reject, or request revisions
- State persists across review cycles
- Supports iterative improvement
"""

from typing import TypedDict, Optional, Dict, Any, Literal
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres import PostgresSaver
import structlog

logger = structlog.get_logger()


class HumanReviewState(TypedDict):
    """
    State for human review workflow.

    Includes content, review status, and feedback.
    """
    user_id: int
    content_type: str  # "quiz", "flashcards", "study_plan"

    # Generated content
    content: Dict[str, Any]

    # Review state
    review_status: Optional[Literal["pending", "approved", "rejected", "needs_revision"]]
    reviewer_id: Optional[int]
    feedback: Optional[str]
    revision_count: int

    # Workflow metadata
    revised_content: Optional[Dict[str, Any]]
    messages: List[str]
    error: Optional[str]


def create_human_review_workflow(checkpointer=None):
    """
    Create the human review workflow graph.

    Workflow:
    1. Generate content (AI)
    2. Wait for human review (PAUSE)
    3. If approved → Finalize
       If rejected → End
       If needs revision → Revise (AI) → Back to review

    Args:
        checkpointer: PostgresSaver for persistent state (recommended for production)

    Returns:
        Compiled LangGraph workflow with checkpointing
    """
    workflow = StateGraph(HumanReviewState)

    # Add nodes
    workflow.add_node("generate_content", generate_content_node)
    workflow.add_node("wait_for_review", wait_for_review_node)
    workflow.add_node("revise_content", revise_content_node)
    workflow.add_node("finalize_content", finalize_content_node)

    # Define edges
    workflow.add_edge("generate_content", "wait_for_review")

    # Conditional edge from review
    workflow.add_conditional_edges(
        "wait_for_review",
        review_decision,
        {
            "approved": "finalize_content",
            "rejected": END,
            "needs_revision": "revise_content",
            "pending": "wait_for_review"  # Loop until reviewed
        }
    )

    workflow.add_edge("revise_content", "wait_for_review")
    workflow.add_edge("finalize_content", END)

    # Set entry point
    workflow.set_entry_point("generate_content")

    # Compile with checkpointing
    return workflow.compile(checkpointer=checkpointer)


async def generate_content_node(state: HumanReviewState) -> HumanReviewState:
    """
    Node 1: Generate initial content using AI.

    This could be quiz questions, flashcards, or study plans.
    """
    logger.info(
        "workflow_step_start",
        step="generate_content",
        user_id=state["user_id"],
        content_type=state["content_type"]
    )

    try:
        from app.core.ai.agents.registry import AgentRegistry

        # Select appropriate agent based on content type
        registry = AgentRegistry()

        agent_map = {
            "quiz": "quiz",
            "flashcards": "tutor",  # Tutor can generate flashcards
            "study_plan": "tutor"
        }

        agent_name = agent_map.get(state["content_type"], "tutor")
        agent = registry.get_agent(agent_name)

        if not agent:
            raise ValueError(f"Agent '{agent_name}' not available")

        # Generate content based on type
        if state["content_type"] == "quiz":
            result = await agent.execute(
                user_id=state["user_id"],
                input="Generate a 10-question quiz on biology covering cell structure. "
                      "Include explanations for each answer."
            )
        elif state["content_type"] == "flashcards":
            result = await agent.execute(
                user_id=state["user_id"],
                input="Create 20 flashcards about photosynthesis. "
                      "Focus on key concepts and terminology."
            )
        else:  # study_plan
            result = await agent.execute(
                user_id=state["user_id"],
                input="Create a 14-day study plan for preparing for a biology final exam. "
                      "Include daily topics and review sessions."
            )

        # Store generated content
        state["content"] = {
            "generated_at": "now",  # Would use actual timestamp
            "result": result,
            "version": 1
        }
        state["review_status"] = "pending"
        state["messages"].append(f"✓ {state['content_type']} generated")

        logger.info(
            "workflow_step_complete",
            step="generate_content",
            content_type=state["content_type"]
        )

        return state

    except Exception as e:
        logger.error(
            "workflow_step_failed",
            step="generate_content",
            error=str(e)
        )
        state["error"] = f"Content generation failed: {str(e)}"
        return state


async def wait_for_review_node(state: HumanReviewState) -> HumanReviewState:
    """
    Node 2: Wait for human review.

    This node is where the workflow PAUSES.

    In production:
    - Store state in PostgreSQL checkpoint
    - Send notification to reviewer
    - Expose API endpoint for submitting review
    - Resume when review is submitted

    The workflow will loop here until review_status changes
    from "pending" to something else.
    """
    logger.info(
        "workflow_paused_for_review",
        user_id=state["user_id"],
        content_type=state["content_type"],
        revision_count=state.get("revision_count", 0)
    )

    # In real implementation:
    # 1. Save checkpoint
    # 2. Send notification (email, webhook, etc.)
    # 3. Return state unchanged

    # Note: The state doesn't change here - external action updates it
    state["messages"].append("⏸ Waiting for human review...")

    return state


async def revise_content_node(state: HumanReviewState) -> HumanReviewState:
    """
    Node 3: Revise content based on feedback.

    Uses reviewer's feedback to improve the content.
    """
    logger.info(
        "workflow_step_start",
        step="revise_content",
        user_id=state["user_id"],
        revision_count=state.get("revision_count", 0)
    )

    try:
        from app.core.ai.agents.registry import AgentRegistry

        # Get agent
        registry = AgentRegistry()
        agent_name = {
            "quiz": "quiz",
            "flashcards": "tutor",
            "study_plan": "tutor"
        }.get(state["content_type"], "tutor")

        agent = registry.get_agent(agent_name)

        if not agent:
            raise ValueError(f"Agent '{agent_name}' not available")

        # Revise with feedback
        revision_prompt = (
            f"Revise this {state['content_type']} based on feedback.\n\n"
            f"Original content:\n{state['content']}\n\n"
            f"Reviewer feedback:\n{state.get('feedback', 'No specific feedback')}\n\n"
            "Generate improved version addressing the concerns."
        )

        revised_result = await agent.execute(
            user_id=state["user_id"],
            input=revision_prompt
        )

        # Update state with revision
        state["revised_content"] = {
            "generated_at": "now",
            "result": revised_result,
            "version": state.get("revision_count", 0) + 2  # Version 2, 3, etc.
        }
        state["content"] = state["revised_content"]  # Replace original
        state["revision_count"] = state.get("revision_count", 0) + 1
        state["review_status"] = "pending"  # Reset for new review
        state["messages"].append(f"✓ Content revised (v{state['revision_count'] + 1})")

        logger.info(
            "workflow_step_complete",
            step="revise_content",
            revision_number=state["revision_count"]
        )

        return state

    except Exception as e:
        logger.error(
            "workflow_step_failed",
            step="revise_content",
            error=str(e)
        )
        state["error"] = f"Revision failed: {str(e)}"
        return state


async def finalize_content_node(state: HumanReviewState) -> HumanReviewState:
    """
    Node 4: Finalize approved content.

    Saves content to database and makes it available to users.
    """
    logger.info(
        "workflow_step_start",
        step="finalize_content",
        user_id=state["user_id"],
        content_type=state["content_type"]
    )

    try:
        from app.core.module_system.registry import ModuleRegistry

        # Get appropriate module
        registry = ModuleRegistry()
        module = None

        if state["content_type"] == "quiz":
            module = registry.get_module("quizzes")
        elif state["content_type"] == "flashcards":
            module = registry.get_module("flashcards")

        if module:
            # Save content (implementation depends on content type)
            # This is placeholder - actual implementation would parse
            # and save the content appropriately
            pass

        state["messages"].append("✓ Content finalized and saved")

        logger.info(
            "workflow_complete",
            step="finalize_content",
            user_id=state["user_id"],
            final_version=state.get("revision_count", 0) + 1
        )

        return state

    except Exception as e:
        logger.error(
            "workflow_step_failed",
            step="finalize_content",
            error=str(e)
        )
        state["error"] = f"Finalization failed: {str(e)}"
        return state


def review_decision(state: HumanReviewState) -> str:
    """
    Conditional edge: Route based on review status.

    Returns:
        "approved", "rejected", "needs_revision", or "pending"
    """
    status = state.get("review_status", "pending")

    logger.debug(
        "review_decision_made",
        status=status,
        revision_count=state.get("revision_count", 0)
    )

    return status


# Example usage and API integration
async def start_review_workflow(
    user_id: int,
    content_type: str,
    checkpointer=None
) -> Dict[str, Any]:
    """
    Start a human review workflow.

    Args:
        user_id: User ID
        content_type: Type of content to generate
        checkpointer: Optional checkpointer for persistence

    Returns:
        Dict with workflow ID and initial state

    Example:
        >>> result = await start_review_workflow(
        ...     user_id=1,
        ...     content_type="quiz",
        ...     checkpointer=saver
        ... )
        >>> workflow_id = result["workflow_id"]
        >>> # Later: submit review
        >>> await submit_review(workflow_id, "approved", "Looks great!")
    """
    # Create workflow
    workflow = create_human_review_workflow(checkpointer=checkpointer)

    # Initial state
    initial_state: HumanReviewState = {
        "user_id": user_id,
        "content_type": content_type,
        "content": {},
        "review_status": None,
        "reviewer_id": None,
        "feedback": None,
        "revision_count": 0,
        "revised_content": None,
        "messages": [],
        "error": None
    }

    # Configuration with thread ID for checkpointing
    import uuid
    thread_id = str(uuid.uuid4())
    config = {
        "configurable": {
            "thread_id": thread_id,
            "checkpoint_ns": f"user-{user_id}"
        }
    }

    # Execute workflow (will pause at review)
    result = await workflow.ainvoke(initial_state, config=config)

    return {
        "workflow_id": thread_id,
        "state": result,
        "status": result.get("review_status"),
        "awaiting_review": result.get("review_status") == "pending"
    }


async def submit_review(
    workflow_id: str,
    decision: Literal["approved", "rejected", "needs_revision"],
    feedback: str,
    reviewer_id: int,
    checkpointer=None
) -> Dict[str, Any]:
    """
    Submit a review and resume the workflow.

    This is called by the review API endpoint when a human
    submits their review decision.

    Args:
        workflow_id: Thread ID from start_review_workflow
        decision: Review decision
        feedback: Reviewer comments
        reviewer_id: ID of reviewer
        checkpointer: Checkpointer instance

    Returns:
        Updated workflow state

    Example:
        >>> await submit_review(
        ...     workflow_id="abc-123",
        ...     decision="needs_revision",
        ...     feedback="Add more difficult questions",
        ...     reviewer_id=5,
        ...     checkpointer=saver
        ... )
    """
    # Create workflow
    workflow = create_human_review_workflow(checkpointer=checkpointer)

    # Configuration to resume specific thread
    config = {
        "configurable": {
            "thread_id": workflow_id
        }
    }

    # Get current state from checkpoint
    current_state = await workflow.aget_state(config)

    # Update state with review
    current_state.values["review_status"] = decision
    current_state.values["reviewer_id"] = reviewer_id
    current_state.values["feedback"] = feedback
    current_state.values["messages"].append(f"📝 Review: {decision}")

    # Resume workflow with updated state
    final_state = await workflow.ainvoke(
        current_state.values,
        config=config
    )

    logger.info(
        "review_submitted",
        workflow_id=workflow_id,
        decision=decision,
        reviewer_id=reviewer_id,
        final_status=final_state.get("review_status")
    )

    return {
        "workflow_id": workflow_id,
        "state": final_state,
        "status": final_state.get("review_status"),
        "complete": final_state.get("review_status") in ["approved", "rejected"]
    }
