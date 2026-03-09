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

from app.api.deps import get_db, get_current_user, PaginationParams
from app.models.user import User
from app.models.quiz import Quiz, QuizSourceType, QuizDifficulty
from app.models.quiz_question import QuizQuestion, QuestionType
from app.models.quiz_attempt import QuizAttempt
from app.models.activity_log import ActivityLog, ActivityType
from app.core.config import settings
from app.core.ai.embeddings.boundary import (
    embed_text_sync,
    EmbeddingStatus,
    EMBEDDING_VERSION,
)

router = APIRouter()

# Schemas — single source of truth: app/schemas/quiz.py
from app.schemas.quiz import (
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


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/due-questions", response_model=DueQuestionsResponse)
async def get_due_questions(
    quiz_id: Optional[int] = Query(None, description="Filter to specific quiz"),
    limit: int = Query(20, ge=1, le=50, description="Max questions to return"),
    bias_by_weakness: bool = Query(
        False, description="Phase Q2.5: Reorder by proximity to weak areas"
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get questions due for SM-2 review (Phase Q1).

    Returns questions that are scheduled for review based on spaced repetition.
    Can be filtered to a specific quiz or return due questions across all quizzes.

    Phase Q2.5: When bias_by_weakness=true, reorders questions by semantic
    proximity to user's weak areas. INVARIANT: Only reorders, never expands the set.
    """
    from sqlalchemy import or_
    from app.models.question_learning_state import QuestionLearningState
    from app.models.quiz import Quiz
    import structlog

    logger = structlog.get_logger(__name__)
    now = datetime.utcnow()

    # Build query for due questions
    query = (
        select(QuestionLearningState, QuizQuestion, Quiz)
        .join(QuizQuestion, QuizQuestion.id == QuestionLearningState.question_id)
        .join(Quiz, Quiz.id == QuizQuestion.quiz_id)
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

    # Build response list
    due_questions = []
    for state, question, quiz in rows:
        due_questions.append(
            {
                "state": state,
                "question": question,
                "quiz": quiz,
                "_weakness_proximity": 0.0,  # Will be set if bias_by_weakness
            }
        )

    # =====================================================================
    # Phase Q2.5: Priority Biasing (reorder only, never expand)
    # =====================================================================
    if bias_by_weakness and due_questions:
        try:
            from app.core.ai.rag.synapse_integration import get_synapse_bridge
            from app.core.ai.embeddings.boundary import embed_text_sync
            import numpy as np

            # Get weak areas from SynapseContextBridge
            bridge = await get_synapse_bridge(db)
            context = await bridge.get_user_context(current_user.id)
            weak_areas = context.get("weak_areas", [])

            if weak_areas:
                # Calculate weakness centroid by embedding weak area texts
                weak_embeddings = []
                for area in weak_areas[:5]:  # Limit to top 5 weak areas
                    if isinstance(area, dict):
                        area_text = area.get("topic", "") or area.get("name", "")
                    else:
                        area_text = str(area)

                    if area_text:
                        emb, status = embed_text_sync(area_text)
                        if emb:
                            weak_embeddings.append(emb)

                if weak_embeddings:
                    # Calculate centroid of weak areas
                    weak_centroid = np.mean(weak_embeddings, axis=0)
                    weak_centroid = weak_centroid / np.linalg.norm(weak_centroid)  # Normalize

                    # Score each due question by proximity to weakness
                    for item in due_questions:
                        question = item["question"]
                        if question.prompt_embedding:
                            q_emb = np.array(question.prompt_embedding)
                            q_emb = q_emb / np.linalg.norm(q_emb)  # Normalize
                            # Cosine similarity
                            similarity = float(np.dot(q_emb, weak_centroid))
                            item["_weakness_proximity"] = similarity

                    # Reorder by weakness proximity (higher = more relevant to weak areas)
                    due_questions.sort(key=lambda x: x["_weakness_proximity"], reverse=True)

                    logger.debug(
                        "due_questions_biased_by_weakness",
                        user_id=current_user.id,
                        weak_areas_count=len(weak_areas),
                        questions_count=len(due_questions),
                    )
        except Exception as e:
            # Bias is advisory - don't fail the request
            logger.warning("weakness_biasing_failed", error=str(e))

    # Convert to response format
    response_questions = []
    for item in due_questions:
        state = item["state"]
        question = item["question"]
        quiz = item["quiz"]
        response_questions.append(
            DueQuestionResponse(
                question_id=question.id,
                question_text=question.question_text,
                question_type=question.question_type,
                options=question.options,
                quiz_id=quiz.id,
                quiz_title=quiz.title,
                interval_days=state.interval,
                ease_factor=float(state.ease_factor),
                repetitions=state.repetitions,
                last_reviewed_at=state.last_reviewed_at,
                learning_state=state.learning_state.value,
            )
        )

    # Get total count of due questions
    count_query = select(func.count(QuestionLearningState.id)).where(
        QuestionLearningState.user_id == current_user.id,
        or_(
            QuestionLearningState.next_review <= now,
            QuestionLearningState.next_review.is_(None),
        ),
    )
    if quiz_id:
        count_query = count_query.join(
            QuizQuestion, QuizQuestion.id == QuestionLearningState.question_id
        ).where(QuizQuestion.quiz_id == quiz_id)

    total_result = await db.execute(count_query)
    total_due = total_result.scalar() or 0

    return DueQuestionsResponse(questions=response_questions, total_due=total_due)


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

    # Create questions with inline embedding (Phase Q2.1)
    # INVARIANT: Embeddings define SEMANTIC NEIGHBORHOODS, not authority or scheduling
    for idx, q_data in enumerate(quiz_data.questions):
        # Embed question text for semantic routing
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
            # Embedding fields
            prompt_embedding=embedding,
            embedding_model=EMBEDDING_VERSION if embedding else None,
            embedding_status=embed_status.value,
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

        # Create questions with inline embedding (Phase Q2.1)
        questions_created = 0
        for idx, q_data in enumerate(quiz_data["questions"]):
            question_text = q_data.get("question", "")

            # Embed question text for semantic routing
            embedding, embed_status = embed_text_sync(question_text)

            question = QuizQuestion(
                quiz_id=new_quiz.id,
                question_text=question_text,
                question_type=QuestionType.MULTIPLE_CHOICE,
                options=q_data.get("options", {}),
                correct_answer=q_data.get("correct_answer", "A"),
                explanation=q_data.get("explanation"),
                points=1,
                order=idx,
                # Embedding fields
                prompt_embedding=embedding,
                embedding_model=EMBEDDING_VERSION if embedding else None,
                embedding_status=embed_status.value,
            )
            db.add(question)
            questions_created += 1

        await db.commit()
        await db.refresh(new_quiz)

        # --- Auto-wire the knowledge graph ---
        # Document → Quiz (DERIVED): the quiz was generated from this document.
        if request_data.document_id:
            try:
                from app.services.graph_linker import GraphLinker
                from app.models.link import LinkEntityType as LET, LinkType as LT

                linker = GraphLinker(db)
                await linker.on_entity_created(
                    user_id=current_user.id,
                    entity_type=LET.QUIZ,
                    entity_id=new_quiz.id,
                    source_refs=[(LET.DOCUMENT, request_data.document_id)],
                    link_type=LT.DERIVED,
                    label="generated from",
                    metadata={
                        "method": "ai",
                        "topic": request_data.topic,
                        "questions_generated": questions_created,
                    },
                )
            except Exception as link_err:
                # Link creation is advisory — don't fail the generation
                import structlog as _sl

                _sl.get_logger(__name__).warning(
                    "graph_linker_failed", error=str(link_err), quiz_id=new_quiz.id
                )

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
    pagination: PaginationParams = Depends(),
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
        .offset(pagination.offset)
        .limit(pagination.page_size)
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

    # ========== Phase Q1: Per-Question Learning Events ==========
    # Log QUIZ_QUESTION_ATTEMPT per question and update SM-2 state
    from app.services.quiz_quality import map_quality_score, clamp_duration, normalize_accuracy
    from app.services.question_sm2_service import update_question_learning_state
    from app.models.activity_log import ModuleType
    import structlog

    logger = structlog.get_logger(__name__)

    # Build a map of question_id -> duration_ms from the original submission
    answer_durations = {a.question_id: a.duration_ms for a in answers}

    for db_answer in db_answers:
        question_id = db_answer["question_id"]
        is_correct = db_answer["is_correct"]

        # Get duration for this question (default to 30s if not provided)
        duration_ms = answer_durations.get(question_id) or 30000
        duration_seconds = duration_ms // 1000
        clamped_duration, was_clamped = clamp_duration(duration_seconds)

        # Map to SM-2 quality score
        quality = map_quality_score(is_correct, clamped_duration)
        accuracy = normalize_accuracy(quality)

        # Log per-question learning event
        question_event = ActivityLog(
            user_id=current_user.id,
            activity_type=ActivityType.QUIZ_QUESTION_ATTEMPT,
            resource_id=question_id,
            module=ModuleType.QUIZZES,
            duration_seconds=clamped_duration,
            quality_score=quality,
            accuracy=accuracy,
            is_learning_event=True,
            meta_data={
                "quiz_id": attempt.quiz_id,
                "attempt_id": attempt.id,
                "is_correct": is_correct,
                "raw_duration_ms": duration_ms,
                "was_clamped": was_clamped,
            },
        )
        db.add(question_event)

        # Update question learning state (SM-2)
        await update_question_learning_state(db, current_user.id, question_id, quality)

        logger.debug(
            "quiz_question_attempt_logged",
            user_id=current_user.id,
            question_id=question_id,
            quality=quality,
            is_correct=is_correct,
        )

    # ========== Quiz Summary Event (presentation only, not scheduling) ==========
    if getattr(settings, "ENABLE_LEARNING_LEDGER", True):
        correct_count = sum(1 for a in db_answers if a["is_correct"])
        quiz_accuracy = correct_count / len(db_answers) if db_answers else 0.0

        # Apply duration guardrail (same as flashcards: max 1 hour)
        max_duration = getattr(settings, "MAX_REVIEW_DURATION_SECONDS", 3600)
        clamped_quiz_duration = min(attempt.time_taken_seconds or 0, max_duration)

        activity_log = ActivityLog(
            user_id=current_user.id,
            activity_type=ActivityType.QUIZ_COMPLETE,
            resource_id=attempt.quiz_id,
            module=ModuleType.QUIZZES,
            duration_seconds=clamped_quiz_duration,
            accuracy=quiz_accuracy,
            is_learning_event=False,  # Summary only, questions are the learning events
            meta_data={
                "attempt_id": attempt.id,
                "score": float(attempt.score),
                "max_score": attempt.max_score,
                "correct_count": correct_count,
                "total_questions": len(db_answers),
                "time_taken": attempt.time_taken_seconds,
                "description": f"Completed quiz: {float(attempt.percentage):.0f}% ({correct_count}/{len(db_answers)})",
            },
        )
        db.add(activity_log)

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


# ============================================================================
# Phase Q3: Cross-Module Surfacing (Advisory Only)
# ============================================================================


@router.get(
    "/questions/{question_id}/related-flashcards",
    response_model=RelatedFlashcardsResponse,
    summary="Get related flashcards (Phase Q3.1)",
)
async def get_related_flashcards(
    question_id: int,
    limit: int = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Surface flashcards semantically close to a quiz question.

    Phase Q3.1: Connect applied recall (quiz) to isolated recall (flashcard)
    without coupling. Call this after a user struggles with a question.

    INVARIANT: Advisory only. Nothing is scheduled or reset.
    """
    from app.services.semantic_neighbor_service import SemanticNeighborService
    from app.services.evidence_overlay_service import EvidenceOverlayService

    # Get semantic neighbors (flashcards only)
    neighbors = await SemanticNeighborService.get_neighbors_for_question(
        db, question_id, current_user.id, entity_types=["flashcard"], limit=limit
    )

    if not neighbors:
        return RelatedFlashcardsResponse(
            flashcards=[], advisory_message="No related flashcards found"
        )

    # Enrich with learning evidence
    enriched = await EvidenceOverlayService.enrich_with_evidence(db, current_user.id, neighbors)

    # Convert to response
    flashcards = []
    for e in enriched:
        flashcards.append(
            RelatedFlashcardResponse(
                id=e.id,
                front_text=e.content_preview,
                similarity=round(e.similarity, 3),
                evidence_strength=e.evidence_strength,
                last_quality=e.last_quality,
                days_since_review=e.days_since_review,
            )
        )

    return RelatedFlashcardsResponse(
        flashcards=flashcards, advisory_message="Related recall cards in this semantic area"
    )


@router.get(
    "/learning/context-for-weakness",
    response_model=ContextForWeaknessResponse,
    summary="Get context notes for weak areas (Phase Q3.2)",
)
async def get_context_for_weakness(
    lookback_days: int = Query(7, ge=1, le=30),
    limit: int = Query(3, ge=1, le=10),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Surface notes related to recent low-quality quiz attempts.

    Phase Q3.2: Notes inform but never decay. Surface as optional reference
    material near areas where the user has shown difficulty.

    INVARIANT: Notes NEVER enter SM-2. Only advisory.
    """
    from sqlalchemy import text
    from app.services.semantic_neighbor_service import SemanticNeighborService
    import numpy as np

    # Get recent failures (low quality scores)
    failures_result = await db.execute(
        text(
            """
        SELECT qq.prompt_embedding
        FROM activity_logs al
        JOIN quiz_questions qq ON qq.id = al.resource_id
        WHERE al.user_id = :user_id
          AND al.activity_type = 'quiz_question_attempt'
          AND al.quality_score < 3
          AND al.created_at > NOW() - INTERVAL ':days days'
          AND qq.prompt_embedding IS NOT NULL
          AND al.is_learning_event = true
        ORDER BY al.created_at DESC
        LIMIT 10
    """.replace(":days", str(lookback_days))
        ),
        {"user_id": current_user.id},
    )

    embeddings = []
    for row in failures_result:
        if row.prompt_embedding:
            embeddings.append(row.prompt_embedding)

    if not embeddings:
        return ContextForWeaknessResponse(
            notes=[], advisory_message="No recent difficulty patterns detected"
        )

    # Calculate weakness centroid
    weak_centroid = np.mean(embeddings, axis=0)
    weak_centroid = (weak_centroid / np.linalg.norm(weak_centroid)).tolist()

    # Find notes near the weakness centroid
    neighbors = await SemanticNeighborService.get_neighbors_for_embedding(
        db, weak_centroid, current_user.id, entity_types=["note"], limit=limit
    )

    if not neighbors:
        return ContextForWeaknessResponse(notes=[], advisory_message="No relevant notes found")

    # Convert to response
    notes = []
    for n in neighbors:
        notes.append(
            ContextNoteResponse(
                id=n.id,
                title=n.content_preview,
                similarity=round(n.similarity, 3),
            )
        )

    return ContextForWeaknessResponse(
        notes=notes, advisory_message="Reference material near recent difficulty areas"
    )
