"""
Middleware components for request/response processing.
"""
from app.core.middleware.cors import setup_cors
from app.core.middleware.logging import LoggingMiddleware
from app.core.middleware.error_handler import global_exception_handler
from app.core.middleware.compression import setup_compression
from app.core.middleware.rate_limiting import RateLimitMiddleware

__all__ = [
    "setup_cors",
    "LoggingMiddleware",
    "global_exception_handler",
    "setup_compression",
    "RateLimitMiddleware",
]
