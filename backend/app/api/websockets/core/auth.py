"""
WebSocket authentication.

Single source of truth for JWT → User resolution across all WS endpoints.
"""

from typing import Optional

import structlog
from jose import JWTError
from sqlalchemy import select

from app.core.security import decode_token
from app.db.session import AsyncSessionLocal
from app.models.user import User

logger = structlog.get_logger()


async def get_user_from_token(token: str) -> Optional[User]:
    """
    Validate a JWT token and return the active User, or None.

    Used by every WebSocket endpoint for connection-time authentication.
    """
    try:
        payload = decode_token(token)
        user_id_str = payload.get("sub")
        if not user_id_str:
            return None

        user_id = int(user_id_str)
    except (JWTError, ValueError, TypeError):
        logger.debug("ws_auth_failed", token_preview=token[:20])
        return None
    except Exception:
        logger.exception("ws_auth_unexpected_error")
        return None

    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            return user if user and user.is_active else None
    except Exception:
        logger.exception("ws_user_lookup_failed", user_id=user_id)
        return None
