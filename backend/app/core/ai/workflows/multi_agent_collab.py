"""
Multi-Agent Collaboration Workflow

Coordinates multiple specialized agents to accomplish complex tasks.
Example: Document Analysis → Quiz Generation → Study Plan Creation

This workflow demonstrates agent coordination where each step needs
the output of the previous step and different specialized capabilities.
"""

from typing import TypedDict, List, Optional, Dict, Any
from langgraph.graph import StateGraph, END
import structlog

logger = structlog.get_logger()


class MultiAgentState(TypedDict):
    """
    State passed between agents in the workflow.

    Best Practice: Keep state minimal and typed.
    Only include data that needs to flow between steps.
    """
    user_id: int
    task: str
    document_id: Optional[int]

    # Agent outputs
    analysis: Optional[Dict[str, Any]]
    quiz: Optional[Dict[str, Any]]
    study_plan: Optional[Dict[str, Any]]

    # Workflow metadata
    messages: List[str]
    error: Optional[str]
    current_step: str


def create_multi_agent_workflow():
    """
    Create the multi-agent collaboration workflow graph.

    Workflow:
    1. Document Agent analyzes the document
    2. Quiz Agent generates quiz from analysis
    3. Study Plan Agent creates personalized study plan

    Each agent has access to previous outputs in state.

    Returns:
        Compiled LangGraph workflow
    """
    workflow = StateGraph(MultiAgentState)

    # Add nodes (agent execution steps)
    workflow.add_node("analyze_document", analyze_document_node)
    workflow.add_node("generate_quiz", generate_quiz_node)
    workflow.add_node("create_study_plan", create_study_plan_node)
    workflow.add_node("handle_error", error_handler_node)

    # Define edges (flow between agents)
    workflow.add_edge("analyze_document", "generate_quiz")
    workflow.add_edge("generate_quiz", "create_study_plan")
    workflow.add_edge("create_study_plan", END)
    workflow.add_edge("handle_error", END)

    # Set entry point
    workflow.set_entry_point("analyze_document")

    # Compile workflow
    return workflow.compile()


async def analyze_document_node(state: MultiAgentState) -> MultiAgentState:
    """
    Node 1: Analyze document using Document Agent.

    Extracts key concepts, summaries, and learning objectives.
    """
    logger.info(
        "workflow_step_start",
        step="analyze_document",
        user_id=state["user_id"],
        document_id=state.get("document_id")
    )

    try:
        from app.core.ai.agents.registry import AgentRegistry

        # Get document agent
        registry = AgentRegistry()
        document_agent = registry.get_agent("document")

        if not document_agent:
            raise ValueError("Document agent not available")

        # Execute agent
        analysis_result = await document_agent.execute(
            user_id=state["user_id"],
            input=f"Analyze document {state['document_id']} and extract: "
                  "1) Key concepts, 2) Main topics, 3) Learning objectives"
        )

        # Update state
        state["analysis"] = {
            "key_concepts": [],  # Would parse from agent response
            "main_topics": [],
            "learning_objectives": [],
            "summary": analysis_result
        }
        state["messages"].append("✓ Document analysis complete")
        state["current_step"] = "analyze_document"

        logger.info(
            "workflow_step_complete",
            step="analyze_document",
            concepts_found=len(state["analysis"]["key_concepts"])
        )

        return state

    except Exception as e:
        logger.error(
            "workflow_step_failed",
            step="analyze_document",
            error=str(e)
        )
        state["error"] = f"Analysis failed: {str(e)}"
        state["current_step"] = "error"
        return state


