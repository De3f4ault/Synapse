"""
Context Tools

AI tools for retrieving SYNAPSE learning context.
These tools provide agents with user-specific learning state and analytics.
"""

from typing import Dict, Any, List
from .base import BaseTool, ToolPermission, ToolExecutionError
import structlog

logger = structlog.get_logger()


class GetUserContextTool(BaseTool):
    """
    Get complete SYNAPSE learning context for a user.

    This is the MOST CRITICAL tool - it provides the personalized
    context that makes SYNAPSE agents intelligent.
    """

    @property
    def name(self) -> str:
        return "get_user_context"

    @property
    def description(self) -> str:
        return (
            "Get the user's complete learning context including: "
            "- Weak areas and topics that need focus "
            "- Recent study activity and performance "
            "- Learning goals and preferences "
            "- Due flashcards and upcoming reviews "
            "- Mastery scores by topic "
            "Use this at the start of tutoring sessions to personalize responses. "
            "This context makes suggestions relevant to the user's specific needs."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "focus": {
                    "type": "string",
                    "description": "Optional: Focus area to prioritize (e.g., 'biology', 'mathematics')"
                },
                "modules": {
                    "type": "array",
                    "description": "Optional: Specific modules to include (flashcards, notes, documents)",
                    "items": {"type": "string"}
                }
            },
            "required": []
        }

    @property
    def required_permissions(self) -> List[ToolPermission]:
        return [ToolPermission.READ]

    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Execute context retrieval."""
        try:
            from app.core.context.engine import ContextEngine

            engine = ContextEngine()
            context = await engine.get_user_context(
                user_id=user_id,
                focus=kwargs.get("focus")
            )

            # Filter by modules if specified
            if kwargs.get("modules"):
                requested_modules = set(kwargs["modules"])
                context["modules"] = {
                    k: v for k, v in context.get("modules", {}).items()
                    if k in requested_modules
                }

            return {
                "success": True,
                "data": {
                    "user_id": user_id,
                    "weak_areas": context.get("analytics", {}).get("weak_topics", []),
                    "mastery_scores": context.get("analytics", {}).get("mastery_by_topic", {}),
                    "recent_activity": context.get("analytics", {}).get("recent_activity", {}),
                    "due_items": context.get("modules", {}).get("flashcards", {}).get("due_count", 0),
                    "learning_goals": context.get("user", {}).get("goals", []),
                    "preferences": context.get("user", {}).get("preferences", {}),
                    "modules": context.get("modules", {})
                },
                "message": "User context retrieved successfully"
            }

        except Exception as e:
            logger.error(
                "get_context_failed",
                user_id=user_id,
                error=str(e)
            )
            return {
                "success": False,
                "data": {},
                "message": f"Failed to get context: {str(e)}"
            }


class GetWeakAreasTool(BaseTool):
    """Get user's weak areas for focused learning."""

    @property
    def name(self) -> str:
        return "get_weak_areas"

    @property
    def description(self) -> str:
        return (
            "Get a detailed list of the user's weak areas based on review performance. "
            "Each weak area includes the topic, weakness score, and supporting evidence. "
            "Use this to suggest targeted study sessions or create remedial content."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "module": {
                    "type": "string",
                    "description": "Optional: Filter by module (flashcards, quizzes)"
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of weak areas to return",
                    "default": 5
                }
            },
            "required": []
        }

    @property
    def required_permissions(self) -> List[ToolPermission]:
        return [ToolPermission.READ]

    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Execute weak areas retrieval."""
        try:
            from app.core.context.sql_executor import execute_sql_function

            # Call SQL function to detect weak areas
            weak_areas = await execute_sql_function(
                function_name="detect_weak_areas",
                params={
                    "p_user_id": user_id,
                    "p_limit": kwargs.get("limit", 5)
                }
            )

            # Filter by module if specified
            if kwargs.get("module"):
                weak_areas = [
                    area for area in weak_areas
                    if area.get("module") == kwargs["module"]
                ]

            return {
                "success": True,
                "data": {
                    "weak_areas": weak_areas,
                    "count": len(weak_areas)
                },
                "message": f"Found {len(weak_areas)} weak areas"
            }

        except Exception as e:
            logger.error(
                "get_weak_areas_failed",
                user_id=user_id,
                error=str(e)
            )
            return {
                "success": False,
                "data": {"weak_areas": [], "count": 0},
                "message": f"Failed to get weak areas: {str(e)}"
            }
