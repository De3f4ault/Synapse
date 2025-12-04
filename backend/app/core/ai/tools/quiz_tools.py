"""
Quiz Tools

AI tools for quiz generation and evaluation.
"""

from typing import Dict, Any, List
from .base import BaseTool, ToolPermission, ToolExecutionError
from app.core.module_system.registry import ModuleRegistry
import structlog

logger = structlog.get_logger()


class CreateQuizTool(BaseTool):
    """Generate a quiz from content or topic."""

    @property
    def name(self) -> str:
        return "create_quiz"

    @property
    def description(self) -> str:
        return (
            "Generate a quiz with multiple choice, true/false, or short answer questions. "
            "Can create quiz from notes, documents, or general topics. "
            "Use this to help users test their knowledge."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Quiz title"
                },
                "source_type": {
                    "type": "string",
                    "description": "Source for questions: 'note', 'document', 'topic', or 'manual'"
                },
                "source_id": {
                    "type": "integer",
                    "description": "ID of source note/document (if applicable)"
                },
                "topic": {
                    "type": "string",
                    "description": "Topic for quiz (if source_type is 'topic')"
                },
                "difficulty": {
                    "type": "string",
                    "description": "Difficulty level: 'easy', 'medium', or 'hard'"
                },
                "question_count": {
                    "type": "integer",
                    "description": "Number of questions to generate",
                    "default": 10
                }
            },
            "required": ["title", "source_type"]
        }

    @property
    def required_permissions(self) -> List[ToolPermission]:
        return [ToolPermission.WRITE]

    @property
    def timeout_seconds(self) -> int:
        return 45  # Quiz generation can take time

    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Execute quiz creation."""
        try:
            registry = ModuleRegistry()
            quizzes_module = registry.get_module("quizzes")

            if not quizzes_module:
                raise ToolExecutionError("Quizzes module not available")

            # For AI-generated quizzes, we'd call the agent here
            # For now, create placeholder
            quiz = await quizzes_module.create_content(
                user_id=user_id,
                data={
                    "title": kwargs["title"],
                    "source_type": kwargs["source_type"],
                    "source_ids": [kwargs["source_id"]] if kwargs.get("source_id") else [],
                    "difficulty": kwargs.get("difficulty", "medium"),
                    "ai_generated": True
                }
            )

            return {
                "success": True,
                "data": {
                    "quiz_id": quiz.id,
                    "title": quiz.title,
                    "question_count": 0  # Would be populated by AI generation
                },
                "message": f"Quiz '{kwargs['title']}' created successfully"
            }

        except Exception as e:
            logger.error("quiz_creation_failed", user_id=user_id, error=str(e))
            return {
                "success": False,
                "data": {},
                "message": f"Failed to create quiz: {str(e)}"
            }


class EvaluateAnswerTool(BaseTool):
    """Evaluate a quiz answer using AI."""

    @property
    def name(self) -> str:
        return "evaluate_answer"

    @property
    def description(self) -> str:
        return (
            "Evaluate a quiz answer, especially for short answer or essay questions. "
            "Provides scoring and feedback. "
            "Use this for intelligent grading beyond exact string matching."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "question_text": {
                    "type": "string",
                    "description": "The question that was asked"
                },
                "correct_answer": {
                    "type": "string",
                    "description": "The expected correct answer"
                },
                "student_answer": {
                    "type": "string",
                    "description": "The answer provided by the student"
                },
                "question_type": {
                    "type": "string",
                    "description": "Type: 'short_answer' or 'essay'"
                }
            },
            "required": ["question_text", "correct_answer", "student_answer"]
        }

    @property
    def required_permissions(self) -> List[ToolPermission]:
        return [ToolPermission.READ]

    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Execute answer evaluation."""
        try:
            from app.core.ai.providers.gemini import GeminiProvider

            # Build evaluation prompt
            prompt = f"""Evaluate this quiz answer:

Question: {kwargs['question_text']}
Expected Answer: {kwargs['correct_answer']}
Student Answer: {kwargs['student_answer']}

Provide:
1. Is it correct? (yes/no/partial)
2. Score (0-100)
3. Brief feedback

Format as JSON."""

            provider = GeminiProvider()
            evaluation_text = await provider.generate(prompt=prompt)

            # Parse evaluation (would need more robust parsing)
            import json
            try:
                evaluation = json.loads(evaluation_text)
            except:
                evaluation = {
                    "correct": "partial",
                    "score": 50,
                    "feedback": evaluation_text
                }

            return {
                "success": True,
                "data": {
                    "is_correct": evaluation.get("correct") == "yes",
                    "score": evaluation.get("score", 0),
                    "feedback": evaluation.get("feedback", ""),
                    "partial_credit": evaluation.get("correct") == "partial"
                },
                "message": "Answer evaluated"
            }

        except Exception as e:
            logger.error("answer_evaluation_failed", user_id=user_id, error=str(e))
            return {
                "success": False,
                "data": {},
                "message": f"Evaluation failed: {str(e)}"
            }


class GetQuizResultsTool(BaseTool):
    """Get quiz attempt results and statistics."""

    @property
    def name(self) -> str:
        return "get_quiz_results"

    @property
    def description(self) -> str:
        return (
            "Get the results of a quiz attempt including score and answer analysis. "
            "Use this to review performance and provide feedback."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "quiz_id": {
                    "type": "integer",
                    "description": "Quiz ID"
                },
                "attempt_id": {
                    "type": "integer",
                    "description": "Optional: Specific attempt ID"
                }
            },
            "required": ["quiz_id"]
        }

    @property
    def required_permissions(self) -> List[ToolPermission]:
        return [ToolPermission.READ]

    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Execute results retrieval."""
        try:
            from app.db.session import get_db
            from app.models.quiz_attempt import QuizAttempt
            from sqlalchemy import select

            async with get_db() as db:
                query = select(QuizAttempt).where(
                    QuizAttempt.quiz_id == kwargs["quiz_id"],
                    QuizAttempt.user_id == user_id
                )

                if kwargs.get("attempt_id"):
                    query = query.where(QuizAttempt.id == kwargs["attempt_id"])
                else:
                    query = query.order_by(QuizAttempt.started_at.desc()).limit(1)

                result = await db.execute(query)
                attempt = result.scalar_one_or_none()

                if not attempt:
                    return {
                        "success": False,
                        "data": {},
                        "message": "No quiz attempt found"
                    }

                return {
                    "success": True,
                    "data": {
                        "attempt_id": attempt.id,
                        "quiz_id": attempt.quiz_id,
                        "score": float(attempt.score),
                        "max_score": attempt.max_score,
                        "percentage": float(attempt.score / attempt.max_score * 100) if attempt.max_score > 0 else 0,
                        "completed_at": attempt.completed_at.isoformat() if attempt.completed_at else None,
                        "time_taken_seconds": attempt.time_taken_seconds
                    },
                    "message": "Results retrieved successfully"
                }

        except Exception as e:
            logger.error("get_results_failed", user_id=user_id, error=str(e))
            return {
                "success": False,
                "data": {},
                "message": f"Failed to get results: {str(e)}"
            }
