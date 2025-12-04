"""Quizzes Repository"""

from typing import Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


class QuizRepository:
    """Repository for quiz-related SQL operations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_quiz_statistics(self, quiz_id: int) -> Dict:
        """Get statistics for a quiz"""
        query = text("""
            SELECT
                COUNT(DISTINCT qa.id) as attempt_count,
                AVG(qa.score) as avg_score,
                MAX(qa.score) as max_score
            FROM developer_schema.quiz_attempts qa
            WHERE qa.quiz_id = :quiz_id
              AND qa.completed_at IS NOT NULL
        """)

        result = await self.session.execute(query, {"quiz_id": quiz_id})
        row = result.fetchone()

        if not row:
            return {
                "attempt_count": 0,
                "avg_score": 0.0,
                "max_score": 0.0
            }

        return {
            "attempt_count": row.attempt_count,
            "avg_score": float(row.avg_score) if row.avg_score else 0.0,
            "max_score": float(row.max_score) if row.max_score else 0.0
        }

    async def get_user_quiz_performance(self, user_id: int) -> Dict:
        """Get user's overall quiz performance"""
        query = text("""
            SELECT
                COUNT(*) as total_quizzes,
                COUNT(DISTINCT qa.quiz_id) as unique_quizzes,
                AVG(qa.score / qa.max_score) as avg_percentage
            FROM developer_schema.quiz_attempts qa
            WHERE qa.user_id = :user_id
              AND qa.completed_at IS NOT NULL
        """)

        result = await self.session.execute(query, {"user_id": user_id})
        row = result.fetchone()

        if not row:
            return {
                "total_attempts": 0,
                "unique_quizzes": 0,
                "avg_percentage": 0.0
            }

        return {
            "total_attempts": row.total_quizzes,
            "unique_quizzes": row.unique_quizzes,
            "avg_percentage": float(row.avg_percentage) if row.avg_percentage else 0.0
        }
