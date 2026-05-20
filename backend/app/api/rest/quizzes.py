"""
Quiz REST API endpoints.

Thin controller — business logic lives in:
- Service layer: app/services/quiz_service.py
- Schemas: app/schemas/quiz.py
"""

from typing import List, Optional
from decimal import Decimal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
import structlog

from app.api.deps import get_db, get_current_user, PaginationParams
from app.models.user import User
from app.models.quiz import Quiz, QuizDifficulty
from app.models.quiz_question import QuizQuestion
from app.models.quiz_attempt import QuizAttempt
from app.core.ai.embeddings.boundary import embed_text_sync, EMBEDDING_VERSION
from app.schemas.study import (
    QuestionCreate,
    QuizCreate,
    QuestionResponse,
    QuizResponse,
    AnswerSubmit,
    QuizAttemptStart,
    AnswerResult,
    QuizResultResponse,
    PartialAnswer,
    QuizAttemptResume,
    QuizGenerateRequest,
    QuizGenerateResponse,
    DueQuestionResponse,
    DueQuestionsResponse,
    QuizInsightsResponse,
    RelatedFlashcardResponse,
    RelatedFlashcardsResponse,
    ContextNoteResponse,
    ContextForWeaknessResponse,
)
from app.services.quiz.service import (
    generate_quiz_from_ai,
    grade_and_submit,
    generate_insights,
)

