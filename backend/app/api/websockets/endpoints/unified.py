"""
Unified WebSocket endpoint — the main dispatcher.

Thin transport layer that:
  1. Authenticates via JWT
  2. Manages channel subscriptions
  3. Routes incoming messages to domain handlers
  4. Handles heartbeats and graceful disconnection

All business logic lives in handlers/.
"""

import asyncio

import structlog
from fastapi import WebSocket, WebSocketDisconnect, Query, status

from app.api.websockets.core.auth import get_user_from_token
from app.api.websockets.core.channels import channel_manager
from app.api.websockets.core.manager import manager
from app.api.websockets.handlers import (
    handle_chat_message,
    handle_regenerate,
    handle_thread_message,
    handle_branch,
)

logger = structlog.get_logger()

# Heartbeat interval (seconds)
_HEARTBEAT = 30


async def unified_websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT authentication token"),
):
    """
    Unified WebSocket endpoint for all real-time features.

    Channels:
        dashboard, chat:{session_id}, activity, study:{session_id}

    Client → Server message types:
        ping, subscribe, unsubscribe, stop, message,
        regenerate, thread_message, branch
    """
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    session_id = f"unified_{user.id}"
    active_channels: set[str] = set()

    try:
        await manager.connect(session_id, websocket, user.id)

        # Auto-subscribe to dashboard
        await channel_manager.subscribe(user_id=user.id, channel="dashboard", session_id=session_id)
        active_channels.add("dashboard")

        await websocket.send_json({
            "type": "connected",
            "user_id": user.id,
            "session_id": session_id,
            "message": "Unified WebSocket connected",
        })

        logger.info("unified_ws_connected", user_id=user.id, session_id=session_id)

        # ── Main message loop ────────────────────────────────────────
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=_HEARTBEAT)
                msg_type = data.get("type")

                if msg_type == "ping":
                    await websocket.send_json({"type": "pong"})

                elif msg_type == "subscribe":
                    channel = data.get("channel")
                    if channel:
                        await channel_manager.subscribe(user_id=user.id, channel=channel, session_id=session_id)
                        active_channels.add(channel)
                        await websocket.send_json({"type": "subscribed", "channel": channel})

                elif msg_type == "unsubscribe":
                    channel = data.get("channel")
                    if channel and channel in active_channels:
                        await channel_manager.unsubscribe(user_id=user.id, channel=channel, session_id=session_id)
                        active_channels.discard(channel)
                        await websocket.send_json({"type": "unsubscribed", "channel": channel})

                elif msg_type in ("stop", "generation.stop"):
                    await _handle_stop(user.id, data.get("channel"))

                elif msg_type == "message":
                    await _dispatch_chat(user.id, data, websocket)

                elif msg_type == "regenerate":
                    await _dispatch_regenerate(user.id, data)

                elif msg_type == "thread_message":
                    await _dispatch_thread(user.id, data)

                elif msg_type == "branch":
                    await _dispatch_branch(user.id, data)

            except asyncio.TimeoutError:
                await websocket.send_json({"type": "ping"})

            except WebSocketDisconnect:
                break

            except asyncio.CancelledError:
                break

            except Exception as e:
                logger.error("unified_ws_error", user_id=user.id, error=str(e))
                if _is_connection_error(e):
                    break

    except Exception as e:
        logger.error("unified_ws_connection_error", user_id=user.id if user else "?", error=str(e))
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except Exception:
            pass

    finally:
        for ch in active_channels:
            try:
                await channel_manager.unsubscribe(user_id=user.id, channel=ch, session_id=session_id)
            except Exception:
                pass
        try:
            await manager.disconnect(session_id, websocket)
        except Exception:
            pass
        logger.info("unified_ws_closed", user_id=user.id if user else "?", session_id=session_id)


# ── Private dispatch helpers ─────────────────────────────────────────────


def _parse_chat_session_id(channel: str) -> int | None:
    """Extract numeric session ID from 'chat:123' channel format."""
    try:
        if channel and channel.startswith("chat:"):
            return int(channel.split(":")[1])
    except (ValueError, IndexError):
        pass
    return None


def _is_connection_error(e: Exception) -> bool:
    """Check if an exception indicates a broken WebSocket connection."""
    msg = str(e).lower()
    return any(kw in msg for kw in ("connection closed", "not connected", "disconnect", "closed"))


async def _handle_stop(user_id: int, channel: str | None):
    """Cancel in-flight generation and notify the client."""
    try:
        from app.core.ai.orchestrator import get_orchestrator
        orchestrator = get_orchestrator()
        if hasattr(orchestrator, "cancel_generation"):
            await orchestrator.cancel_generation(user_id=user_id)
        if channel:
            await channel_manager.broadcast_to_user_channel(
                user_id=user_id, channel=channel,
                event="stopped", data={"reason": "user_cancelled"},
            )
    except Exception as e:
        logger.error("stop_generation_error", error=str(e))


async def _dispatch_chat(user_id: int, data: dict, websocket: WebSocket):
    """Extract fields and call handle_chat_message."""
    channel = data.get("channel")
    content = data.get("content")
    sid = _parse_chat_session_id(channel)
    if sid is None or not content:
        return
    try:
        await handle_chat_message(
            user_id=user_id, session_id=sid, content=content,
            websocket=websocket, channel=channel,
            compare=data.get("compare", False),
            models=data.get("models"),
            mode=data.get("mode", "socratic"),
        )
    except Exception as e:
        logger.error("chat_dispatch_error", error=str(e))
        await _broadcast_error(user_id, channel, "chat_error", e)


async def _dispatch_regenerate(user_id: int, data: dict):
    """Extract fields and call handle_regenerate."""
    channel = data.get("channel")
    message_id = data.get("messageId") or data.get("message_id")
    sid = _parse_chat_session_id(channel)
    if sid is None or not message_id:
        return
    try:
        await handle_regenerate(
            user_id=user_id, session_id=sid,
            message_id=int(message_id), channel=channel,
        )
    except Exception as e:
        logger.error("regenerate_dispatch_error", error=str(e))
        await _broadcast_error(user_id, channel, "regenerate_error", e)


async def _dispatch_thread(user_id: int, data: dict):
    """Extract fields and call handle_thread_message."""
    channel = data.get("channel")
    thread_id = data.get("threadId") or data.get("thread_id")
    content = data.get("content")
    sid = _parse_chat_session_id(channel)
    if sid is None or not thread_id or not content:
        return
    try:
        await handle_thread_message(
            user_id=user_id, session_id=sid,
            thread_id=int(thread_id), content=content, channel=channel,
        )
    except Exception as e:
        logger.error("thread_dispatch_error", error=str(e))
        await _broadcast_error(user_id, channel, "thread_message_error", e)


async def _dispatch_branch(user_id: int, data: dict):
    """Extract fields and call handle_branch."""
    channel = data.get("channel")
    message_id = data.get("messageId") or data.get("message_id")
    sid = _parse_chat_session_id(channel)
    if sid is None or not message_id:
        return
    try:
        await handle_branch(
            user_id=user_id, session_id=sid,
            message_id=int(message_id), channel=channel,
            prompt=data.get("prompt"),
            model_override=data.get("model_override"),
        )
    except Exception as e:
        logger.error("branch_dispatch_error", error=str(e))
        await _broadcast_error(user_id, channel, "branch_error", e)


async def _broadcast_error(user_id: int, channel: str | None, code: str, error: Exception):
    """Send an error event to the user on a channel."""
    if channel:
        await channel_manager.broadcast_to_user_channel(
            user_id=user_id, channel=channel,
            event="error", data={"code": code, "message": str(error)},
        )
