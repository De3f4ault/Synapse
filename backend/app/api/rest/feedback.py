"""
Feedback API Router.

Accepts interaction signals from the frontend (Client Feedback).
These signals drive the Intelligence Adaptation loop.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
import structlog

from app.schemas.search_feedback import FeedbackEvent
from app.schemas.intelligence import QualifiedSignal
from app.services.feedback.processor import get_feedback_processor, FeedbackProcessor
from app.api.deps import get_current_user, get_db
from app.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()
logger = structlog.get_logger(__name__)


@router.post("/", response_model=List[QualifiedSignal])
async def submit_feedback(
    event: FeedbackEvent,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    processor: FeedbackProcessor = Depends(get_feedback_processor),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a feedback event (e.g., answer accepted, result clicked).

    This endpoint:
    1. Validates the event
    2. Processes it via the Feedback Processor (Normalize -> Gate -> Promote)
    3. Persists qualified signals via TelemetryService
    4. Returns any immediately qualified signals (for debugging/ui confidence)

    Note: In high-scale production, this would just push to a queue.
    For now, we process synchronously or in background tasks.
    """
    if event.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="User ID mismatch")

    logger.info("feedback_received", event_id=event.event_id, type=event.event_type)

    # We process synchronously for now to return immediate qualification status
    # This helps the UI know if trust was gained.
    try:
        qualified_signals = await processor.process_event(event, db)
        return qualified_signals
    except Exception as e:
        logger.error("feedback_processing_failed", error=str(e), event_id=event.event_id)
        raise HTTPException(status_code=500, detail="Failed to process feedback")
