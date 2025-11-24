"""
JWT authentication middleware with token blacklist support.

Validates JWT tokens and checks Redis blacklist to prevent use of logged-out tokens.
Uses dependency injection (get_current_user) for most cases, but can be used globally.
"""
from typing import Callable, List, Optional
import logging

from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from jose import JWTError, jwt

from app.core.security import decode_token
from app.core.config import settings
from app.services.cache.client import CacheClient

logger = logging.getLogger(__name__)

# Initialize Redis client for blacklist checks
_cache_client: Optional[CacheClient] = None


def get_cache_client() -> CacheClient:
    """Get or create Redis cache client for blacklist checks."""
    global _cache_client
    if _cache_client is None:
        _cache_client = CacheClient(
            host=settings.REDIS_URL.split("://")[1].split(":")[0] if "://" in settings.REDIS_URL else "localhost",
            port=int(settings.REDIS_URL.split(":")[-1].split("/")[0]) if ":" in settings.REDIS_URL else 6379,
            db=int(settings.REDIS_URL.split("/")[-1]) if "/" in settings.REDIS_URL else 0
        )
    return _cache_client


async def is_token_blacklisted(token: str, user_id: int) -> bool:
    """
    Check if token has been blacklisted (user logged out).

    Args:
        token: JWT token to check
        user_id: User ID from decoded token

    Returns:
        bool: True if token is blacklisted, False if still valid
    """
    try:
        cache_client = get_cache_client()

        # Check user-level logout (all tokens invalidated)
        user_logout_key = f"user_logout:{user_id}"
        if cache_client.exists(user_logout_key):
            logger.info(f"Token rejected - user {user_id} has logged out globally")
            return True

        # Check individual token blacklist
        token_blacklist_key = f"blacklisted_tokens:{user_id}:{token[:20]}"
        if cache_client.exists(token_blacklist_key):
            logger.info(f"Token rejected - token for user {user_id} is blacklisted")
            return True

        return False

    except Exception as e:
        logger.error(f"Error checking token blacklist: {str(e)}")
        # Fail open on cache errors - allow request through
        return False


class AuthenticationMiddleware(BaseHTTPMiddleware):
    """
    JWT authentication middleware with token blacklist support.

    Validates JWT tokens and checks Redis blacklist to prevent use of logged-out tokens.
    Note: Prefer using dependency injection (get_current_user) for most cases.
    This middleware is useful for global authentication requirements.
    """

    def __init__(
        self,
        app: ASGIApp,
        exclude_paths: List[str] = None,
    ):
        """
        Initialize authentication middleware.

        Args:
            app: ASGI application
            exclude_paths: List of paths to exclude from authentication
        """
        super().__init__(app)
        self.exclude_paths = exclude_paths or [
            "/docs",
            "/redoc",
            "/openapi.json",
            "/health",
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/refresh",
        ]

    async def dispatch(
        self,
        request: Request,
        call_next: Callable
    ) -> Response:
        """
        Validate JWT token and check blacklist if present.

        Args:
            request: Incoming HTTP request
            call_next: Next middleware/route handler

        Returns:
            Response: HTTP response
        """
        # Skip authentication for excluded paths
        if any(request.url.path.startswith(path) for path in self.exclude_paths):
            return await call_next(request)

        # Extract token from Authorization header
        auth_header = request.headers.get("Authorization")

        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

            try:
                # Decode and validate token
                token_data = decode_token(token)
                user_id = int(token_data.get("sub"))

                # Check if token is blacklisted (user logged out)
                if await is_token_blacklisted(token, user_id):
                    logger.warning(f"Rejected blacklisted token for user {user_id}")
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Token has been revoked (user logged out)",
                        headers={"WWW-Authenticate": "Bearer"},
                    )

                # Store token data in request state for later use
                request.state.token_data = token_data
                request.state.user_id = user_id
                request.state.token = token

                logger.debug(f"Token validated for user {user_id}")

            except JWTError as e:
                # Invalid token format or signature
                logger.warning(f"Invalid token: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not validate credentials",
                    headers={"WWW-Authenticate": "Bearer"},
                ) from e
            except HTTPException:
                # Re-raise HTTP exceptions (like blacklist check)
                raise
            except Exception as e:
                logger.error(f"Unexpected error in token validation: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication failed",
                    headers={"WWW-Authenticate": "Bearer"},
                ) from e

        return await call_next(request)
