"""
Dashboard Context Builder

Aggregates comprehensive user data from all modules to provide
the Dashboard Agent with complete system knowledge.

This gives the agent a "god's eye view" of the user's learning state.
"""

from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta
import structlog

logger = structlog.get_logger(__name__)


async def build_dashboard_context(
    user_id: int,
    db: AsyncSession
) -> Dict[str, Any]:
    """
    Build comprehensive context for dashboard orchestrator
    
    Aggregates data from ALL modules:
    - Flashcards: counts, due cards, mastery levels
    - Notes: counts, recent activity
    - Documents: counts, topics
    - Quizzes: performance metrics
    - Study sessions: streaks, patterns
    
    Args:
        user_id: User ID
        db: Database session
        
    Returns:
        Rich context dictionary with complete user state
    """
    logger.info("building_dashboard_context", user_id=user_id)
    
    # Define 'now' once for all sections to use
    now = datetime.utcnow()
    
    context = {
        "user_stats": {},
        "weak_areas": [],
        "recent_activity": [],
        "knowledge_graph": {"topics": [], "connections": []},
        "study_recommendations": []
    }
    
    try:
        # ====================================================================
        # FLASHCARD STATISTICS
        # ====================================================================
        from app.models.flashcard import Flashcard
        from app.models.deck import Deck
        from sqlalchemy import select, func
        
        # Total flashcards (join with decks to get user_id)
        card_count_query = select(func.count(Flashcard.id)).join(
            Deck, Flashcard.deck_id == Deck.id
        ).where(
            Deck.user_id == user_id,
            Flashcard.deleted_at.is_(None)
        )
        total_flashcards = await db.scalar(card_count_query) or 0
        
        # Due cards
        due_cards_query = select(Flashcard).join(
            Deck, Flashcard.deck_id == Deck.id
        ).where(
            Deck.user_id == user_id,
            Flashcard.next_review <= now,
            Flashcard.deleted_at.is_(None)
        )
        due_cards_result = await db.execute(due_cards_query)
        due_cards = due_cards_result.scalars().all()
        
        context["user_stats"]["total_flashcards"] = total_flashcards
        context["user_stats"]["due_cards_count"] = len(due_cards)
        context["user_stats"]["due_cards"] = [
            {
                "id": card.id,
                "front_text": card.front_text[:50],
                "deck_id": card.deck_id,
                "ease_factor": float(card.ease_factor)
            }
            for card in due_cards[:20]  # Top 20
        ]
        
        logger.debug(
            "flashcard_stats_collected",
            total=total_flashcards,
            due=len(due_cards)
        )
        
    except Exception as e:
        logger.error("flashcard_stats_failed", error=str(e))
    
    try:
        # ====================================================================
        # NOTE STATISTICS
        # ====================================================================
        from app.models.note import Note
        from sqlalchemy import select, func
        
        # Total notes
        note_count_query = select(func.count(Note.id)).where(
            Note.user_id == user_id,
            Note.deleted_at.is_(None)
        )
        total_notes = await db.scalar(note_count_query) or 0
        
        # Recent notes (last 7 days)
        week_ago = now - timedelta(days=7)
        recent_notes_query = select(Note).where(
            Note.user_id == user_id,
            Note.updated_at >= week_ago,
            Note.deleted_at.is_(None)
        ).order_by(Note.updated_at.desc()).limit(10)
        recent_notes_result = await db.execute(recent_notes_query)
        recent_notes = recent_notes_result.scalars().all()
        
        context["user_stats"]["total_notes"] = total_notes
        context["recent_activity"].extend([
            {
                "type": "note",
                "id": note.id,
                "title": note.title,
                "updated_at": note.updated_at.isoformat()
            }
            for note in recent_notes
        ])
        
        logger.debug("note_stats_collected", total=total_notes)
        
    except Exception as e:
        logger.error("note_stats_failed", error=str(e))
    
    try:
        # ====================================================================
        # DOCUMENT STATISTICS
        # ====================================================================
        from app.models.document import Document
        from sqlalchemy import select, func
        
        doc_count_query = select(func.count(Document.id)).where(
            Document.user_id == user_id,
            Document.deleted_at.is_(None)
        )
        total_documents = await db.scalar(doc_count_query) or 0
        
        context["user_stats"]["total_documents"] = total_documents
        
        logger.debug("document_stats_collected", total=total_documents)
        
    except Exception as e:
        logger.error("document_stats_failed", error=str(e))
    
    try:
        # ====================================================================
        # QUIZ PERFORMANCE
        # ====================================================================
        # QuizAttempt model doesn't exist yet - skip for now
        context["user_stats"]["quizzes_completed"] = 0
        context["user_stats"]["average_quiz_accuracy"] = 0
        logger.debug("quiz_stats_skipped", reason="QuizAttempt model not implemented")
        
        # TODO: Implement when QuizAttempt model is added
        # from app.models.quiz import QuizAttempt

        
    except Exception as e:
        logger.error("quiz_stats_failed", error=str(e))
    
    try:
        # ====================================================================
        # STUDY STREAK
        # ====================================================================
        # ReviewHistory model doesn't exist - set default
        context["user_stats"]["study_streak_days"] = 0
        logger.debug("study_streak_skipped", reason="ReviewHistory model not implemented")
        
        # TODO: Implement when ReviewHistory model is added
        # from app.models.flashcard import ReviewHistory

        
    except Exception as e:
        logger.error("study_streak_failed", error=str(e))
        context["user_stats"]["study_streak_days"] = 0
    
    try:
        # ====================================================================
        # TOTAL STUDY TIME
        # ====================================================================
        # ReviewHistory model doesn't exist - set default
        context["user_stats"]["total_study_time_minutes"] = 0
        logger.debug("study_time_skipped", reason="ReviewHistory model not implemented")
        
    except Exception as e:
        logger.error("study_time_failed", error=str(e))
        context["user_stats"]["total_study_time_minutes"] = 0
    
    try:
        # ====================================================================
        # KNOWLEDGE GRAPH (Topics the user is learning)
        # ====================================================================
        from app.models.deck import Deck
        from sqlalchemy import select
        
        # Get all deck names as topics
        decks_query = select(Deck.name).where(
            Deck.user_id == user_id,
            Deck.deleted_at.is_(None)
        ).distinct()
        decks_result = await db.execute(decks_query)
        deck_names = [row[0] for row in decks_result]
        
        # Get topics from quiz titles
        from app.models.quiz import Quiz
        quizzes_query = select(Quiz.title).where(
            Quiz.user_id == user_id,
            Quiz.deleted_at.is_(None)
        ).distinct().limit(20)
        quizzes_result = await db.execute(quizzes_query)
        quiz_titles = [row[0] for row in quizzes_result]
        
        # Combine unique topics
        all_topics = list(set(deck_names + quiz_titles))
        context["knowledge_graph"]["topics"] = all_topics[:20]  # Top 20
        
        logger.debug("knowledge_graph_built", topics=len(all_topics))
        
    except Exception as e:
        logger.error("knowledge_graph_failed", error=str(e))
    
    # ====================================================================
    # STUDY RECOMMENDATIONS
    # ====================================================================
    recommendations = []
    
    # Recommend reviewing due cards
    if context["user_stats"].get("due_cards_count", 0) > 0:
        recommendations.append({
            "type": "review_flashcards",
            "priority": "high",
            "message": f"Review {context['user_stats']['due_cards_count']} due flashcards"
        })
    
    # Recommend practicing weak areas
    if context["weak_areas"]:
        weakest = context["weak_areas"][0]
        recommendations.append({
            "type": "practice_weak_area",
            "priority": "high",
            "message": f"Practice {weakest['topic']} (current: {weakest['accuracy']:.1%})"
        })
    
    # Encourage streak
    if context["user_stats"].get("study_streak_days", 0) > 0:
        recommendations.append({
            "type": "maintain_streak",
            "priority": "medium",
            "message": f"Keep your {context['user_stats']['study_streak_days']}-day streak alive!"
        })
    
    context["study_recommendations"] = recommendations
    
    # Add context summary for easy consumption
    context["context_summary"] = _build_context_summary(context)
    
    logger.info(
        "dashboard_context_built",
        user_id=user_id,
        flashcards=context["user_stats"].get("total_flashcards", 0),
        notes=context["user_stats"].get("total_notes", 0),
        weak_areas=len(context["weak_areas"])
    )
    
    return context


def _build_context_summary(context: Dict[str, Any]) -> str:
    """Build human-readable context summary"""
    stats = context.get("user_stats", {})
    weak_areas = context.get("weak_areas", [])
    
    summary = f"""
    Total Flashcards: {stats.get('total_flashcards', 0)}
    Due for Review: {stats.get('due_cards_count', 0)}
    Total Notes: {stats.get('total_notes', 0)}
    Study Streak: {stats.get('study_streak_days', 0)} days
    """.strip()
    
    if weak_areas:
        summary += f"\nWeak Areas: {', '.join(w['topic'] for w in weak_areas[:3])}"
    
    return summary
