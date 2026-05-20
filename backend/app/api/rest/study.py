"""
Study session REST API endpoints.

Study session management with multi-modal support for flashcards and quizzes.
Complete implementation with quiz items integrated into study flow.
"""

from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from pydantic import BaseModel, Field
import logging

from app.api.deps import get_db, get_current_user, PaginationParams
from app.models.user import User
from app.models.study_session import StudySession, StudySessionType
from app.models.flashcard import Flashcard, LearningState
from app.models.deck import Deck
from app.models.quiz import Quiz, QuizDifficulty
from app.models.quiz_attempt import QuizAttempt
from app.schemas.study import (
    StudyItemResponse,
    StudySessionCreate,
    StudySessionResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ============================================================================
# Helper Functions
# ============================================================================


async def get_due_flashcards(user_id: int, limit: int, db: AsyncSession) -> List[dict]:
    """
    Get due flashcards for user.

    Returns flashcards that need review, prioritized by:
    1. Overdue items
    2. New items
    3. Review items
    """
    try:
        cards_query = (
            select(Flashcard)
            .join(Deck)
            .where(
                and_(
                    Deck.user_id == user_id,
                    Flashcard.deleted_at.is_(None),
                    Deck.deleted_at.is_(None),
                    or_(
                        Flashcard.next_review <= datetime.now(timezone.utc), Flashcard.next_review.is_(None)
                    ),
                )
            )
            .order_by(
                # Overdue cards first
                (Flashcard.next_review < datetime.now(timezone.utc)).desc(),
                # Then new cards
                (Flashcard.learning_state == LearningState.NEW).desc(),
                # Then by next review date
                Flashcard.next_review.asc().nullsfirst(),
            )
            .limit(limit)
        )

        cards_result = await db.execute(cards_query)
        cards = cards_result.scalars().all()

        return [
            {
                "type": "flashcard",
                "id": card.id,
                "data": {
                    "front_text": card.front_text,
                    "back_text": card.back_text,
                    "deck_id": card.deck_id,
                    "learning_state": card.learning_state.value,
                    "next_review": card.next_review.isoformat() if card.next_review else None,
                    "ease_factor": float(card.ease_factor) if card.ease_factor else 2.5,
                },
            }
            for card in cards
        ]

    except Exception as e:
        logger.error(f"Error fetching due flashcards: {str(e)}")
        return []


async def get_due_quizzes(user_id: int, limit: int, db: AsyncSession) -> List[dict]:
    """
    Get quizzes due for retake/review (optimized - single query).

    Returns quizzes that need another attempt based on:
    1. Time elapsed since last attempt
    2. Performance on last attempt
    3. Quiz difficulty level
    """
    try:
        # Subquery to get latest attempt for each quiz
        # Using window function ROW_NUMBER() to get the most recent attempt
        latest_attempt_subq = (
            select(
                QuizAttempt.quiz_id,
                QuizAttempt.completed_at,
                QuizAttempt.score,
                QuizAttempt.max_score,
                func.row_number()
                .over(partition_by=QuizAttempt.quiz_id, order_by=QuizAttempt.completed_at.desc())
                .label("rn"),
            )
            .where(QuizAttempt.user_id == user_id)
            .where(QuizAttempt.completed_at.isnot(None))
            .subquery()
        )

        # Main query: quizzes with their latest attempt (if any)
        stmt = (
            select(
                Quiz,
                latest_attempt_subq.c.completed_at.label("last_completed_at"),
                latest_attempt_subq.c.score.label("last_score"),
                latest_attempt_subq.c.max_score.label("last_max_score"),
            )
            .outerjoin(
                latest_attempt_subq,
                and_(latest_attempt_subq.c.quiz_id == Quiz.id, latest_attempt_subq.c.rn == 1),
            )
            .where(and_(Quiz.user_id == user_id, Quiz.deleted_at.is_(None)))
        )

        result = await db.execute(stmt)
        rows = result.all()

        due_quizzes = []
        for quiz, last_completed_at, last_score, last_max_score in rows:
            # Determine if quiz is due
            is_due = False
            priority = "normal"
            last_percentage = None

            if not last_completed_at:
                # Never attempted
                is_due = True
                priority = "new"
            else:
                # Calculate percentage
                if last_max_score and last_max_score > 0:
                    last_percentage = float(last_score or 0) / float(last_max_score) * 100
                else:
                    last_percentage = 0

                # Check based on difficulty and performance
                time_since_attempt = datetime.now(timezone.utc) - last_completed_at

                # Spaced repetition: easier quizzes reviewed less frequently
                if quiz.difficulty == QuizDifficulty.EASY:
                    review_interval = 14  # 14 days
                elif quiz.difficulty == QuizDifficulty.MEDIUM:
                    review_interval = 7  # 7 days
                else:  # HARD
                    review_interval = 3  # 3 days

                if time_since_attempt.days >= review_interval:
                    is_due = True
                    # Low scores need more frequent review
                    if last_percentage and last_percentage < 70:
                        priority = "high"

            if is_due:
                # Get question count (already loaded if using eager loading, otherwise one query)
                question_count = len(quiz.questions) if quiz.questions else 0

                due_quizzes.append(
                    {
                        "type": "quiz",
                        "id": quiz.id,
                        "data": {
                            "title": quiz.title,
                            "description": quiz.description,
                            "question_count": question_count,
                            "difficulty": quiz.difficulty.value,
                            "time_limit_minutes": quiz.time_limit_minutes,
                            "priority": priority,
                            "last_score": last_percentage,
                        },
                    }
                )

        # Sort by priority (high first) and limit
        priority_order = {"high": 0, "new": 1, "normal": 2}
        due_quizzes.sort(key=lambda x: priority_order.get(x["data"]["priority"], 3))

        return due_quizzes[:limit]

    except Exception as e:
        logger.error(f"Error fetching due quizzes: {str(e)}")
        return []


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/due", response_model=List[StudyItemResponse])
async def get_due_items(
    modules: str = Query("flashcards,quizzes", description="Comma-separated modules"),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all due items across modules.

    Aggregates items from different learning modules (flashcards, quizzes)
    that need review, prioritized by due date and performance.
    """
    module_list = [m.strip() for m in modules.split(",")]
    items = []

    # Get due flashcards
    if "flashcards" in module_list:
        flashcards = await get_due_flashcards(current_user.id, limit, db)
        items.extend(flashcards)

    # Get due quizzes
    if "quizzes" in module_list:
        quizzes = await get_due_quizzes(current_user.id, limit, db)
        items.extend(quizzes)

    # Sort by priority: high first, then by module order
    priority_map = {"high": 0, "new": 1, "normal": 2}
    items.sort(key=lambda x: priority_map.get(x["data"].get("priority"), 2))

    logger.info(
        f"due_items_retrieved user_id={current_user.id} total_items={len(items)} modules={module_list}"
    )

    return items[:limit]


@router.post("/sessions", response_model=StudySessionResponse, status_code=status.HTTP_201_CREATED)
async def start_session(
    session_data: StudySessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Start a new study session."""
    new_session = StudySession(
        user_id=current_user.id,
        session_type=session_data.session_type,
        modules_used={"modules": session_data.modules},
        started_at=datetime.now(timezone.utc),
    )

    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)

    logger.info(
        f"study_session_created user_id={current_user.id} session_id={new_session.id} "
        f"session_type={session_data.session_type} modules={session_data.modules}"
    )

    return StudySessionResponse(
        id=new_session.id,
        session_type=new_session.session_type,
        modules_used=session_data.modules,
        items_completed=0,
        items_correct=0,
        accuracy=0.0,
        time_spent_seconds=0,
        started_at=new_session.started_at,
        ended_at=None,
        is_completed=False,
    )



@router.get(
    "/sessions/active",
    tags=["Study Sessions"],
    summary="Get resumable sessions (used at top to win over /{session_id})",
    include_in_schema=False,  # Shown via the Sprint 2 section docstring
)
async def get_active_sessions_early(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Thin forward — real implementation is in the Sprint 2 section below.
    Must be registered BEFORE /sessions/{session_id} so 'active' is not
    treated as a numeric session_id.
    """
    from app.services.flashcards.session_service import SessionService as _SS
    service = _SS(db)
    sessions = await service.get_active_sessions(current_user.id)
    for s in sessions:
        planned = len(s.get("cards_planned") or [])
        reviewed = s.get("current_card_index") or 0
        s["progress_pct"] = round(reviewed / planned * 100, 1) if planned else 0.0
    return sessions


@router.get("/sessions/{session_id}", response_model=StudySessionResponse)
async def get_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific study session."""
    result = await db.execute(
        select(StudySession).where(
            and_(StudySession.id == session_id, StudySession.user_id == current_user.id)
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    modules = session.modules_used.get("modules", []) if session.modules_used else []

    return StudySessionResponse(
        id=session.id,
        session_type=session.session_type,
        modules_used=modules,
        items_completed=session.items_completed,
        items_correct=session.items_correct,
        accuracy=session.accuracy,
        time_spent_seconds=session.time_spent_seconds,
        started_at=session.started_at,
        ended_at=session.ended_at,
        is_completed=session.is_completed,
    )


@router.post("/sessions/{session_id}/complete", response_model=StudySessionResponse)
async def complete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Complete a study session."""
    result = await db.execute(
        select(StudySession).where(
            and_(StudySession.id == session_id, StudySession.user_id == current_user.id)
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if session.ended_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Session already completed"
        )

    # Complete session
    session.ended_at = datetime.now(timezone.utc)
    session.time_spent_seconds = int((session.ended_at - session.started_at).total_seconds())
    session.is_completed = True

    await db.commit()
    await db.refresh(session)

    logger.info(
        f"study_session_completed user_id={current_user.id} session_id={session.id} "
        f"time_spent_seconds={session.time_spent_seconds}"
    )

    modules = session.modules_used.get("modules", []) if session.modules_used else []

    return StudySessionResponse(
        id=session.id,
        session_type=session.session_type,
        modules_used=modules,
        items_completed=session.items_completed,
        items_correct=session.items_correct,
        accuracy=session.accuracy,
        time_spent_seconds=session.time_spent_seconds,
        started_at=session.started_at,
        ended_at=session.ended_at,
        is_completed=session.is_completed,
    )


@router.get("/sessions", response_model=List[StudySessionResponse])
async def list_sessions(
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's study sessions with pagination."""
    query = (
        select(StudySession)
        .where(StudySession.user_id == current_user.id)
        .order_by(StudySession.started_at.desc())
    )

    query = query.offset(pagination.offset).limit(pagination.page_size)
    result = await db.execute(query)
    sessions = result.scalars().all()

    return [
        StudySessionResponse(
            id=s.id,
            session_type=s.session_type,
            modules_used=s.modules_used.get("modules", []) if s.modules_used else [],
            items_completed=s.items_completed,
            items_correct=s.items_correct,
            accuracy=s.accuracy,
            time_spent_seconds=s.time_spent_seconds,
            started_at=s.started_at,
            ended_at=s.ended_at,
            is_completed=s.is_completed,
        )
        for s in sessions
    ]


@router.get("/recommendations", response_model=List[StudyItemResponse])
async def get_recommendations(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get AI-powered study recommendations.

    Recommends items based on weak areas, review patterns, and learning goals.
    Combines flashcards and quizzes, prioritizing high-value items.
    """
    try:
        # Get recommendations from both modules
        flashcards = await get_due_flashcards(current_user.id, limit, db)
        quizzes = await get_due_quizzes(current_user.id, limit, db)

        # Combine and prioritize
        recommendations = flashcards + quizzes

        # Sort by priority (high first)
        priority_map = {"high": 0, "new": 1, "normal": 2}
        recommendations.sort(key=lambda x: priority_map.get(x["data"].get("priority"), 2))

        logger.info(
            f"study_recommendations_retrieved user_id={current_user.id} total_items={len(recommendations)}"
        )

        return recommendations[:limit]

    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        return []


# ============================================================================
# Sprint 2 — Session Persistence (queue snapshot, checkpoint, resume)
# ============================================================================

from app.services.flashcards.session_service import SessionService  # noqa: E402


class CreateSessionV2Request(BaseModel):
    """Extended session creation with queue curation."""
    deck_id: Optional[int] = None
    session_mode: str = Field("classic", pattern="^(classic|socratic)$")
    budget: int = Field(25, ge=5, le=100, description="Max cards in this session")


class CheckpointRequest(BaseModel):
    """Checkpoint payload sent after every card review."""
    current_card_index: int = Field(..., ge=0)
    card_review: Optional[dict] = Field(
        None,
        description="{card_id, quality, duration_ms, hint_used}"
    )


@router.post(
    "/sessions/curated",
    status_code=status.HTTP_201_CREATED,
    tags=["Study Sessions"],
    summary="Create a curated session with a queue snapshot",
)
async def create_curated_session(
    body: CreateSessionV2Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a study session with a budgeted, prioritised card queue.

    The queue is snapshotted at creation — resuming always returns the
    same card set the student started with, even if new cards become due.

    Returns the session with a `queue` array containing the full card data.
    """
    service = SessionService(db)
    try:
        return await service.create_session(
            user_id=current_user.id,
            deck_id=body.deck_id,
            session_mode=body.session_mode,
            budget=body.budget,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )


@router.patch(
    "/sessions/{session_id}/checkpoint",
    tags=["Study Sessions"],
    summary="Save current position in an active session",
)
async def checkpoint_session(
    session_id: int,
    body: CheckpointRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Persist the current card index and optional per-card review detail.

    Called after every card is reviewed so the session can be resumed
    at the exact card the student left off on. Lightweight — just an
    index update + JSON append.
    """
    service = SessionService(db)
    try:
        return await service.save_checkpoint(
            session_id=session_id,
            user_id=current_user.id,
            current_card_index=body.current_card_index,
            card_review=body.card_review,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post(
    "/sessions/{session_id}/complete-v2",
    tags=["Study Sessions"],
    summary="Complete a session (v2 — uses resume_status)",
)
async def complete_session_v2(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark a session as completed.

    Uses resume_status field (not the v1 is_completed approach) so the
    active-sessions endpoint correctly excludes this session from the
    resume prompt.
    """
    service = SessionService(db)
    try:
        return await service.complete_session(session_id, current_user.id)
    except ValueError as exc:
        code = (
            status.HTTP_400_BAD_REQUEST
            if "already completed" in str(exc)
            else status.HTTP_404_NOT_FOUND
        )
        raise HTTPException(status_code=code, detail=str(exc))


@router.post(
    "/sessions/{session_id}/abandon",
    tags=["Study Sessions"],
    summary="Abandon a session (user quit mid-session)",
)
async def abandon_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark a session as abandoned.

    Abandoned sessions surface in 'Not Completed' on the dashboard.
    They remain resumable — the student can pick up where they left off.
    """
    service = SessionService(db)
    try:
        return await service.abandon_session(session_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get(
    "/sessions/active",
    tags=["Study Sessions"],
    summary="Get resumable sessions for the current user",
)
async def get_active_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Return sessions that are resumable (in_progress or recently abandoned).

    The frontend uses this to surface "Continue where you left off?" prompts.

    Returns up to 5 sessions ordered by last_activity_at DESC.
    Enriched with deck_name and progress percentage.
    """
    service = SessionService(db)
    sessions = await service.get_active_sessions(current_user.id)

    # Enrich with progress pct so the frontend can show a progress bar
    for s in sessions:
        planned = len(s.get("cards_planned") or [])
        reviewed = s.get("current_card_index") or 0
        s["progress_pct"] = round(reviewed / planned * 100, 1) if planned else 0.0

    return sessions
