"""
Custom exception hierarchy for SYNAPSE application.

Provides structured exceptions with status codes and error details.
"""

from typing import Any, Dict, Optional


class SynapseException(Exception):
    """
    Base exception class for all SYNAPSE exceptions.

    All custom exceptions should inherit from this class to provide
    consistent error handling and formatting.
    """

    def __init__(
        self,
        message: str,
        error_code: str,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None,
    ):
        """
        Initialize exception.

        Args:
            message: Human-readable error message
            error_code: Machine-readable error code (e.g., "USER_NOT_FOUND")
            status_code: HTTP status code (default: 500)
            details: Additional error details as dictionary
        """
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert exception to dictionary format for JSON responses.

        Returns:
            Dict with error information
        """
        return {
            "error": {
                "code": self.error_code,
                "message": self.message,
                "details": self.details,
            }
        }

    def __str__(self) -> str:
        """String representation of exception."""
        return f"{self.error_code}: {self.message}"


# ============================================================================
# Authentication & Authorization Exceptions (401, 403)
# ============================================================================


class AuthenticationError(SynapseException):
    """Authentication failed - invalid credentials."""

    def __init__(
        self,
        message: str = "Authentication failed",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            error_code="AUTHENTICATION_ERROR",
            status_code=401,
            details=details,
        )


class AuthorizationError(SynapseException):
    """Authorization failed - insufficient permissions."""

    def __init__(
        self,
        message: str = "Insufficient permissions",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            error_code="AUTHORIZATION_ERROR",
            status_code=403,
            details=details,
        )


# ============================================================================
# Resource Exceptions (404, 409)
# ============================================================================


class ResourceNotFoundError(SynapseException):
    """Requested resource not found."""

    def __init__(
        self,
        resource_type: str,
        resource_id: Optional[Any] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        message = f"{resource_type} not found"
        if resource_id is not None:
            message = f"{resource_type} with ID {resource_id} not found"

        details = details or {}
        details.update({"resource_type": resource_type, "resource_id": resource_id})

        super().__init__(
            message=message,
            error_code="RESOURCE_NOT_FOUND",
            status_code=404,
            details=details,
        )


class ResourceAlreadyExistsError(SynapseException):
    """Resource already exists - conflict."""

    def __init__(
        self,
        resource_type: str,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=f"{resource_type} already exists",
            error_code="RESOURCE_ALREADY_EXISTS",
            status_code=409,
            details=details,
        )


# ============================================================================
# Validation Exceptions (422)
# ============================================================================


class ValidationError(SynapseException):
    """Validation error - invalid input data."""

    def __init__(
        self,
        message: str = "Validation error",
        field: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        details = details or {}
        if field:
            details["field"] = field

        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=422,
            details=details,
        )


# ============================================================================
# Business Logic Exceptions (400)
# ============================================================================


class BusinessLogicError(SynapseException):
    """Business logic constraint violation."""

    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            error_code="BUSINESS_LOGIC_ERROR",
            status_code=400,
            details=details,
        )


# ============================================================================
# External Service Exceptions (502, 503)
# ============================================================================


class ExternalServiceError(SynapseException):
    """External service unavailable or error."""

    def __init__(
        self,
        service_name: str,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        details = details or {}
        details["service"] = service_name

        super().__init__(
            message=message or f"{service_name} service error",
            error_code="EXTERNAL_SERVICE_ERROR",
            status_code=502,
            details=details,
        )


class ServiceUnavailableError(SynapseException):
    """Service temporarily unavailable."""

    def __init__(
        self,
        message: str = "Service temporarily unavailable",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            error_code="SERVICE_UNAVAILABLE",
            status_code=503,
            details=details,
        )


# ============================================================================
# Rate Limiting Exceptions (429)
# ============================================================================


class RateLimitError(SynapseException):
    """Rate limit exceeded."""

    def __init__(
        self,
        message: str = "Rate limit exceeded",
        retry_after: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        details = details or {}
        if retry_after:
            details["retry_after_seconds"] = retry_after

        super().__init__(
            message=message,
            error_code="RATE_LIMIT_EXCEEDED",
            status_code=429,
            details=details,
        )


class RateLimitExceededError(RateLimitError):
    """Alias for RateLimitError - for backward compatibility."""
    pass


# ============================================================================
# AI/Quota Exceptions (429, 503)
# ============================================================================


class QuotaExceededError(SynapseException):
    """AI quota exceeded."""

    def __init__(
        self,
        quota_type: str = "daily",
        reset_time: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        details = details or {}
        details.update({"quota_type": quota_type, "reset_time": reset_time})

        super().__init__(
            message=f"AI {quota_type} quota exceeded",
            error_code="QUOTA_EXCEEDED",
            status_code=429,
            details=details,
        )


# ============================================================================
# Database Exceptions (500)
# ============================================================================


class DatabaseError(SynapseException):
    """Database operation failed."""

    def __init__(
        self,
        message: str = "Database operation failed",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            error_code="DATABASE_ERROR",
            status_code=500,
            details=details,
        )
