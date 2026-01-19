"""Quizzes Service"""

from typing import Dict, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from .repository import QuizRepository
from .constants import QuestionType


class QuizService:
    """Service layer for quiz business logic"""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = QuizRepository(session)

    async def create_quiz(self, user_id: int, data: Dict) -> Dict:
        """Create a quiz with questions"""
        from app.models.quiz import Quiz
        from app.models.quiz_question import QuizQuestion

        quiz = Quiz(
            user_id=user_id,
            title=data["title"],
            description=data.get("description"),
            difficulty=data.get("difficulty"),
            time_limit_minutes=data.get("time_limit_minutes"),
        )

        self.session.add(quiz)
        await self.session.flush()

        # Add questions with inline embedding (Phase Q2.1)
        from app.core.ai.embeddings.boundary import (
            embed_text_sync,
            EMBEDDING_VERSION,
        )

        for i, q_data in enumerate(data.get("questions", [])):
            question_text = q_data["question_text"]

            # Embed question text for semantic routing
            embedding, embed_status = embed_text_sync(question_text)

            question = QuizQuestion(
                quiz_id=quiz.id,
                question_text=question_text,
                question_type=q_data["question_type"],
                options=q_data.get("options"),
                correct_answer=q_data["correct_answer"],
                explanation=q_data.get("explanation"),
                points=q_data.get("points", 1),
                order=i,
                # Embedding fields
                prompt_embedding=embedding,
                embedding_model=EMBEDDING_VERSION if embedding else None,
                embedding_status=embed_status.value,
            )
            self.session.add(question)

        await self.session.commit()
        await self.session.refresh(quiz)

        return self._quiz_to_dict(quiz)

    async def get_quiz(self, quiz_id: int, user_id: int) -> Dict:
        """Get quiz (without answers)"""
        from app.models.quiz import Quiz

        query = select(Quiz).where(and_(Quiz.id == quiz_id, Quiz.deleted_at.is_(None)))

        result = await self.session.execute(query)
        quiz = result.scalar_one_or_none()

        if not quiz:
            raise Exception("Quiz not found")

        return self._quiz_to_dict(quiz, include_answers=False)

    async def start_quiz(self, quiz_id: int, user_id: int) -> Dict:
        """Start a quiz attempt"""
        from app.models.quiz_attempt import QuizAttempt

        attempt = QuizAttempt(quiz_id=quiz_id, user_id=user_id, started_at=datetime.utcnow())

        self.session.add(attempt)
        await self.session.commit()
        await self.session.refresh(attempt)

        return {"attempt_id": attempt.id, "quiz_id": quiz_id, "started_at": attempt.started_at}

    async def submit_quiz(self, attempt_id: int, user_id: int, answers: List[Dict]) -> Dict:
        """Submit and grade quiz"""
        from app.models.quiz_attempt import QuizAttempt
        from app.models.quiz_question import QuizQuestion

        # Get attempt
        query = select(QuizAttempt).where(
            and_(QuizAttempt.id == attempt_id, QuizAttempt.user_id == user_id)
        )

        result = await self.session.execute(query)
        attempt = result.scalar_one_or_none()

        if not attempt:
            raise Exception("Attempt not found")

        # Get questions
        q_query = select(QuizQuestion).where(QuizQuestion.quiz_id == attempt.quiz_id)
        q_result = await self.session.execute(q_query)
        questions = {q.id: q for q in q_result.scalars().all()}

        # Grade answers
        total_score = 0
        max_score = sum(q.points for q in questions.values())
        graded_answers = []

        for answer in answers:
            question = questions.get(answer["question_id"])
            if not question:
                continue

            is_correct = self._check_answer(
                question.correct_answer, answer["answer"], question.question_type
            )

            points = question.points if is_correct else 0
            total_score += points

            graded_answers.append(
                {
                    "question_id": question.id,
                    "your_answer": answer["answer"],
                    "correct_answer": question.correct_answer,
                    "is_correct": is_correct,
                    "points": points,
                    "explanation": question.explanation,
                }
            )

        # Update attempt
        attempt.completed_at = datetime.utcnow()
        attempt.score = total_score
        attempt.max_score = max_score
        attempt.answers = graded_answers

        await self.session.commit()

        # Send notification with score
        try:
            from app.services.notification_service import NotificationService
            from app.models.notification import NotificationType, NotificationCategory

            notification_service = NotificationService(self.session)
            percentage = (total_score / max_score * 100) if max_score > 0 else 0
            ntype = NotificationType.SUCCESS if percentage >= 70 else NotificationType.INFO

            await notification_service.send(
                user_id=user_id,
                type=ntype,
                category=NotificationCategory.LEARNING,
                title="Quiz Completed",
                message=f"You scored {total_score}/{max_score} ({percentage:.0f}%).",
                action_url=f"/quizzes/{attempt.quiz_id}/results/{attempt_id}",
                action_label="View Results",
                meta_data={"score": total_score, "max_score": max_score, "percentage": percentage},
            )
        except Exception:
            pass  # Don't fail quiz on notification error

        return {
            "score": total_score,
            "max_score": max_score,
            "percentage": (total_score / max_score * 100) if max_score > 0 else 0,
            "answers": graded_answers,
        }

    def _check_answer(self, correct: str, user_answer: str, question_type: str) -> bool:
        """Check if answer is correct"""
        if question_type == QuestionType.MULTIPLE_CHOICE:
            return correct.lower() == user_answer.lower()
        elif question_type == QuestionType.TRUE_FALSE:
            return correct.lower() == user_answer.lower()
        else:  # SHORT_ANSWER
            # Fuzzy matching would go here
            return correct.lower() == user_answer.lower()

    def _quiz_to_dict(self, quiz, include_answers=True) -> Dict:
        """Convert Quiz model to dict"""
        return {
            "id": quiz.id,
            "title": quiz.title,
            "description": quiz.description,
            "difficulty": quiz.difficulty,
            "time_limit_minutes": quiz.time_limit_minutes,
            "created_at": quiz.created_at,
        }
