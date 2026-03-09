"""
Branch handler.

Creates a conversation branch from an existing message, streaming a new
AI response and saving it as an inactive versioned sibling.
"""

import structlog
from sqlalchemy import select

from app.api.websockets.core.channels import channel_manager
from app.api.websockets.core.streaming import stream_and_broadcast
from app.core.ai.registry.models import DEFAULT_CHAT_MODEL
from app.db.session import AsyncSessionLocal

logger = structlog.get_logger()


async def handle_branch(
    user_id: int,
    session_id: int,
    message_id: int,
    channel: str,
    prompt: str | None = None,
    model_override: str | None = None,
):
    """
    Create a branch with streaming AI response.

    Flow:
        1. Verify ownership & build message ancestry for context
        2. Determine the prompt (original or override)
        3. Stream AI response via orchestrator
        4. Save as new branch message (inactive)
    """
    from app.core.ai.orchestrator import get_orchestrator
    from app.modules.chat.interface import ChatSession, ChatMessage, MessageRole

    orchestrator = get_orchestrator()

    # ── Build ancestry & determine prompt ────────────────────────────────
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

        # Walk up the message tree to build ancestry context
        ancestry: list[dict] = []
        current_id = message_id
        for _ in range(50):  # depth guard
            if not current_id:
                break
            msg = await db.get(ChatMessage, current_id)
            if not msg:
                break
            ancestry.append({
                "role": msg.role.value if hasattr(msg.role, "value") else msg.role,
                "content": msg.content,
            })
            current_id = msg.parent_message_id
        ancestry.reverse()

        # Determine what prompt to use
        if target.role == MessageRole.USER:
            branch_prompt = prompt or target.content
        else:
            user_prompt = next(
                (m["content"] for m in reversed(ancestry[:-1]) if m["role"] == "user"),
                None,
            )
            branch_prompt = prompt or user_prompt or target.content
            ancestry = ancestry[:-1]  # exclude the assistant message we're replacing

        chat_history = ancestry

        # Calculate next version number
        siblings_result = await db.execute(
            select(ChatMessage.version)
            .where(ChatMessage.parent_message_id == message_id)
            .order_by(ChatMessage.version.desc())
        )
        max_version = siblings_result.scalar() or 0

    # ── Stream ───────────────────────────────────────────────────────────
    await channel_manager.broadcast_to_user_channel(
        user_id=user_id, channel=channel,
        event="branch_started",
        data={"parent_message_id": message_id, "version": max_version + 1},
    )

    try:
        sr = await stream_and_broadcast(
            orchestrator=orchestrator,
            message=branch_prompt,
            user_id=user_id,
            session_id=session_id,
            channel=channel,
            chat_history=chat_history,
            model_override=model_override,
            extra_data={"branch_parent_id": message_id},
        )

        if not sr.success:
            return

        # Save the branch message (inactive)
        async with AsyncSessionLocal() as db:
            branch_msg = ChatMessage(
                session_id=session_id,
                parent_message_id=message_id,
                role=MessageRole.ASSISTANT,
                content=sr.final_content,
                tokens=sr.estimated_tokens,
                model_used=sr.model_used,
                version=max_version + 1,
                is_active=False,
            )
            db.add(branch_msg)
            await db.commit()
            await db.refresh(branch_msg)

            await channel_manager.broadcast_to_user_channel(
                user_id=user_id, channel=channel,
                event="branch_created",
                data={
                    "branch_id": branch_msg.id,
                    "parent_message_id": message_id,
                    "version": branch_msg.version,
                    "model_used": sr.model_used,
                },
            )
            logger.info("branch_created", branch_id=branch_msg.id, parent_id=message_id)

    except Exception as e:
        logger.exception("branch_stream_error")
        await channel_manager.broadcast_to_user_channel(
            user_id=user_id, channel=channel,
            event="error", data={"code": "branch_error", "message": str(e)},
        )