async def generate_quiz_node(state: MultiAgentState) -> MultiAgentState:
    """
    Node 2: Generate quiz using Quiz Agent.

    Uses analysis from previous step to create targeted questions.
    """
    logger.info(
        "workflow_step_start",
        step="generate_quiz",
        user_id=state["user_id"]
    )

    # Check if previous step succeeded
    if state.get("error"):
        logger.warning("skipping_quiz_generation_due_to_error")
        return state

    try:
        from app.core.ai.agents.registry import AgentRegistry

        # Get quiz agent
        registry = AgentRegistry()
        quiz_agent = registry.get_agent("quiz")

        if not quiz_agent:
            raise ValueError("Quiz agent not available")

        # Build context from analysis
        analysis = state.get("analysis", {})
        key_concepts = analysis.get("key_concepts", [])

        # Execute agent with context
        quiz_result = await quiz_agent.execute(
            user_id=state["user_id"],
            input=f"Generate a 10-question quiz covering these concepts: "
                  f"{', '.join(key_concepts)}. "
                  "Include multiple choice and short answer questions."
        )

        # Update state
        state["quiz"] = {
            "quiz_id": None,  # Would be created by agent
            "question_count": 10,
            "result": quiz_result
        }
        state["messages"].append("✓ Quiz generated successfully")
        state["current_step"] = "generate_quiz"

        logger.info(
            "workflow_step_complete",
            step="generate_quiz",
            question_count=state["quiz"]["question_count"]
        )

        return state

    except Exception as e:
        logger.error(
            "workflow_step_failed",
            step="generate_quiz",
            error=str(e)
        )
        state["error"] = f"Quiz generation failed: {str(e)}"
        state["current_step"] = "error"
        return state


async def create_study_plan_node(state: MultiAgentState) -> MultiAgentState:
    """
    Node 3: Create study plan using Tutor Agent.

    Combines analysis and quiz to create personalized study schedule.
    """
    logger.info(
        "workflow_step_start",
        step="create_study_plan",
        user_id=state["user_id"]
    )

    # Check if previous steps succeeded
    if state.get("error"):
        logger.warning("skipping_study_plan_due_to_error")
        return state

    try:
        from app.core.ai.agents.registry import AgentRegistry
        from app.core.ai.tools.registry import ToolRegistry

        # Get tutor agent
        registry = AgentRegistry()
        tutor_agent = registry.get_agent("tutor")

        if not tutor_agent:
            raise ValueError("Tutor agent not available")

        # Build comprehensive context
        analysis = state.get("analysis", {})
        quiz = state.get("quiz", {})

        # Execute agent with full context
        plan_result = await tutor_agent.execute(
            user_id=state["user_id"],
            input=f"Create a 7-day study plan for these topics: "
                  f"{', '.join(analysis.get('main_topics', []))}. "
                  f"The student should prepare for a quiz with {quiz.get('question_count', 0)} questions. "
                  "Consider their weak areas and schedule 30 minutes per day."
        )

        # Update state
        state["study_plan"] = {
            "duration_days": 7,
            "daily_time_minutes": 30,
            "result": plan_result
        }
        state["messages"].append("✓ Study plan created successfully")
        state["current_step"] = "create_study_plan"

        logger.info(
            "workflow_step_complete",
            step="create_study_plan",
            duration_days=state["study_plan"]["duration_days"]
        )

        return state

    except Exception as e:
        logger.error(
            "workflow_step_failed",
            step="create_study_plan",
            error=str(e)
        )
        state["error"] = f"Study plan creation failed: {str(e)}"
        state["current_step"] = "error"
        return state


async def error_handler_node(state: MultiAgentState) -> MultiAgentState:
    """
    Error handling node.

    Logs errors and provides graceful failure handling.
    """
    logger.error(
        "workflow_error",
        user_id=state["user_id"],
        error=state.get("error"),
        last_step=state.get("current_step")
    )

    state["messages"].append(f"✗ Workflow error: {state.get('error')}")
    return state


# Example usage function
async def execute_multi_agent_workflow(
    user_id: int,
    document_id: int,
    task: str = "analyze_and_prepare"
) -> Dict[str, Any]:
    """
    Execute the multi-agent workflow.

    Args:
        user_id: User ID
        document_id: Document to analyze
        task: Task description

    Returns:
        Final state with analysis, quiz, and study plan

    Example:
        >>> result = await execute_multi_agent_workflow(
        ...     user_id=1,
        ...     document_id=42,
        ...     task="Prepare for biology exam"
        ... )
        >>> print(result["study_plan"])
    """
    # Create workflow
    workflow = create_multi_agent_workflow()

    # Initial state
    initial_state: MultiAgentState = {
        "user_id": user_id,
        "task": task,
        "document_id": document_id,
        "analysis": None,
        "quiz": None,
        "study_plan": None,
        "messages": [],
        "error": None,
        "current_step": "start"
    }

    # Execute workflow
    final_state = await workflow.ainvoke(initial_state)

    logger.info(
        "workflow_complete",
        user_id=user_id,
        success=final_state.get("error") is None,
        steps_completed=len(final_state.get("messages", []))
    )

    return final_state