router = APIRouter()
logger = structlog.get_logger(__name__)


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/due-questions", response_model=DueQuestionsResponse)
async def get_due_questions(
    quiz_id: Optional[int] = Query(None, description="Filter to specific quiz"),
    limit: int = Query(20, ge=1, le=50, description="Max questions to return"),
    bias_by_weakness: bool = Query(False, description="Reorder by proximity to weak areas"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get questions due for SM-2 review."""
    from sqlalchemy import or_
    from app.models.question_learning_state import QuestionLearningState
    from app.models.quiz import Quiz as QuizModel

    now = datetime.utcnow()

    query = (
        select(QuestionLearningState, QuizQuestion, QuizModel)
        .join(QuizQuestion, QuizQuestion.id == QuestionLearningState.question_id)
        .join(QuizModel, QuizModel.id == QuizQuestion.quiz_id)
        .where(
            QuestionLearningState.user_id == current_user.id,
            or_(
                QuestionLearningState.next_review <= now,
                QuestionLearningState.next_review.is_(None),
            ),
        )
        .order_by(QuestionLearningState.next_review.asc().nullsfirst())
    )
    if quiz_id:
        query = query.where(QuizQuestion.quiz_id == quiz_id)

    result = await db.execute(query.limit(limit))
    rows = result.all()

    due_questions = [{"state": s, "question": q, "quiz": qz, "_weakness_proximity": 0.0} for s, q, qz in rows]

    # Phase Q2.5: weakness biasing (reorder only)
    if bias_by_weakness and due_questions:
        due_questions = await _bias_by_weakness(due_questions, current_user.id, db)

    response_questions = [
        DueQuestionResponse(
            question_id=item["question"].id,
            question_text=item["question"].question_text,
            question_type=item["question"].question_type,
            options=item["question"].options,
            quiz_id=item["quiz"].id,
            quiz_title=item["quiz"].title,
            interval_days=item["state"].interval,
            ease_factor=float(item["state"].ease_factor),
            repetitions=item["state"].repetitions,
            last_reviewed_at=item["state"].last_reviewed_at,
            learning_state=item["state"].learning_state.value,
        )
        for item in due_questions
    ]

    count_query = select(func.count(QuestionLearningState.id)).where(
        QuestionLearningState.user_id == current_user.id,
        or_(QuestionLearningState.next_review <= now, QuestionLearningState.next_review.is_(None)),
    )
    if quiz_id:
        count_query = count_query.join(
            QuizQuestion, QuizQuestion.id == QuestionLearningState.question_id
        ).where(QuizQuestion.quiz_id == quiz_id)

    total_due = (await db.execute(count_query)).scalar() or 0
    return DueQuestionsResponse(questions=response_questions, total_due=total_due)


@router.post("", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
async def create_quiz(
    quiz_data: QuizCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new quiz with questions."""
    if not quiz_data.questions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quiz must have at least one question")

    from app.models.quiz import QuizSourceType

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

    for idx, q_data in enumerate(quiz_data.questions):
        embedding, embed_status = embed_text_sync(q_data.question_text)
        question = QuizQuestion(
            quiz_id=new_quiz.id,
            question_text=q_data.question_text,
            question_type=q_data.question_type,
            options=q_data.options,
            correct_answer=q_data.correct_answer,
            explanation=q_data.explanation,
            points=q_data.points,
            order=idx,
            prompt_embedding=embedding,
            embedding_model=EMBEDDING_VERSION if embedding else None,
            embedding_status=embed_status.value,
        )
        db.add(question)

    await db.commit()
    await db.refresh(new_quiz)
    return QuizResponse(
        id=new_quiz.id, title=new_quiz.title, description=new_quiz.description,
        difficulty=new_quiz.difficulty, time_limit_minutes=new_quiz.time_limit_minutes,
        question_count=len(quiz_data.questions), user_id=new_quiz.user_id, created_at=new_quiz.created_at,
    )


@router.post("/generate", response_model=QuizGenerateResponse, status_code=status.HTTP_201_CREATED)
async def generate_quiz(
    request_data: QuizGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a quiz using AI."""
    import json as _json

    try:
        result = await generate_quiz_from_ai(
            user_id=current_user.id,
            topic=request_data.topic,
            num_questions=request_data.num_questions,
            difficulty=request_data.difficulty,
            document_id=request_data.document_id,
            db=db,
        )
        return QuizGenerateResponse(**result)
    except _json.JSONDecodeError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to parse AI response: {e}")
    except Exception as e:
        await db.rollback()
        logger.error("quiz_generation_failed", error=str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to generate quiz: {e}")


@router.get("", response_model=List[QuizResponse])
async def list_quizzes(
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's quizzes with question counts."""
    stmt = (
        select(Quiz, func.count(QuizQuestion.id).label("question_count"))
        .outerjoin(QuizQuestion, QuizQuestion.quiz_id == Quiz.id)
        .where(and_(Quiz.user_id == current_user.id, Quiz.deleted_at.is_(None)))
        .group_by(Quiz.id)
        .order_by(Quiz.created_at.desc())
        .offset(pagination.offset)
        .limit(pagination.page_size)
    )
    result = await db.execute(stmt)
    return [
        QuizResponse(
            id=q.id, title=q.title, description=q.description, difficulty=q.difficulty,
            time_limit_minutes=q.time_limit_minutes, question_count=cnt,
            user_id=q.user_id, created_at=q.created_at,
        )
        for q, cnt in result.all()
    ]


@router.post("/{quiz_id}/start", response_model=QuizAttemptStart)
async def start_quiz_attempt(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Start a new quiz attempt."""
    quiz_result = await db.execute(select(Quiz).where(and_(Quiz.id == quiz_id, Quiz.deleted_at.is_(None))))
    quiz = quiz_result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    questions_result = await db.execute(
        select(QuizQuestion).where(QuizQuestion.quiz_id == quiz_id).order_by(QuizQuestion.order)
    )
    questions = questions_result.scalars().all()

    attempt = QuizAttempt(
        quiz_id=quiz_id, user_id=current_user.id, started_at=datetime.utcnow(),
        score=Decimal("0"), max_score=sum(q.points for q in questions), answers={},
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)

    return QuizAttemptStart(
        attempt_id=attempt.id, quiz_id=quiz_id, started_at=attempt.started_at,
        questions=[
            QuestionResponse(
                id=q.id, question_text=q.question_text, question_type=q.question_type,
                options=q.options, points=q.points, order=q.order,
                correct_answer=q.correct_answer, explanation=q.explanation,
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
    try:
        result = await grade_and_submit(attempt_id, current_user.id, answers, db)
        return QuizResultResponse(
            attempt_id=result["attempt_id"],
            score=result["score"],
            max_score=result["max_score"],
            percentage=result["percentage"],
            time_taken_seconds=result["time_taken_seconds"],
            answers=[AnswerResult(**a) for a in result["answers"]],
        )
    except ValueError as e:
        detail = str(e)
        code = status.HTTP_404_NOT_FOUND if "not found" in detail.lower() else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=code, detail=detail)


@router.get("/attempts/{attempt_id}", response_model=QuizResultResponse)
async def get_quiz_attempt(
    attempt_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve a completed quiz attempt's results."""
    attempt = await _get_user_attempt(db, attempt_id, current_user.id)
    if not attempt.completed_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attempt not yet completed.")

    stored = attempt.answers.get("answers", []) if attempt.answers else []
    return QuizResultResponse(
        attempt_id=attempt.id, score=attempt.score, max_score=attempt.max_score,
        percentage=float(attempt.percentage), time_taken_seconds=attempt.time_taken_seconds or 0,
        answers=[AnswerResult(**a) for a in stored],
    )


@router.get("/attempts/{attempt_id}/insights", response_model=QuizInsightsResponse)
async def get_quiz_attempt_insights(
    attempt_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get AI-generated insights for a completed quiz attempt."""
    attempt = await _get_user_attempt(db, attempt_id, current_user.id)
    if not attempt.completed_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attempt not yet completed")

    data = generate_insights(attempt)
    return QuizInsightsResponse(**data)


@router.get("/{quiz_id}/active", response_model=Optional[int])
async def get_active_attempt(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check if there's an active (incomplete) attempt for this quiz."""
    result = await db.execute(
        select(QuizAttempt.id).where(
            and_(
                QuizAttempt.quiz_id == quiz_id,
                QuizAttempt.user_id == current_user.id,
                QuizAttempt.completed_at.is_(None),
            )
        ).order_by(QuizAttempt.started_at.desc()).limit(1)
    )
    return result.scalar()


@router.get("/attempts/{attempt_id}/resume", response_model=QuizAttemptResume)
async def resume_quiz_attempt(
    attempt_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Resume an in-progress quiz attempt."""
    attempt = await _get_user_attempt(db, attempt_id, current_user.id)
    if attempt.completed_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attempt already completed.")

    quiz = (await db.execute(select(Quiz).where(Quiz.id == attempt.quiz_id))).scalar_one_or_none()

    questions_result = await db.execute(
        select(QuizQuestion).where(QuizQuestion.quiz_id == attempt.quiz_id).order_by(QuizQuestion.order)
    )
    questions = questions_result.scalars().all()

    # Elapsed time
    started = attempt.started_at
    if started.tzinfo is not None:
        started = started.replace(tzinfo=None)
    elapsed = int((datetime.utcnow() - started).total_seconds())
    is_expired = quiz and quiz.time_limit_minutes and elapsed > quiz.time_limit_minutes * 60

    # Extract partial answers
    partial_answers = _extract_partial_answers(attempt.answers or {})

    return QuizAttemptResume(
        attempt_id=attempt.id, quiz_id=attempt.quiz_id, started_at=attempt.started_at,
        time_limit_minutes=quiz.time_limit_minutes if quiz else None,
        elapsed_seconds=elapsed, current_question_index=len(partial_answers),
        questions=[
            QuestionResponse(
                id=q.id, question_text=q.question_text, question_type=q.question_type,
                options=q.options, points=q.points, order=q.order,
                correct_answer=q.correct_answer, explanation=q.explanation,
            )
            for q in questions
        ],
        partial_answers=partial_answers, is_expired=is_expired,
    )


@router.post("/attempts/{attempt_id}/save")
async def save_partial_answers(
    attempt_id: int,
    answers: List[AnswerSubmit],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save partial answers without submitting."""
    attempt = await _get_user_attempt(db, attempt_id, current_user.id)
    if attempt.completed_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attempt already completed")

    attempt.answers = {"partial": [{"question_id": a.question_id, "answer": a.answer} for a in answers]}
    await db.commit()
    return {"status": "saved", "count": len(answers)}


# ============================================================================
# Phase Q3: Cross-Module Surfacing
# ============================================================================


@router.get("/questions/{question_id}/related-flashcards", response_model=RelatedFlashcardsResponse)
async def get_related_flashcards(
    question_id: int,
    limit: int = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Surface flashcards semantically close to a quiz question (advisory only)."""
    from app.services.graph.semantic_neighbor import SemanticNeighborService
    from app.services.graph.evidence_overlay import EvidenceOverlayService

    neighbors = await SemanticNeighborService.get_neighbors_for_question(
        db, question_id, current_user.id, entity_types=["flashcard"], limit=limit
    )
    if not neighbors:
        return RelatedFlashcardsResponse(flashcards=[], advisory_message="No related flashcards found")

    enriched = await EvidenceOverlayService.enrich_with_evidence(db, current_user.id, neighbors)
    return RelatedFlashcardsResponse(
        flashcards=[
            RelatedFlashcardResponse(
                id=e.id, front_text=e.content_preview, similarity=round(e.similarity, 3),
                evidence_strength=e.evidence_strength, last_quality=e.last_quality,
                days_since_review=e.days_since_review,
            )
            for e in enriched
        ],
        advisory_message="Related recall cards in this semantic area",
    )


@router.get("/learning/context-for-weakness", response_model=ContextForWeaknessResponse)
async def get_context_for_weakness(
    lookback_days: int = Query(7, ge=1, le=30),
    limit: int = Query(3, ge=1, le=10),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Surface notes related to recent low-quality quiz attempts (advisory only)."""
    from sqlalchemy import text
    from app.services.graph.semantic_neighbor import SemanticNeighborService
    import numpy as np

    failures_result = await db.execute(
        text("""
            SELECT qq.prompt_embedding
            FROM activity_logs al
            JOIN quiz_questions qq ON qq.id = al.resource_id
            WHERE al.user_id = :user_id
              AND al.activity_type = 'quiz_question_attempt'
              AND al.quality_score < 3
              AND al.created_at > NOW() - INTERVAL ':days days'
              AND qq.prompt_embedding IS NOT NULL
              AND al.is_learning_event = true
            ORDER BY al.created_at DESC LIMIT 10
        """.replace(":days", str(lookback_days))),
        {"user_id": current_user.id},
    )

    embeddings = [row.prompt_embedding for row in failures_result if row.prompt_embedding]
    if not embeddings:
        return ContextForWeaknessResponse(notes=[], advisory_message="No recent difficulty patterns detected")

    weak_centroid = np.mean(embeddings, axis=0)
    weak_centroid = (weak_centroid / np.linalg.norm(weak_centroid)).tolist()

    neighbors = await SemanticNeighborService.get_neighbors_for_embedding(
        db, weak_centroid, current_user.id, entity_types=["note"], limit=limit
    )
    if not neighbors:
        return ContextForWeaknessResponse(notes=[], advisory_message="No relevant notes found")

    return ContextForWeaknessResponse(
        notes=[ContextNoteResponse(id=n.id, title=n.content_preview, similarity=round(n.similarity, 3)) for n in neighbors],
        advisory_message="Reference material near recent difficulty areas",
    )


# ============================================================================
# Internal Helpers
# ============================================================================


async def _get_user_attempt(db: AsyncSession, attempt_id: int, user_id: int) -> QuizAttempt:
    """Get attempt owned by user or raise 404."""
    result = await db.execute(
        select(QuizAttempt).where(and_(QuizAttempt.id == attempt_id, QuizAttempt.user_id == user_id))
    )
    attempt = result.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")
    return attempt


def _extract_partial_answers(answers_data: dict) -> List[PartialAnswer]:
    """Extract partial answers from stored attempt data."""
    partial = []
    if "answers" in answers_data:
        for a in answers_data["answers"]:
            partial.append(PartialAnswer(question_id=a["question_id"], answer=a.get("your_answer", a.get("answer", ""))))
    elif "partial" in answers_data:
        for a in answers_data["partial"]:
            partial.append(PartialAnswer(question_id=a["question_id"], answer=a["answer"]))
    return partial


async def _bias_by_weakness(due_questions: list, user_id: int, db: AsyncSession) -> list:
    """Reorder due questions by proximity to weak areas (advisory, never expand)."""
    try:
        from app.core.ai.rag.synapse_integration import get_synapse_bridge
        from app.core.ai.embeddings.boundary import embed_text_sync as _embed
        import numpy as np

        bridge = await get_synapse_bridge(db)
        context = await bridge.get_user_context(user_id)
        weak_areas = context.get("weak_areas", [])

        if weak_areas:
            weak_embeddings = []
            for area in weak_areas[:5]:
                area_text = area.get("topic", "") or area.get("name", "") if isinstance(area, dict) else str(area)
                if area_text:
                    emb, st = _embed(area_text)
                    if emb:
                        weak_embeddings.append(emb)

            if weak_embeddings:
                centroid = np.mean(weak_embeddings, axis=0)
                centroid = centroid / np.linalg.norm(centroid)
                for item in due_questions:
                    if item["question"].prompt_embedding:
                        q_emb = np.array(item["question"].prompt_embedding)
                        q_emb = q_emb / np.linalg.norm(q_emb)
                        item["_weakness_proximity"] = float(np.dot(q_emb, centroid))
                due_questions.sort(key=lambda x: x["_weakness_proximity"], reverse=True)
    except Exception as e:
        logger.warning("weakness_biasing_failed", error=str(e))

    return due_questions
