"""
Global error handling middleware.
Catches all unhandled exceptions and returns formatted error responses.
"""

import traceback
from typing import Union

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

from app.core.config import settings
from app.core.exceptions import SynapseException
from app.utils.logging import get_logger

logger = get_logger(__name__)


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Global exception handler for all unhandled exceptions.

    Args:
        request: FastAPI request object
        exc: Exception that was raised

    Returns:
        JSONResponse: Formatted error response
    """
    # Get request ID if available
    request_id = getattr(request.state, "request_id", None)

    # Handle SYNAPSE custom exceptions
    if isinstance(exc, SynapseException):
        logger.warning(
            "synapse_exception",
            request_id=request_id,
            error_code=exc.error_code,
            message=exc.message,
            status_code=exc.status_code,
            path=request.url.path,
        )

        return JSONResponse(
            status_code=exc.status_code,
            content=exc.to_dict(),
        )

    # Handle FastAPI validation errors
    if isinstance(exc, (RequestValidationError, ValidationError)):
        logger.warning(
            "validation_error",
            request_id=request_id,
            errors=exc.errors(),
            path=request.url.path,
        )

        # Convert errors to JSON-safe format (exclude 'input' which may have datetime objects)
        safe_errors = []
        for err in exc.errors():
            safe_err = {
                "type": err.get("type"),
                "loc": err.get("loc"),
                "msg": err.get("msg"),
                "url": err.get("url"),
            }
            safe_errors.append(safe_err)

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Request validation failed",
                    "details": {"validation_errors": safe_errors},
                }
            },
        )

    # Handle all other exceptions
    logger.error(
        "unhandled_exception",
        request_id=request_id,
        error=str(exc),
        error_type=type(exc).__name__,
        path=request.url.path,
        traceback=traceback.format_exc() if settings.ENVIRONMENT == "development" else None,
    )

    # Determine response based on environment
    if settings.ENVIRONMENT == "production":
        # Hide details in production
        error_response = {
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An internal error occurred",
                "details": {},
            }
        }
    else:
        # Show details in development
        error_response = {
            "error": {
                "code": "INTERNAL_ERROR",
                "message": str(exc),
                "details": {"type": type(exc).__name__, "traceback": traceback.format_exc()},
            }
        }

    # Add request ID if available
    if request_id:
        error_response["error"]["request_id"] = request_id

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response,
    )
