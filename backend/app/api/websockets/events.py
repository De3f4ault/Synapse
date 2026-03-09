"""
Dashboard event broadcasting utilities.

Helper functions to broadcast events to dashboard WebSocket connections.
Call these from your service layer when events occur.

UPDATED: Now routes through channel manager for proper channel-based broadcasting.

Usage example in FlashcardService:
    from app.api.websockets.events import broadcast_card_reviewed

    async def review_card(self, card_id, user_id, quality):
        # ... review logic ...
        await broadcast_card_reviewed(user_id, card_id, quality)
"""

from typing import Any, Dict
from .core.channels import channel_manager
import structlog

logger = structlog.get_logger()


async def broadcast_to_dashboard(user_id: int, event_data: Dict[str, Any]):
    """
    Broadcast an event to user's dashboard WebSocket connections.

    Args:
        user_id: User ID to broadcast to
        event_data: Event data dictionary (must include 'type' field)
    """
    try:
        event_type = event_data.get("type")
        event_payload = event_data.get("data", {})

        await channel_manager.broadcast_to_user_channel(
            user_id=user_id,
            channel="dashboard",
            event=event_type,
            data=event_payload
        )

        logger.debug(
            "dashboard_event_broadcast",
            user_id=user_id,
            event_type=event_type
        )
    except Exception as e:
        logger.error(
            "dashboard_broadcast_failed",
            user_id=user_id,
            error=str(e)
        )


# ==================== EVENT HELPERS ====================
# These are convenient functions you can call from your services

async def broadcast_card_reviewed(
    user_id: int,
    card_id: int,
    quality: int,
    next_review: str = None
):
    """Broadcast card review event to dashboard."""
    await channel_manager.broadcast_to_user_channel(
        user_id=user_id,
        channel="dashboard",
        event="card_reviewed",
        data={
            "card_id": card_id,
            "quality": quality,
            "next_review": next_review,
        }
    )


async def broadcast_note_created(user_id: int, note_id: int, title: str):
    """Broadcast note creation event to dashboard."""
    await channel_manager.broadcast_to_user_channel(
        user_id=user_id,
        channel="dashboard",
        event="note_created",
        data={
            "note_id": note_id,
            "title": title,
        }
    )


async def broadcast_note_updated(user_id: int, note_id: int, title: str):
    """Broadcast note update event to dashboard."""
    await channel_manager.broadcast_to_user_channel(
        user_id=user_id,
        channel="dashboard",
        event="note_updated",
        data={
            "note_id": note_id,
            "title": title,
        }
    )


async def broadcast_document_uploaded(
    user_id: int,
    document_id: int,
    filename: str,
    status: str
):
    """Broadcast document upload event to dashboard."""
    await channel_manager.broadcast_to_user_channel(
        user_id=user_id,
        channel="dashboard",
        event="document_uploaded",
        data={
            "document_id": document_id,
            "filename": filename,
            "status": status,
        }
    )


async def broadcast_quiz_completed(
    user_id: int,
    quiz_id: int,
    score: float,
    passed: bool
):
    """Broadcast quiz completion event to dashboard."""
    await channel_manager.broadcast_to_user_channel(
        user_id=user_id,
        channel="dashboard",
        event="quiz_completed",
        data={
            "quiz_id": quiz_id,
            "score": score,
            "passed": passed,
        }
    )


async def broadcast_chat_message(
    user_id: int,
    session_id: int,
    message_preview: str
):
    """Broadcast new chat message to dashboard."""
    await channel_manager.broadcast_to_user_channel(
        user_id=user_id,
        channel="dashboard",
        event="chat_message",
        data={
            "session_id": session_id,
            "preview": message_preview,
        }
    )


# ==================== USAGE EXAMPLE ====================
"""
Example: Integrate into FlashcardService.review_card()

In backend/app/modules/flashcards/service.py:

    from app.api.websockets.events import broadcast_card_reviewed

    async def review_card(self, card_id: int, user_id: int, quality: int) -> Dict:
        # ... existing review logic ...
        review_result = await self.repository.record_review(card_id, quality)
        await self.session.commit()

        #  Broadcast to dashboard
        await broadcast_card_reviewed(
            user_id=user_id,
            card_id=card_id,
            quality=quality,
            next_review=review_result["next_review_date"].isoformat()
        )

        return review_result
"""
