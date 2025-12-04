"""
Quiz REST API endpoints.

Quiz creation, attempts, and grading with multiple question types.

"""

from typing import List, Optional
from decimal import Decimal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from pydantic import BaseModel, Field

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.quiz import Quiz, QuizSourceType, QuizDifficulty
from app.models.quiz_question import QuizQuestion, QuestionType
from app.models.quiz_attempt import QuizAttempt

router = APIRouter()


# ============================================================================
# Schemas
# ============================================================================

class QuestionCreate(BaseModel):
    """Question creation schema."""
    question_text: str
    question_type: QuestionType
    options: Optional[dict] = None
    correct_answer: str
    explanation: Optional[str] = None
    points: int = 1


class QuizCreate(BaseModel):
    """Quiz creation schema."""
    title: str = Field(..., max_length=500)
    description: Optional[str] = None
    difficulty: QuizDifficulty = QuizDifficulty.MEDIUM
    time_limit_minutes: Optional[int] = Field(None, gt=0)
    questions: List[QuestionCreate]


class QuestionResponse(BaseModel):
    """Question response (without correct answer)."""
    id: int
    question_text: str
    question_type: QuestionType
    options: Optional[dict]
    points: int
    order: int


class QuizResponse(BaseModel):
    """Quiz response."""
    id: int
    title: str
    description: Optional[str]
    difficulty: QuizDifficulty
    time_limit_minutes: Optional[int]
    question_count: int
    user_id: int
    created_at: datetime


class AnswerSubmit(BaseModel):
    """Answer submission."""
    question_id: int
    answer: str


class QuizAttemptStart(BaseModel):
    """Quiz attempt start response."""
    attempt_id: int
    quiz_id: int
    started_at: datetime
    questions: List[QuestionResponse]


class AnswerResult(BaseModel):
    """Individual answer result."""
    question_id: int
    question_text: str
    your_answer: str
    correct_answer: str
    is_correct: bool
    explanation: Optional[str]
    points_earned: int


class QuizResultResponse(BaseModel):
    """Quiz result response."""
    attempt_id: int
    score: Decimal
    max_score: int
    percentage: float
    time_taken_seconds: int
    answers: List[AnswerResult]


# ============================================================================
# Endpoints
# ============================================================================

