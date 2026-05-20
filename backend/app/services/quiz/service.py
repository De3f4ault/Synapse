"""
Quiz service — business logic extracted from rest/quizzes.py.

Handles:
- AI quiz generation (prompt building, JSON parsing, DB persistence)
- Quiz attempt grading (answer checking, SM-2 updates, ActivityLog events)
- Attempt state rehydration (resume)
- Insights generation
"""

import json
import re
from decimal import Decimal
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import structlog

from app.models.quiz import Quiz, QuizSourceType, QuizDifficulty
from app.models.quiz_question import QuizQuestion, QuestionType
from app.models.quiz_attempt import QuizAttempt
from app.models.activity_log import ActivityLog, ActivityType
from app.core.config import settings
from app.core.ai.embeddings.boundary import embed_text_sync, EMBEDDING_VERSION

logger = structlog.get_logger(__name__)


# ============================================================================
# Quiz Generation
# ============================================================================


async def generate_quiz_from_ai(
    user_id: int,
    topic: str,
    num_questions: int,
    difficulty: QuizDifficulty,
    document_id: Optional[int],
    db: AsyncSession,
) -> dict:
    """
    Generate a quiz using AI. Returns dict with quiz_id, title, etc.

    Steps:
    1. Build prompt with topic and difficulty
    2. Call orchestrator for AI generation
    3. Parse JSON response
    4. Create quiz + questions in DB with embeddings
    5. Wire knowledge graph if document_id given
    """
    from app.core.ai.orchestrator import get_orchestrator

    difficulty_desc = {
        QuizDifficulty.EASY: "simple, beginner-level",
        QuizDifficulty.MEDIUM: "intermediate, moderate difficulty",
        QuizDifficulty.HARD: "challenging, advanced",
    }

    prompt = f"""Generate a quiz about: {topic}

Requirements:
- Generate exactly {num_questions} multiple-choice questions
- Difficulty: {difficulty_desc.get(difficulty, "intermediate")}
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

    orchestrator = get_orchestrator()
    result = await orchestrator.handle_message(
        message=prompt,
        user_id=user_id,
        session_id=0,
        context={"document_id": document_id},
        chat_history=[],
    )

    if not result.success:
        raise ValueError(f"AI generation failed: {result.output}")

    # Parse JSON from response
    quiz_data = _extract_json(result.output)
    if not quiz_data.get("questions"):
        raise ValueError("No questions in response")

    # Create quiz
    new_quiz = Quiz(
        user_id=user_id,
        title=quiz_data.get("title", f"Quiz: {topic}"),
        description=quiz_data.get("description", f"AI-generated quiz about {topic}"),
        source_type=QuizSourceType.AI_GENERATED,
        difficulty=difficulty,
        time_limit_minutes=max(5, num_questions * 2),
    )
    db.add(new_quiz)
    await db.flush()

    # Create questions with embeddings
    questions_created = 0
    for idx, q_data in enumerate(quiz_data["questions"]):
        question_text = q_data.get("question", "")
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
            prompt_embedding=embedding,
            embedding_model=EMBEDDING_VERSION if embedding else None,
            embedding_status=embed_status.value,
        )
        db.add(question)
        questions_created += 1

    await db.commit()
    await db.refresh(new_quiz)

    # Wire knowledge graph
    if document_id:
        await _wire_graph_link(db, user_id, new_quiz.id, document_id, topic, questions_created)
        await db.commit()

    logger.info(
        "quiz_generated",
        user_id=user_id,
        quiz_id=new_quiz.id,
        questions=questions_created,
        topic=topic,
    )

    return {
        "quiz_id": new_quiz.id,
        "title": new_quiz.title,
        "description": new_quiz.description,
        "difficulty": new_quiz.difficulty,
        "question_count": questions_created,
        "status": "success",
        "message": f"Successfully generated {questions_created} questions",
    }


# ============================================================================
# Quiz Grading
# ============================================================================


async def grade_and_submit(
    attempt_id: int,
    user_id: int,
    answers: List,
    db: AsyncSession,
) -> dict:
    """
    Grade quiz answers, update SM-2 state, log learning events.

    Returns dict with attempt_id, score, max_score, percentage, time_taken, answer_results.
    """
    from app.services.quiz.quality import map_quality_score, clamp_duration, normalize_accuracy
    from app.services.quiz.sm2 import update_question_learning_state
    from app.models.activity_log import ModuleType

    # Get attempt
    attempt = await _get_attempt(db, attempt_id, user_id)
    if attempt.completed_at:
        raise ValueError("Attempt already completed")

    # Get questions
    questions_result = await db.execute(
        select(QuizQuestion).where(QuizQuestion.quiz_id == attempt.quiz_id)
    )
    questions = {q.id: q for q in questions_result.scalars().all()}

    # Grade each answer
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

        db_answers.append({
            "question_id": question.id,
            "question_text": question.question_text,
            "your_answer": answer_submit.answer,
            "correct_answer": question.correct_answer,
            "is_correct": is_correct,
            "explanation": question.explanation,
            "points_earned": points_earned,
        })

        answer_results.append({
            "question_id": question.id,
            "question_text": question.question_text,
            "your_answer": answer_submit.answer,
            "correct_answer": question.correct_answer,
            "is_correct": is_correct,
            "explanation": question.explanation,
            "points_earned": points_earned,
        })

    # Update attempt
    now = datetime.now(timezone.utc)
    attempt.completed_at = now
    attempt.score = total_score
    started = attempt.started_at
    if started.tzinfo is None:
        completed = now.replace(tzinfo=None)
    else:
        completed = now
    attempt.time_taken_seconds = int((completed - started).total_seconds())
    attempt.answers = {"answers": db_answers}
    await db.commit()

    # Per-question learning events + SM-2 updates
    answer_durations = {a.question_id: a.duration_ms for a in answers}

    for db_answer in db_answers:
        question_id = db_answer["question_id"]
        is_correct = db_answer["is_correct"]
        duration_ms = answer_durations.get(question_id) or 30000
        duration_seconds = duration_ms // 1000
        clamped_duration, was_clamped = clamp_duration(duration_seconds)
        quality = map_quality_score(is_correct, clamped_duration)
        accuracy = normalize_accuracy(quality)

        db.add(ActivityLog(
            user_id=user_id,
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
        ))

        await update_question_learning_state(db, user_id, question_id, quality)

    # Quiz summary event
    if getattr(settings, "ENABLE_LEARNING_LEDGER", True):
        correct_count = sum(1 for a in db_answers if a["is_correct"])
        quiz_accuracy = correct_count / len(db_answers) if db_answers else 0.0
        max_duration = getattr(settings, "MAX_REVIEW_DURATION_SECONDS", 3600)
        clamped_quiz_duration = min(attempt.time_taken_seconds or 0, max_duration)

        db.add(ActivityLog(
            user_id=user_id,
            activity_type=ActivityType.QUIZ_COMPLETE,
            resource_id=attempt.quiz_id,
            module=ModuleType.QUIZZES,
            duration_seconds=clamped_quiz_duration,
            accuracy=quiz_accuracy,
            is_learning_event=False,
            meta_data={
                "attempt_id": attempt.id,
                "score": float(attempt.score),
                "max_score": attempt.max_score,
                "correct_count": correct_count,
                "total_questions": len(db_answers),
                "time_taken": attempt.time_taken_seconds,
            },
        ))

    await db.commit()

    # Wire knowledge graph — quiz practiced
    try:
        from app.services.graph.linker import GraphLinker
        from app.models.link import LinkEntityType as LET, LinkType as LT

        linker = GraphLinker(db)
        correct_count = sum(1 for a in db_answers if a["is_correct"])
        accuracy = correct_count / len(db_answers) if db_answers else 0.0

        # If quiz came from a document, reinforce that DERIVED link
        # strength=1.0, NOT accuracy — the act of practicing matters regardless of score.
        # Accuracy goes in metadata for the intelligence layer to interpret.
        # Using accuracy as strength would break the GREATEST upsert:
        # a 0% quiz score → strength=0.0 → never wins GREATEST comparison → silent no-op
        quiz_result = await db.execute(
            select(Quiz).where(Quiz.id == attempt.quiz_id)
        )
        quiz = quiz_result.scalar_one_or_none()
        if quiz and quiz.source_ids:
            doc_ids = quiz.source_ids.get("document_ids", [])
            if doc_ids:
                source_refs = [(LET.DOCUMENT, did) for did in doc_ids if isinstance(did, int)]
                if source_refs:
                    await linker.on_entity_created(
                        user_id=user_id,
                        entity_type=LET.QUIZ,
                        entity_id=quiz.id,
                        source_refs=source_refs,
                        link_type=LT.DERIVED,
                        strength=1.0,
                        label="practiced from",
                        metadata={
                            "attempt_id": attempt.id,
                            "accuracy": accuracy,
                            "correct_count": correct_count,
                            "total_questions": len(db_answers),
                        },
                    )
                    await db.commit()
    except Exception as e:
        import structlog
        structlog.get_logger(__name__).error(
            "graph_linker_failed_on_grade", error=str(e), exc_info=True,
            attempt_id=attempt_id, user_id=user_id,
        )

    return {
        "attempt_id": attempt.id,
        "score": attempt.score,
        "max_score": attempt.max_score,
        "percentage": float(attempt.percentage),
        "time_taken_seconds": attempt.time_taken_seconds,
        "answers": answer_results,
    }


# ============================================================================
# Insights
# ============================================================================


def generate_insights(attempt: QuizAttempt) -> dict:
    """Generate basic insights for a completed quiz attempt."""
    stored_answers = attempt.answers.get("answers", []) if attempt.answers else []
    incorrect = [a for a in stored_answers if not a.get("is_correct", False)]

    weak_areas = [f"Question: {a.get('question_text', '')[:50]}..." for a in incorrect[:3]]

    percentage = float(attempt.percentage) if attempt.percentage else 0
    if percentage >= 90:
        summary = "Excellent performance! You demonstrated strong mastery of the material."
    elif percentage >= 70:
        summary = "Good performance with some areas for improvement."
    elif percentage >= 50:
        summary = "Moderate performance. Review the incorrect answers to strengthen understanding."
    else:
        summary = "This topic needs more study. Consider reviewing the material before retrying."

    recommendations = []
    if incorrect:
        recommendations.append("Review the explanations for incorrect answers")
        recommendations.append("Create flashcards for topics you missed")
    if percentage < 80:
        recommendations.append("Consider retaking this quiz after review")

    return {
        "attempt_id": attempt.id,
        "summary": summary,
        "weak_areas": weak_areas,
        "recommendations": recommendations,
        "generated_at": datetime.utcnow(),
    }


# ============================================================================
# Internal Helpers
# ============================================================================


def _extract_json(text: str) -> dict:
    """Extract JSON from AI response, handling markdown code blocks."""
    json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if json_match:
        return json.loads(json_match.group(1))

    json_start = text.find("{")
    json_end = text.rfind("}") + 1
    if json_start >= 0 and json_end > json_start:
        return json.loads(text[json_start:json_end])

    raise ValueError("Could not extract JSON from response")


async def _get_attempt(db: AsyncSession, attempt_id: int, user_id: int) -> QuizAttempt:
    """Get attempt or raise ValueError."""
    result = await db.execute(
        select(QuizAttempt).where(
            and_(QuizAttempt.id == attempt_id, QuizAttempt.user_id == user_id)
        )
    )
    attempt = result.scalar_one_or_none()
    if not attempt:
        raise ValueError("Attempt not found")
    return attempt


async def _wire_graph_link(
    db: AsyncSession, user_id: int, quiz_id: int,
    document_id: int, topic: str, questions_created: int
):
    """Wire knowledge graph link: Document → Quiz (DERIVED)."""
    try:
        from app.services.graph.linker import GraphLinker
        from app.models.link import LinkEntityType as LET, LinkType as LT

        linker = GraphLinker(db)
        await linker.on_entity_created(
            user_id=user_id,
            entity_type=LET.QUIZ,
            entity_id=quiz_id,
            source_refs=[(LET.DOCUMENT, document_id)],
            link_type=LT.DERIVED,
            label="generated from",
            metadata={
                "method": "ai",
                "topic": topic,
                "questions_generated": questions_created,
            },
        )
    except Exception as e:
        logger.error(
            "graph_linker_failed",
            error=str(e),
            exc_info=True,
            quiz_id=quiz_id,
            document_id=document_id,
            user_id=user_id,
        )
