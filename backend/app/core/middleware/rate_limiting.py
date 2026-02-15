"""
Rate limiting middleware using PostgreSQL-backed cache.
Implements token bucket algorithm with endpoint-specific limits and admin bypass.
"""

import time
from typing import Callable, Dict, Optional

from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.config import settings
from app.core.exceptions import RateLimitError
from app.utils.logging import get_logger

logger = get_logger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Advanced rate limiting middleware with:
    - Per-user and per-IP limits
    - Endpoint-specific configurations
    - Admin bypass
    - Rate limit headers
    """

    # Endpoint-specific rate limits
    ENDPOINT_LIMITS = {
        # Authentication endpoints - strict limits
        "/api/v1/auth/login": {"requests": 5, "window": 60},  # 5 per minute
        "/api/v1/auth/register": {"requests": 3, "window": 3600},  # 3 per hour
        # Upload endpoints - file size limits
        "/api/v1/documents": {"requests": 10, "window": 3600},  # 10 per hour
        # AI endpoints - API usage limits
        "/api/v1/chat": {"requests": 100, "window": 3600},  # 100 per hour
        # Search endpoints - expensive queries
        "/api/v1/search": {"requests": 50, "window": 60},  # 50 per minute
        # Analytics - computation heavy
        "/api/v1/analytics": {"requests": 20, "window": 60},  # 20 per minute
    }

    # Paths that bypass rate limiting
    BYPASS_PATHS = {
        "/health",
        "/health/ready",
        "/health/live",
        "/docs",
        "/redoc",
        "/openapi.json",
    }

    def __init__(
        self,
        app: ASGIApp,
        requests: int = None,
        window: int = None,
    ):
        """
        Initialize rate limiter with default and custom limits.

        Args:
            app: ASGI application
            requests: Default requests per window (from settings)
            window: Default window in seconds (from settings)
        """
        super().__init__(app)
        self.default_requests = requests or settings.RATE_LIMIT_REQUESTS
        self.default_window = window or settings.RATE_LIMIT_WINDOW

        logger.info(
            "rate_limiter_initialized",
            default_requests=self.default_requests,
            default_window=self.default_window,
            endpoint_limits=len(self.ENDPOINT_LIMITS),
        )

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Check rate limit before processing request.

        Uses PgCacheClient (kv_store) for atomic increment/expire.
        Fails open if cache is unavailable.
        """
        # Skip if rate limiting disabled
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)

        # Bypass for specific paths
        if self._should_bypass(request.path):
            return await call_next(request)

        # Check if admin user (bypass rate limits)
        user = getattr(request.state, "user", None)
        if user and getattr(user, "is_admin", False):
            logger.debug(
                "rate_limit_bypassed_admin",
                user_id=user.id,
                path=request.path,
            )
            return await call_next(request)

        # Get client identifier
        client_id = self._get_client_id(request)

        # Get rate limit config for this endpoint
        limit_config = self._get_limit_config(request)
        requests_limit = limit_config["requests"]
        window = limit_config["window"]

        # Build cache key with window bucket
        cache_key = f"rate_limit:{client_id}:{int(time.time()) // window}"

        try:
            from app.services.cache.client import get_cache

            cache = get_cache()

            # Increment counter atomically
            current_count = await cache.increment(cache_key)

            # Set expiration on first request
            if current_count == 1:
                await cache.expire(cache_key, window)

            # Calculate remaining requests
            remaining = max(0, requests_limit - current_count)

            # Calculate reset time
            reset_time = int(time.time()) + window

            # Check if limit exceeded
            if current_count > requests_limit:
                # Get TTL for retry-after header
                ttl = await cache.ttl(cache_key)

                logger.warning(
                    "rate_limit_exceeded",
                    client_id=client_id,
                    current_count=current_count,
                    limit=requests_limit,
                    window=window,
                    path=request.path,
                    method=request.method,
                )

                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Maximum {requests_limit} requests per {window} seconds.",
                    headers={
                        "X-RateLimit-Limit": str(requests_limit),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(reset_time),
                        "Retry-After": str(ttl if ttl > 0 else window),
                    },
                )

            # Process request
            response = await call_next(request)

            # Add rate limit headers to response
            response.headers["X-RateLimit-Limit"] = str(requests_limit)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Reset"] = str(reset_time)

            # Log successful request with rate info
            logger.debug(
                "rate_limit_checked",
                client_id=client_id,
                current_count=current_count,
                remaining=remaining,
                path=request.path,
            )

            return response

        except HTTPException:
            # Re-raise rate limit errors
            raise
        except Exception as e:
            # Log error but don't block request if cache fails
            logger.error(
                "rate_limit_error",
                client_id=client_id,
                error=str(e),
                path=request.path,
            )
            # Continue processing request (fail open)
            return await call_next(request)

    def _should_bypass(self, path: str) -> bool:
        """
        Check if path should bypass rate limiting.

        Args:
            path: Request path

        Returns:
            bool: True if should bypass
        """
        # Exact match bypass
        if path in self.BYPASS_PATHS:
            return True

        # Prefix match for health endpoints
        if path.startswith("/health"):
            return True

        return False

    def _get_limit_config(self, request: Request) -> Dict[str, int]:
        """
        Get rate limit configuration for endpoint.

        Checks endpoint-specific limits, falls back to defaults.

        Args:
            request: HTTP request

        Returns:
            dict: {"requests": int, "window": int}
        """
        path = request.path

        # Check exact path match
        if path in self.ENDPOINT_LIMITS:
            config = self.ENDPOINT_LIMITS[path]
            logger.debug(
                "using_endpoint_limit",
                path=path,
                config=config,
            )
            return config

        # Check prefix matches for dynamic routes
        for endpoint_path, config in self.ENDPOINT_LIMITS.items():
            if path.startswith(endpoint_path):
                logger.debug(
                    "using_prefix_limit",
                    path=path,
                    endpoint=endpoint_path,
                    config=config,
                )
                return config

        # Default limits
        return {
            "requests": self.default_requests,
            "window": self.default_window,
        }

    def _get_client_id(self, request: Request) -> str:
        """
        Get client identifier for rate limiting.

        Priority:
        1. Authenticated user ID
        2. X-Forwarded-For header (proxy)
        3. Client IP address
        4. "unknown"

        Args:
            request: HTTP request

        Returns:
            str: Client identifier (e.g., "user:123" or "ip:192.168.1.1")
        """
        # Try to get user ID from request state (if authenticated)
        user = getattr(request.state, "user", None)
        if user:
            return f"user:{user.id}"

        # Try X-Forwarded-For (proxy/load balancer)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # Get first IP (client IP)
            client_ip = forwarded.split(",")[0].strip()
            return f"ip:{client_ip}"

        # Fall back to direct client IP
        if request.client:
            return f"ip:{request.client.host}"

        # Unknown client (shouldn't happen)
        logger.warning("unknown_client_id", path=request.path)
        return "unknown"
