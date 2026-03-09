"""
Regenerate handler.

Re-generates an AI response for an existing assistant message,
preserving the original as an inactive sibling for version navigation.
"""

import structlog
from sqlalchemy import select, func

from app.api.websockets.core.channels import channel_manager
from app.api.websockets.core.streaming import stream_and_broadcast
from app.core.ai.registry.models import DEFAULT_CHAT_MODEL
from app.db.session import AsyncSessionLocal

logger = structlog.get_logger()


async def handle_regenerate(
    user_id: int,
    session_id: int,
    message_id: int,
    channel: str,
):
    """
    Regenerate an AI response via WebSocket streaming.

    Flow:
        1. Verify ownership; find target assistant message
        2. Find the preceding user prompt
        3. Build chat history up to that point
        4. Deactivate old message (preserved for version nav)
        5. Stream new response via orchestrator
        6. Save as versioned sibling
    """
    from app.core.ai.orchestrator import get_orchestrator
    from app.modules.chat.interface import ChatSession, ChatMessage, MessageRole

    orchestrator = get_orchestrator()

    # ── Prepare: verify, build context, deactivate old ───────────────────
    async with AsyncSessionLocal() as db:
        target = await db.get(ChatMessage, message_id)
        if not target:
            await channel_manager.broadcast_to_user_channel(
                user_id=user_id, channel=channel,
                event="error", data={"code": "not_found", "message": "Message not found"},
            )
            return

        session = await db.get(ChatSession, target.session_id)
        if not session or session.user_id != user_id:
            await channel_manager.broadcast_to_user_channel(
                user_id=user_id, channel=channel,
                event="error", data={"code": "forbidden", "message": "Access denied"},
            )
            return

        # Find the user prompt this was replying to
        result = await db.execute(
            select(ChatMessage)
            .where(
                ChatMessage.session_id == session_id,
                ChatMessage.role == MessageRole.USER,
                ChatMessage.created_at < target.created_at,
            )
            .order_by(ChatMessage.created_at.desc())
            .limit(1)
        )
        user_msg = result.scalar_one_or_none()
        prompt = user_msg.content if user_msg else ""

        # Build history (everything before target)
        hist_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id, ChatMessage.created_at < target.created_at)
            .order_by(ChatMessage.created_at.asc())
            .limit(30)
        )
        chat_history = [
            {"role": m.role.value if hasattr(m.role, "value") else m.role, "content": m.content}
            for m in hist_result.scalars().all()
        ]

        # Count existing siblings & deactivate old message
        parent_id = target.parent_message_id or (user_msg.id if user_msg else None)
        sibling_count = 1
        if parent_id:
            count_result = await db.execute(
                select(func.count(ChatMessage.id)).where(
                    ChatMessage.parent_message_id == parent_id,
                    ChatMessage.role == MessageRole.ASSISTANT,
                )
            )
            sibling_count = count_result.scalar() or 1

        target.is_active = False
        await db.commit()

    # ── Stream new response ──────────────────────────────────────────────
    try:
        sr = await stream_and_broadcast(
            orchestrator=orchestrator,
            message=prompt,
            user_id=user_id,
            session_id=session_id,
            channel=channel,
            chat_history=chat_history,
        )

        if not sr.success:
            return

        # Save new versioned sibling
        async with AsyncSessionLocal() as db:
            new_msg = ChatMessage(
                session_id=session_id,
                role=MessageRole.ASSISTANT,
                content=sr.final_content,
                tokens=sr.estimated_tokens,
                model_used=sr.model_used,
                parent_message_id=parent_id,
                version=sibling_count + 1,
                is_active=True,
            )
            db.add(new_msg)
            await db.commit()
            logger.info("regenerated_message_saved", message_id=new_msg.id, session_id=session_id)

    except Exception as e:
        logger.exception("regenerate_stream_error")
        await channel_manager.broadcast_to_user_channel(
            user_id=user_id, channel=channel,
            event="error", data={"code": "regenerate_error", "message": str(e)},
        )
