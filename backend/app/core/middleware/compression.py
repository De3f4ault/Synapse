"""
Response compression middleware using Gzip.
"""
from fastapi import FastAPI
from starlette.middleware.gzip import GZipMiddleware


def setup_compression(app: FastAPI, minimum_size: int = 1000) -> None:
    """
    Configure Gzip compression middleware.

    Args:
        app: FastAPI application instance
        minimum_size: Minimum response size in bytes to trigger compression
    """
    app.add_middleware(
        GZipMiddleware,
        minimum_size=minimum_size
    )
