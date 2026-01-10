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
    """Question response with answers for learning mode."""

    id: int
    question_text: str
    question_type: QuestionType
    options: Optional[dict]
    points: int
    order: int
    # Include correct answer and explanation for real-time feedback
    correct_answer: str
    explanation: Optional[str] = None


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


class PartialAnswer(BaseModel):
    """A saved partial answer during an attempt."""

    question_id: int
    answer: str


class QuizAttemptResume(BaseModel):
    """Response for resuming an in-progress attempt."""

    attempt_id: int
    quiz_id: int
    started_at: datetime
    time_limit_minutes: Optional[int]
    elapsed_seconds: int
    current_question_index: int
    questions: List[QuestionResponse]
    partial_answers: List[PartialAnswer]
    is_expired: bool


class QuizGenerateRequest(BaseModel):
    """AI quiz generation request."""

    topic: str = Field(
        ..., min_length=3, max_length=500, description="Topic to generate quiz about"
    )
    document_id: Optional[int] = Field(None, description="Optional document to base quiz on")
    num_questions: int = Field(10, ge=5, le=30, description="Number of questions to generate")
    difficulty: QuizDifficulty = Field(QuizDifficulty.MEDIUM, description="Quiz difficulty level")


class QuizGenerateResponse(BaseModel):
    """AI quiz generation response."""

    quiz_id: int
    title: str
    description: Optional[str]
    difficulty: QuizDifficulty
    question_count: int
    status: str
    message: str


# ============================================================================
# Endpoints
# ============================================================================


@router.post("", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
async def create_quiz(
    quiz_data: QuizCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new quiz with questions."""
    if not quiz_data.questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Quiz must have at least one question"
        )

    # Create quiz
    new_quiz = Quiz(
        user_id=current_user.id,
        title=quiz_data.title,
        description=quiz_data.description,
        source_type=QuizSourceType.MANUAL,
        difficulty=quiz_data.difficulty,
        time_limit_minutes=quiz_data.time_limit_minutes,
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
            order=idx,
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
        created_at=new_quiz.created_at,
    )


@router.post(
    "/generate",
    response_model=QuizGenerateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate quiz with AI",
    description="Use AI to generate a quiz from a topic or document",
)
async def generate_quiz(
    request_data: QuizGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a quiz using AI.

    Steps:
    1. Build prompt with topic and difficulty
    2. Use QuizAgent to generate questions
    3. Parse structured output
    4. Create quiz and questions in database
    """
    import json
    import re
    import structlog

    logger = structlog.get_logger(__name__)

    try:
        from app.core.ai.orchestrator import get_orchestrator

        # Build generation prompt
        difficulty_desc = {
            QuizDifficulty.EASY: "simple, beginner-level",
            QuizDifficulty.MEDIUM: "intermediate, moderate difficulty",
            QuizDifficulty.HARD: "challenging, advanced",
        }

        prompt = f"""Generate a quiz about: {request_data.topic}

Requirements:
- Generate exactly {request_data.num_questions} multiple-choice questions
- Difficulty: {difficulty_desc.get(request_data.difficulty, "intermediate")}
- Each question must have 4 options (A, B, C, D)
- Include the correct answer and a brief explanation

Return ONLY valid JSON in this exact format:
{{
  "title": "Quiz title",
  "description": "Brief description",
  "questions": [
    {{
      "question": "The question text",
      "options": {{"A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D"}},
      "correct_answer": "A",
      "explanation": "Why this is correct"
    }}
  ]
}}"""

        # Call orchestrator (will route to quiz agent or tutor)
        orchestrator = get_orchestrator()
        result = await orchestrator.handle_message(
            message=prompt,
            user_id=current_user.id,
            session_id=0,  # No session needed
            context={"document_id": request_data.document_id},
            chat_history=[],
        )

        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"AI generation failed: {result.output}",
            )

        # Parse AI response
        response_text = result.output

        # Extract JSON from response (handle markdown code blocks)
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", response_text)
        if json_match:
            json_str = json_match.group(1)
        else:
            # Try to find raw JSON
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
            else:
                raise ValueError("Could not extract JSON from response")

        quiz_data = json.loads(json_str)

        # Validate structure
        if not quiz_data.get("questions"):
            raise ValueError("No questions in response")

        # Create quiz
        new_quiz = Quiz(
            user_id=current_user.id,
            title=quiz_data.get("title", f"Quiz: {request_data.topic}"),
            description=quiz_data.get(
                "description", f"AI-generated quiz about {request_data.topic}"
            ),
            source_type=QuizSourceType.AI_GENERATED,
            difficulty=request_data.difficulty,
            time_limit_minutes=max(5, request_data.num_questions * 2),  # 2 min per question
        )
        db.add(new_quiz)
        await db.flush()

        # Create questions
        questions_created = 0
        for idx, q_data in enumerate(quiz_data["questions"]):
            question = QuizQuestion(
                quiz_id=new_quiz.id,
                question_text=q_data.get("question", ""),
                question_type=QuestionType.MULTIPLE_CHOICE,
                options=q_data.get("options", {}),
                correct_answer=q_data.get("correct_answer", "A"),
                explanation=q_data.get("explanation"),
                points=1,
                order=idx,
            )
            db.add(question)
            questions_created += 1

        await db.commit()
        await db.refresh(new_quiz)

        logger.info(
            "quiz_generated",
            user_id=current_user.id,
            quiz_id=new_quiz.id,
            questions=questions_created,
            topic=request_data.topic,
        )

        return QuizGenerateResponse(
            quiz_id=new_quiz.id,
            title=new_quiz.title,
            description=new_quiz.description,
            difficulty=new_quiz.difficulty,
            question_count=questions_created,
            status="success",
            message=f"Successfully generated {questions_created} questions",
        )

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse AI response as JSON: {str(e)}",
        )
    except Exception as e:
        await db.rollback()
        logger.error("quiz_generation_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate quiz: {str(e)}",
        )


