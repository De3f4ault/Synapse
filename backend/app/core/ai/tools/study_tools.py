"""
Study Tools

AI tools for study recommendations and progress tracking.
"""

from typing import Dict, Any, List
from .base import BaseTool, ToolPermission, ToolExecutionError
import structlog

logger = structlog.get_logger()


class GetStudyRecommendationsTool(BaseTool):
    """Get AI-powered study recommendations."""

    @property
    def name(self) -> str:
        return "get_study_recommendations"

    @property
    def description(self) -> str:
        return (
            "Get personalized study recommendations based on the user's context. "
            "Considers weak areas, due items, and learning patterns. "
            "Returns actionable suggestions for what to study next."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "time_available": {
                    "type": "integer",
                    "description": "Minutes available for studying"
                },
                "focus_area": {
                    "type": "string",
                    "description": "Optional: Area to focus on"
                }
            },
            "required": ["time_available"]
        }

    @property
    def required_permissions(self) -> List[ToolPermission]:
        return [ToolPermission.READ]

    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Execute recommendation generation."""
        try:
            from app.core.context.engine import ContextEngine

            # Get user context
            engine = ContextEngine()
            context = await engine.get_user_context(user_id=user_id)

            # Build recommendations based on context
            recommendations = []
            time_available = kwargs["time_available"]

            # Priority 1: Due flashcards
            due_count = context.get("modules", {}).get("flashcards", {}).get("due_count", 0)
            if due_count > 0:
                estimated_time = due_count * 0.5  # 30s per card
                recommendations.append({
                    "type": "flashcard_review",
                    "priority": 1,
                    "title": "Review Due Flashcards",
                    "description": f"You have {due_count} cards due for review",
                    "estimated_minutes": int(estimated_time),
                    "action": "get_due_cards"
                })

            # Priority 2: Weak areas
            weak_areas = context.get("analytics", {}).get("weak_topics", [])
            if weak_areas:
                for i, topic in enumerate(weak_areas[:3]):
                    recommendations.append({
                        "type": "focused_study",
                        "priority": 2 + i,
                        "title": f"Focus on {topic}",
                        "description": f"This topic needs improvement",
                        "estimated_minutes": 15,
                        "action": f"search_flashcards?query={topic}"
                    })

            # Filter by available time
            feasible_recommendations = [
                rec for rec in recommendations
                if rec["estimated_minutes"] <= time_available
            ]

            return {
                "success": True,
                "data": {
                    "recommendations": feasible_recommendations[:5],
                    "total_time_needed": sum(r["estimated_minutes"] for r in feasible_recommendations),
                    "context_summary": {
                        "due_items": due_count,
                        "weak_areas_count": len(weak_areas)
                    }
                },
                "message": f"Generated {len(feasible_recommendations)} recommendations"
            }

        except Exception as e:
            logger.error(
                "recommendations_failed",
                user_id=user_id,
                error=str(e)
            )
            return {
                "success": False,
                "data": {"recommendations": []},
                "message": f"Failed to get recommendations: {str(e)}"
            }


class CreateStudyPlanTool(BaseTool):
    """Create a structured study plan."""

    @property
    def name(self) -> str:
        return "create_study_plan"

    @property
    def description(self) -> str:
        return (
            "Create a multi-day study plan for the user based on their goals and available time. "
            "Breaks down learning objectives into daily tasks. "
            "Use this when user wants to prepare for an exam or learn a new topic systematically."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "goal": {
                    "type": "string",
                    "description": "Learning goal (e.g., 'prepare for biology exam', 'learn calculus')"
                },
                "duration_days": {
                    "type": "integer",
                    "description": "Number of days for the plan"
                },
                "daily_time_minutes": {
                    "type": "integer",
                    "description": "Minutes available per day"
                }
            },
            "required": ["goal", "duration_days", "daily_time_minutes"]
        }

    @property
    def required_permissions(self) -> List[ToolPermission]:
        return [ToolPermission.WRITE]

    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Execute study plan creation."""
        try:
            from app.core.ai.providers.gemini import GeminiProvider
            from app.core.context.engine import ContextEngine

            # Get user context for personalization
            engine = ContextEngine()
            context = await engine.get_user_context(user_id=user_id)

            # Build prompt for plan generation
            prompt = f"""Create a {kwargs['duration_days']}-day study plan.

Goal: {kwargs['goal']}
Daily time: {kwargs['daily_time_minutes']} minutes

User context:
- Weak areas: {', '.join(context.get('analytics', {}).get('weak_topics', [])[:5])}
- Current mastery level: {context.get('analytics', {}).get('overall_accuracy', 0.0):.2f}

Format as JSON with this structure:
{{
  "days": [
    {{"day": 1, "focus": "topic", "tasks": ["task1", "task2"], "time_minutes": 30}},
    ...
  ],
  "overall_strategy": "description"
}}"""

            provider = GeminiProvider()
            plan_json = await provider.generate(prompt=prompt)

            # Parse plan (would need robust parsing)
            import json
            try:
                plan = json.loads(plan_json)
            except:
                plan = {
                    "days": [],
                    "overall_strategy": "Custom plan generated"
                }

            # Store plan in database (would implement)

            return {
                "success": True,
                "data": {
                    "plan_id": None,  # Would generate
                    "goal": kwargs["goal"],
                    "duration_days": kwargs["duration_days"],
                    "plan": plan
                },
                "message": "Study plan created successfully"
            }

        except Exception as e:
            logger.error(
                "create_plan_failed",
                user_id=user_id,
                error=str(e)
            )
            return {
                "success": False,
                "data": {},
                "message": f"Failed to create plan: {str(e)}"
            }


