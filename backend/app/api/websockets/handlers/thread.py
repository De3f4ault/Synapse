"""
Thread message handler.

Handles messages within a conversation thread (sub-conversation),
streaming the AI response and saving both user and assistant messages.
"""

import structlog
from sqlalchemy import select

from app.api.websockets.core.channels import channel_manager
from app.api.websockets.core.streaming import stream_and_broadcast
from app.db.session import AsyncSessionLocal

logger = structlog.get_logger()


async def handle_thread_message(
    user_id: int,
    session_id: int,
    thread_id: int,
    content: str,
    channel: str,
):
    """
    Handle a thread message via WebSocket streaming.

    Flow:
        1. Save user message to the thread
        2. Build thread-scoped chat history
        3. Stream AI response via orchestrator
        4. Save assistant message to the thread
    """
    from app.core.ai.orchestrator import get_orchestrator
    from app.modules.chat.interface import ChatMessage, MessageRole

    orchestrator = get_orchestrator()

    # ── Save user message & build thread history ─────────────────────────
    async with AsyncSessionLocal() as db:
        user_message = ChatMessage(
            session_id=session_id,
            thread_id=thread_id,
            role=MessageRole.USER,
            content=content,
            tokens=max(1, len(content) // 4),
        )
        db.add(user_message)
        await db.commit()
        await db.refresh(user_message)

        hist_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.thread_id == thread_id)
            .order_by(ChatMessage.created_at.asc())
            .limit(30)
        )
        chat_history = [
            {"role": m.role.value if hasattr(m.role, "value") else m.role, "content": m.content}
            for m in hist_result.scalars().all()
        ]

    # Notify frontend of the saved user message
    await channel_manager.broadcast_to_user_channel(
        user_id=user_id,
        channel=channel,
        event="thread_user_message",
        data={"thread_id": thread_id, "content": content, "message_id": user_message.id},
    )

    # ── Stream AI response ───────────────────────────────────────────────
    try:
        sr = await stream_and_broadcast(
            orchestrator=orchestrator,
            message=content,
            user_id=user_id,
            session_id=session_id,
            channel=channel,
            chat_history=chat_history,
            extra_data={"thread_id": thread_id},
        )

        if not sr.success:
            return

        # Save assistant message
        async with AsyncSessionLocal() as db:
            assistant_msg = ChatMessage(
                session_id=session_id,
                thread_id=thread_id,
                role=MessageRole.ASSISTANT,
                content=sr.final_content,
                tokens=sr.estimated_tokens,
                model_used=sr.model_used,
            )
            db.add(assistant_msg)
            await db.commit()
            logger.info("thread_message_saved", message_id=assistant_msg.id, thread_id=thread_id)

    except Exception as e:
        logger.exception("thread_stream_error")
        await channel_manager.broadcast_to_user_channel(
            user_id=user_id, channel=channel,
            event="error", data={"code": "thread_error", "message": str(e)},
        )
