"""
Question SM-2 Service.

Handles SM-2 algorithm updates for quiz questions.
Mirrors flashcard SM-2 logic for unified learning semantics.
"""

from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.models.question_learning_state import QuestionLearningState
from app.models.flashcard import LearningState


# SM-2 Constants (same as flashcards)
MIN_EASE_FACTOR = Decimal("1.30")
DEFAULT_EASE_FACTOR = Decimal("2.50")


async def get_or_create_question_state(
    db: AsyncSession,
    user_id: int,
    question_id: int,
) -> QuestionLearningState:
    """
    Get existing question learning state or create a new one.

    Uses upsert pattern for efficiency.
    """
    result = await db.execute(
        select(QuestionLearningState).where(
            QuestionLearningState.user_id == user_id,
            QuestionLearningState.question_id == question_id,
        )
    )
    state = result.scalar_one_or_none()

    if state is None:
        state = QuestionLearningState(
            user_id=user_id,
            question_id=question_id,
            ease_factor=DEFAULT_EASE_FACTOR,
            interval=1,
            repetitions=0,
            learning_state=LearningState.NEW,
        )
        db.add(state)
        await db.flush()

    return state


async def update_question_learning_state(
    db: AsyncSession,
    user_id: int,
    question_id: int,
    quality: int,  # 0-5
) -> QuestionLearningState:
    """
    Apply SM-2 algorithm update to a question's learning state.

    This mirrors the flashcard SM-2 logic for unified semantics.

    SM-2 Algorithm (simplified):
    - quality >= 3: successful recall, increase interval
    - quality < 3: failed recall, reset to beginning
    - Ease factor adjusts based on quality

    Args:
        db: Database session
        user_id: User ID
        question_id: Question ID
        quality: Quality score 0-5

    Returns:
        Updated QuestionLearningState
    """
    state = await get_or_create_question_state(db, user_id, question_id)
    now = datetime.utcnow()

    # Update statistics
    state.times_reviewed += 1
    state.last_quality = quality
    state.last_reviewed_at = now

    if quality >= 3:
        # Successful recall
        state.times_correct += 1

        if state.repetitions == 0:
            state.interval = 1
        elif state.repetitions == 1:
            state.interval = 6
        else:
            # SM-2 formula: interval = old_interval * ease_factor
            new_interval = float(state.interval) * float(state.ease_factor)
            state.interval = max(1, round(new_interval))

        state.repetitions += 1

        # Update learning state
        if state.repetitions >= 3 and float(state.ease_factor) >= 2.5:
            state.learning_state = LearningState.MASTERED
        elif state.repetitions >= 1:
            state.learning_state = LearningState.REVIEW

    else:
        # Failed recall - reset
        state.repetitions = 0
        state.interval = 1
        state.learning_state = LearningState.LEARNING

    # Update ease factor (SM-2 formula)
    # EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    ef_delta = Decimal("0.1") - (5 - quality) * (Decimal("0.08") + (5 - quality) * Decimal("0.02"))
    new_ease = state.ease_factor + ef_delta
    state.ease_factor = max(
        MIN_EASE_FACTOR, new_ease.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    )

    # Calculate next review date
    state.next_review = now + timedelta(days=state.interval)
    state.updated_at = now

    await db.flush()

    return state


async def get_due_questions_for_user(
    db: AsyncSession,
    user_id: int,
    quiz_id: Optional[int] = None,
    limit: int = 20,
) -> list[QuestionLearningState]:
    """
    Get questions due for review.

    Args:
        db: Database session
        user_id: User ID
        quiz_id: Optional - filter to specific quiz
        limit: Max questions to return

    Returns:
        List of QuestionLearningState objects due for review
    """
    from sqlalchemy import or_
    from app.models.quiz_question import QuizQuestion

    now = datetime.utcnow()

    query = (
        select(QuestionLearningState)
        .where(
            QuestionLearningState.user_id == user_id,
            or_(
                QuestionLearningState.next_review <= now,
                QuestionLearningState.next_review.is_(None),
            ),
        )
        .order_by(QuestionLearningState.next_review.asc().nullsfirst())
        .limit(limit)
    )

    if quiz_id:
        query = query.join(
            QuizQuestion, QuizQuestion.id == QuestionLearningState.question_id
        ).where(QuizQuestion.quiz_id == quiz_id)

    result = await db.execute(query)
    return list(result.scalars().all())
