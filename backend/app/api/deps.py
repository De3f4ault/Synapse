"""
Shared API dependencies.

FastAPI dependency injection for common operations:
- Database session management
- User authentication and authorization
- Permission checking
- Service injection
"""

from typing import AsyncGenerator, Optional
from fastapi import Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError, jwt

from app.db.session import AsyncSessionLocal
from app.core.config import settings
from app.models.user import User

# Security scheme for JWT Bearer tokens
security = HTTPBearer(auto_error=False)


class PaginationParams:
    """Reusable pagination dependency. Usage: `pagination: PaginationParams = Depends()`."""

    def __init__(
        self,
        page: int = Query(1, ge=1, description="Page number"),
        page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    ):
        self.page = page
        self.page_size = page_size

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Database session dependency.

    Provides an async database session that automatically closes
    after the request is complete.

    Yields:
        AsyncSession: SQLAlchemy async database session
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    token: Optional[str] = Query(None, description="Auth token for image/file requests"),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get current authenticated user from JWT token.

    Extracts and validates JWT token, then retrieves the user from database.

    Args:
        credentials: HTTP Authorization credentials (Bearer token)
        token_query: Optional token from query parameters (for images/downloads)
        db: Database session

    Returns:
        User: The authenticated user object

    Raises:
        HTTPException: 401 if token is invalid or user not found
    """
    # 1. Get token source
    jwt_token = None
    if credentials:
        jwt_token = credentials.credentials
    elif token:
        jwt_token = token

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not jwt_token:
        raise credentials_exception

    try:
        # Decode JWT token
        payload = jwt.decode(
            jwt_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: Optional[int] = payload.get("sub")

        if user_id is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    # Query user from database
    from sqlalchemy import select

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user account")

    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Verify user is active.

    Additional check to ensure user account is active.

    Args:
        current_user: User from get_current_user dependency

    Returns:
        User: The active user object

    Raises:
        HTTPException: 403 if user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user account")
    return current_user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Require admin privileges.

    Ensures the current user has admin privileges.

    Args:
        current_user: User from get_current_user dependency

    Returns:
        User: The admin user object

    Raises:
        HTTPException: 403 if user is not an admin
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required"
        )
    return current_user


def require_document_permission(permission: str = "view"):
    """
    FastAPI dependency factory for document-level permission checks.

    Sourced from Paperless PaperlessObjectPermissions (permissions.py L19-42).
    Translated to FastAPI's Depends() pattern.

    Usage:
        @router.get("/{document_id}")
        async def get_document(
            document_id: int,
            _perm = Depends(require_document_permission("view")),
        ):

    Args:
        permission: Required permission level ('view' or 'change')

    Returns:
        Dependency function that raises 403 if permission denied
    """
    async def _check_permission(
        document_id: int,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ):
        from app.services.permissions.service import PermissionService

        perm_service = PermissionService(db)
        if not await perm_service.has_permission(
            current_user.id, document_id, permission
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You do not have {permission} permission on this document",
            )
        return True

    return _check_permission


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[User]:
    """
    Get user if authenticated, None otherwise.

    Used for endpoints that work with or without authentication.

    Args:
        credentials: Optional HTTP Authorization credentials

    Returns:
        Optional[User]: User if authenticated, None otherwise
    """
    if credentials is None:
        return None

    # If credentials provided, validate them
    # This is a simplified version - in production, implement full validation
    return None  # Placeholder