@router.post("", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
async def create_quiz(
    quiz_data: QuizCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new quiz with questions."""
    if not quiz_data.questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quiz must have at least one question"
        )

    # Create quiz
    new_quiz = Quiz(
        user_id=current_user.id,
        title=quiz_data.title,
        description=quiz_data.description,
        source_type=QuizSourceType.MANUAL,
        difficulty=quiz_data.difficulty,
        time_limit_minutes=quiz_data.time_limit_minutes
    )
    db.add(new_quiz)
    await db.flush()

    # Create questions
    for idx, q_data in enumerate(quiz_data.questions):
        question = QuizQuestion(
            quiz_id=new_quiz.id,
            question_text=q_data.question_text,
            question_type=q_data.question_type,
            options=q_data.options,
            correct_answer=q_data.correct_answer,
            explanation=q_data.explanation,
            points=q_data.points,
            order=idx
        )
        db.add(question)

    await db.commit()
    await db.refresh(new_quiz)

    return QuizResponse(
        id=new_quiz.id,
        title=new_quiz.title,
        description=new_quiz.description,
        difficulty=new_quiz.difficulty,
        time_limit_minutes=new_quiz.time_limit_minutes,
        question_count=len(quiz_data.questions),
        user_id=new_quiz.user_id,
        created_at=new_quiz.created_at
    )


@router.get("", response_model=List[QuizResponse])
async def list_quizzes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List user's quizzes."""
    query = select(Quiz).where(
        and_(
            Quiz.user_id == current_user.id,
            Quiz.deleted_at.is_(None)
        )
    ).order_by(Quiz.created_at.desc())

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    quizzes = result.scalars().all()

    response = []
    for quiz in quizzes:
        q_count = await db.execute(
            select(func.count(QuizQuestion.id)).where(QuizQuestion.quiz_id == quiz.id)
        )
        question_count = q_count.scalar()

        response.append(QuizResponse(
            id=quiz.id,
            title=quiz.title,
            description=quiz.description,
            difficulty=quiz.difficulty,
            time_limit_minutes=quiz.time_limit_minutes,
            question_count=question_count,
            user_id=quiz.user_id,
            created_at=quiz.created_at
        ))

    return response


@router.post("/{quiz_id}/start", response_model=QuizAttemptStart)
async def start_quiz_attempt(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Start a new quiz attempt."""
    # Get quiz and questions
    quiz_result = await db.execute(
        select(Quiz).where(
            and_(
                Quiz.id == quiz_id,
                Quiz.deleted_at.is_(None)
            )
        )
    )
    quiz = quiz_result.scalar_one_or_none()

    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    # Get questions
    questions_result = await db.execute(
        select(QuizQuestion).where(QuizQuestion.quiz_id == quiz_id).order_by(QuizQuestion.order)
    )
    questions = questions_result.scalars().all()

    # Create attempt
    attempt = QuizAttempt(
        quiz_id=quiz_id,
        user_id=current_user.id,
        started_at=datetime.utcnow(),
        score=Decimal("0"),
        max_score=sum(q.points for q in questions),
        answers={}
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)

    return QuizAttemptStart(
        attempt_id=attempt.id,
        quiz_id=quiz_id,
        started_at=attempt.started_at,
        questions=[
            QuestionResponse(
                id=q.id,
                question_text=q.question_text,
                question_type=q.question_type,
                options=q.options,
                points=q.points,
                order=q.order
            )
            for q in questions
        ]
    )


@router.post("/attempts/{attempt_id}/submit", response_model=QuizResultResponse)
async def submit_quiz_attempt(
    attempt_id: int,
    answers: List[AnswerSubmit],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit quiz answers and get results."""
    # Get attempt
    attempt_result = await db.execute(
        select(QuizAttempt).where(
            and_(
                QuizAttempt.id == attempt_id,
                QuizAttempt.user_id == current_user.id
            )
        )
    )
    attempt = attempt_result.scalar_one_or_none()

    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    if attempt.completed_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attempt already completed")

    # Get questions
    questions_result = await db.execute(
        select(QuizQuestion).where(QuizQuestion.quiz_id == attempt.quiz_id)
    )
    questions = {q.id: q for q in questions_result.scalars().all()}

    # Grade answers
    total_score = Decimal("0")
    answer_results = []

    for answer_submit in answers:
        question = questions.get(answer_submit.question_id)
        if not question:
            continue

        is_correct = answer_submit.answer.strip().lower() == question.correct_answer.strip().lower()
        points_earned = question.points if is_correct else 0
        total_score += points_earned

        answer_results.append({
            "question_id": question.id,
            "answer": answer_submit.answer,
            "is_correct": is_correct,
            "points": points_earned
        })

        answer_results.append(AnswerResult(
            question_id=question.id,
            question_text=question.question_text,
            your_answer=answer_submit.answer,
            correct_answer=question.correct_answer,
            is_correct=is_correct,
            explanation=question.explanation,
            points_earned=points_earned
        ))

    # Update attempt
    attempt.completed_at = datetime.utcnow()
    attempt.score = total_score
    attempt.time_taken_seconds = int((attempt.completed_at - attempt.started_at).total_seconds())
    attempt.answers = {"answers": answer_results}

    await db.commit()

    return QuizResultResponse(
        attempt_id=attempt.id,
        score=attempt.score,
        max_score=attempt.max_score,
        percentage=float(attempt.percentage),
        time_taken_seconds=attempt.time_taken_seconds,
        answers=answer_results
    )