@router.get("", response_model=List[QuizResponse])
async def list_quizzes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's quizzes with question counts (optimized - single query)."""
    # Single query with LEFT OUTER JOIN to get quizzes and question counts together
    stmt = (
        select(Quiz, func.count(QuizQuestion.id).label("question_count"))
        .outerjoin(QuizQuestion, QuizQuestion.quiz_id == Quiz.id)
        .where(and_(Quiz.user_id == current_user.id, Quiz.deleted_at.is_(None)))
        .group_by(Quiz.id)
        .order_by(Quiz.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    result = await db.execute(stmt)
    quizzes_with_counts = result.all()

    return [
        QuizResponse(
            id=quiz.id,
            title=quiz.title,
            description=quiz.description,
            difficulty=quiz.difficulty,
            time_limit_minutes=quiz.time_limit_minutes,
            question_count=question_count,
            user_id=quiz.user_id,
            created_at=quiz.created_at,
        )
        for quiz, question_count in quizzes_with_counts
    ]


@router.post("/{quiz_id}/start", response_model=QuizAttemptStart)
async def start_quiz_attempt(
    quiz_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """Start a new quiz attempt."""
    # Get quiz and questions
    quiz_result = await db.execute(
        select(Quiz).where(and_(Quiz.id == quiz_id, Quiz.deleted_at.is_(None)))
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
        answers={},
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
                order=q.order,
                correct_answer=q.correct_answer,
                explanation=q.explanation,
            )
            for q in questions
        ],
    )


@router.post("/attempts/{attempt_id}/submit", response_model=QuizResultResponse)
async def submit_quiz_attempt(
    attempt_id: int,
    answers: List[AnswerSubmit],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit quiz answers and get results."""
    # Get attempt
    attempt_result = await db.execute(
        select(QuizAttempt).where(
            and_(QuizAttempt.id == attempt_id, QuizAttempt.user_id == current_user.id)
        )
    )
    attempt = attempt_result.scalar_one_or_none()

    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    if attempt.completed_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Attempt already completed"
        )

    # Get questions
    questions_result = await db.execute(
        select(QuizQuestion).where(QuizQuestion.quiz_id == attempt.quiz_id)
    )
    questions = {q.id: q for q in questions_result.scalars().all()}

    # Separate lists: db_answers for JSON storage, answer_results for response
    total_score = Decimal("0")
    answer_results = []
    db_answers = []

    for answer_submit in answers:
        question = questions.get(answer_submit.question_id)
        if not question:
            continue

        is_correct = answer_submit.answer.strip().lower() == question.correct_answer.strip().lower()
        points_earned = question.points if is_correct else 0
        total_score += points_earned

        # Dict for database storage
        db_answers.append(
            {
                "question_id": question.id,
                "question_text": question.question_text,
                "your_answer": answer_submit.answer,
                "correct_answer": question.correct_answer,
                "is_correct": is_correct,
                "explanation": question.explanation,
                "points_earned": points_earned,
            }
        )

        # AnswerResult for response
        answer_results.append(
            AnswerResult(
                question_id=question.id,
                question_text=question.question_text,
                your_answer=answer_submit.answer,
                correct_answer=question.correct_answer,
                is_correct=is_correct,
                explanation=question.explanation,
                points_earned=points_earned,
            )
        )

    # Update attempt - handle both timezone-aware and naive datetimes
    from datetime import timezone

    now = datetime.now(timezone.utc)
    attempt.completed_at = now
    attempt.score = total_score

    # Handle timezone awareness mismatch
    started = attempt.started_at
    if started.tzinfo is None:
        # Database has naive datetime, make completed_at naive too
        completed = attempt.completed_at.replace(tzinfo=None)
    else:
        completed = attempt.completed_at
        if completed.tzinfo is None:
            from datetime import timezone

            completed = completed.replace(tzinfo=timezone.utc)

    attempt.time_taken_seconds = int((completed - started).total_seconds())
    attempt.answers = {"answers": db_answers}  # Store dicts, not AnswerResult objects

    await db.commit()

    return QuizResultResponse(
        attempt_id=attempt.id,
        score=attempt.score,
        max_score=attempt.max_score,
        percentage=float(attempt.percentage),
        time_taken_seconds=attempt.time_taken_seconds,
        answers=answer_results,  # Return AnswerResult objects
    )


@router.get("/attempts/{attempt_id}", response_model=QuizResultResponse)
async def get_quiz_attempt(
    attempt_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve a completed quiz attempt's results.

    This endpoint allows fetching results for a previously completed attempt,
    enabling refresh-safe results pages and historical review.
    """
    # Get attempt
    attempt_result = await db.execute(
        select(QuizAttempt).where(
            and_(QuizAttempt.id == attempt_id, QuizAttempt.user_id == current_user.id)
        )
    )
    attempt = attempt_result.scalar_one_or_none()

    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    if not attempt.completed_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attempt not yet completed. Use the submit endpoint first.",
        )

    # Reconstruct AnswerResult objects from stored answers
    stored_answers = attempt.answers.get("answers", []) if attempt.answers else []
    answer_results = [
        AnswerResult(
            question_id=ans["question_id"],
            question_text=ans["question_text"],
            your_answer=ans["your_answer"],
            correct_answer=ans["correct_answer"],
            is_correct=ans["is_correct"],
            explanation=ans.get("explanation"),
            points_earned=ans["points_earned"],
        )
        for ans in stored_answers
    ]

    return QuizResultResponse(
        attempt_id=attempt.id,
        score=attempt.score,
        max_score=attempt.max_score,
        percentage=float(attempt.percentage),
        time_taken_seconds=attempt.time_taken_seconds or 0,
        answers=answer_results,
    )


class QuizInsightsResponse(BaseModel):
    """AI-generated insights for a quiz attempt."""

    attempt_id: int
    summary: str
    weak_areas: List[str]
    recommendations: List[str]
    generated_at: datetime


@router.get("/attempts/{attempt_id}/insights", response_model=QuizInsightsResponse)
async def get_quiz_attempt_insights(
    attempt_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get AI-generated insights for a completed quiz attempt.

    Analyzes performance patterns and provides actionable recommendations.
    Currently returns a basic analysis; will be enhanced with full AI integration.
    """
    # Get attempt
    attempt_result = await db.execute(
        select(QuizAttempt).where(
            and_(QuizAttempt.id == attempt_id, QuizAttempt.user_id == current_user.id)
        )
    )
    attempt = attempt_result.scalar_one_or_none()

    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    if not attempt.completed_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attempt not yet completed",
        )

    # Analyze answers to find weak areas
    stored_answers = attempt.answers.get("answers", []) if attempt.answers else []
    incorrect_answers = [ans for ans in stored_answers if not ans.get("is_correct", False)]

    # Basic analysis (to be enhanced with AI later)
    weak_areas = []
    for ans in incorrect_answers[:3]:  # Top 3 weak areas
        weak_areas.append(f"Question: {ans.get('question_text', 'Unknown')[:50]}...")

    # Generate summary based on performance
    percentage = float(attempt.percentage) if attempt.percentage else 0
    if percentage >= 90:
        summary = "Excellent performance! You demonstrated strong mastery of the material."
    elif percentage >= 70:
        summary = "Good performance with some areas for improvement."
    elif percentage >= 50:
        summary = "Moderate performance. Review the incorrect answers to strengthen understanding."
    else:
        summary = "This topic needs more study. Consider reviewing the material before retrying."

    # Basic recommendations
    recommendations = []
    if incorrect_answers:
        recommendations.append("Review the explanations for incorrect answers")
        recommendations.append("Create flashcards for topics you missed")
    if percentage < 80:
        recommendations.append("Consider retaking this quiz after review")

    return QuizInsightsResponse(
        attempt_id=attempt.id,
        summary=summary,
        weak_areas=weak_areas,
        recommendations=recommendations,
        generated_at=datetime.utcnow(),
    )


# ============================================================================
# Attempt Resume Endpoints
# ============================================================================


@router.get("/{quiz_id}/active", response_model=Optional[int])
async def get_active_attempt(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Check if there's an active (incomplete) attempt for this quiz.

    Returns the attempt_id if one exists, null otherwise.
    Used by frontend to decide whether to start new or resume.
    """
    result = await db.execute(
        select(QuizAttempt.id)
        .where(
            and_(
                QuizAttempt.quiz_id == quiz_id,
                QuizAttempt.user_id == current_user.id,
                QuizAttempt.completed_at.is_(None),  # Not completed
            )
        )
        .order_by(QuizAttempt.started_at.desc())
        .limit(1)  # Only get the most recent one
    )
    attempt_id = result.scalar()  # Returns first or None
    return attempt_id


@router.get("/attempts/{attempt_id}/resume", response_model=QuizAttemptResume)
async def resume_quiz_attempt(
    attempt_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Resume an in-progress quiz attempt.

    Returns questions, partial answers, and timing info.
    Allows frontend to rehydrate state after page refresh.
    """
    # Get attempt
    attempt_result = await db.execute(
        select(QuizAttempt).where(
            and_(QuizAttempt.id == attempt_id, QuizAttempt.user_id == current_user.id)
        )
    )
    attempt = attempt_result.scalar_one_or_none()

    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    if attempt.completed_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attempt already completed. Use GET /attempts/{id} for results.",
        )

    # Get quiz for time limit
    quiz_result = await db.execute(select(Quiz).where(Quiz.id == attempt.quiz_id))
    quiz = quiz_result.scalar_one_or_none()

    # Get questions
    questions_result = await db.execute(
        select(QuizQuestion)
        .where(QuizQuestion.quiz_id == attempt.quiz_id)
        .order_by(QuizQuestion.order)
    )
    questions = questions_result.scalars().all()

    # Calculate elapsed time
    started = attempt.started_at
    if started.tzinfo is not None:
        started = started.replace(tzinfo=None)
    elapsed_seconds = int((datetime.utcnow() - started).total_seconds())

    # Check if expired (if timed)
    is_expired = False
    if quiz and quiz.time_limit_minutes:
        time_limit_seconds = quiz.time_limit_minutes * 60
        is_expired = elapsed_seconds > time_limit_seconds

    # Get partial answers from attempt.answers
    partial_answers = []
    saved_answers = attempt.answers or {}
    # Handle both {"answers": [...]} and direct dict formats
    if "answers" in saved_answers:
        for ans in saved_answers.get("answers", []):
            partial_answers.append(
                PartialAnswer(
                    question_id=ans["question_id"],
                    answer=ans.get("your_answer", ans.get("answer", "")),
                )
            )
    elif "partial" in saved_answers:
        for ans in saved_answers.get("partial", []):
            partial_answers.append(
                PartialAnswer(question_id=ans["question_id"], answer=ans["answer"])
            )

    # Determine current question index based on answered questions
    current_index = len(partial_answers) if partial_answers else 0

    return QuizAttemptResume(
        attempt_id=attempt.id,
        quiz_id=attempt.quiz_id,
        started_at=attempt.started_at,
        time_limit_minutes=quiz.time_limit_minutes if quiz else None,
        elapsed_seconds=elapsed_seconds,
        current_question_index=current_index,
        questions=[
            QuestionResponse(
                id=q.id,
                question_text=q.question_text,
                question_type=q.question_type,
                options=q.options,
                points=q.points,
                order=q.order,
                correct_answer=q.correct_answer,
                explanation=q.explanation,
            )
            for q in questions
        ],
        partial_answers=partial_answers,
        is_expired=is_expired,
    )


@router.post("/attempts/{attempt_id}/save")
async def save_partial_answers(
    attempt_id: int,
    answers: List[AnswerSubmit],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Save partial answers without submitting.

    Enables resume functionality by persisting progress.
    """
    # Get attempt
    attempt_result = await db.execute(
        select(QuizAttempt).where(
            and_(QuizAttempt.id == attempt_id, QuizAttempt.user_id == current_user.id)
        )
    )
    attempt = attempt_result.scalar_one_or_none()

    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    if attempt.completed_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Attempt already completed"
        )

    # Save partial answers
    partial = [{"question_id": a.question_id, "answer": a.answer} for a in answers]
    attempt.answers = {"partial": partial}

    await db.commit()

    return {"status": "saved", "count": len(answers)}