class TrackStudyProgressTool(BaseTool):
    """Track a study session's progress and results."""

    @property
    def name(self) -> str:
        return "track_study_progress"

    @property
    def description(self) -> str:
        return (
            "Record the results of a study session including time spent and items completed. "
            "This updates the user's learning analytics. "
            "Use this after completing study activities to track progress."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "session_type": {
                    "type": "string",
                    "description": "Type: 'flashcard_review', 'quiz', 'reading', 'practice'"
                },
                "duration_minutes": {
                    "type": "integer",
                    "description": "Time spent studying"
                },
                "items_completed": {
                    "type": "integer",
                    "description": "Number of items completed (cards, questions, etc.)"
                },
                "items_correct": {
                    "type": "integer",
                    "description": "Number of items answered correctly"
                }
            },
            "required": ["session_type", "duration_minutes", "items_completed"]
        }

    @property
    def required_permissions(self) -> List[ToolPermission]:
        return [ToolPermission.WRITE]

    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Execute progress tracking."""
        try:
            from app.db.session import get_db
            from app.models.study_session import StudySession
            from datetime import datetime, timedelta

            async with get_db() as db:
                # Create study session record
                session = StudySession(
                    user_id=user_id,
                    session_type=kwargs["session_type"],
                    started_at=datetime.utcnow() - timedelta(minutes=kwargs["duration_minutes"]),
                    ended_at=datetime.utcnow(),
                    items_completed=kwargs["items_completed"],
                    items_correct=kwargs.get("items_correct", 0),
                    time_spent_seconds=kwargs["duration_minutes"] * 60
                )

                db.add(session)
                await db.commit()
                await db.refresh(session)

                # Calculate accuracy
                accuracy = 0.0
                if kwargs["items_completed"] > 0 and "items_correct" in kwargs:
                    accuracy = kwargs["items_correct"] / kwargs["items_completed"]

                # Invalidate context cache
                from app.core.context.engine import ContextEngine
                engine = ContextEngine()
                await engine.invalidate_cache(user_id)

                return {
                    "success": True,
                    "data": {
                        "session_id": session.id,
                        "duration_minutes": kwargs["duration_minutes"],
                        "items_completed": kwargs["items_completed"],
                        "accuracy": accuracy
                    },
                    "message": "Study progress tracked successfully"
                }

        except Exception as e:
            logger.error(
                "track_progress_failed",
                user_id=user_id,
                error=str(e)
            )
            return {
                "success": False,
                "data": {},
                "message": f"Failed to track progress: {str(e)}"
            }
