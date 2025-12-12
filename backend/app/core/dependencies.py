"""
FastAPI dependencies for dependency injection.
Handles authentication, authorization, and common dependencies.
"""
from typing import Optional, Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.core.exceptions import AuthenticationError, AuthorizationError
from app.db.session import AsyncSessionLocal


# OAuth2 scheme for JWT bearer tokens
security = HTTPBearer()


async def get_db() -> Generator[AsyncSession, None, None]:
    """
    Database session dependency.

    Yields:
        AsyncSession: Database session
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the current authenticated user from JWT token.

    Args:
        credentials: HTTP authorization credentials
        db: Database session

    Returns:
        User: Current authenticated user

    Raises:
        AuthenticationError: If token is invalid or user not found
    """
    token = credentials.credentials

    # Decode token
    try:
        token_data = decode_token(token)
    except HTTPException as e:
        raise AuthenticationError(
            message="Invalid or expired token",
            details={"error": str(e)}
        )

    # Extract user_id from token
    user_id = token_data.get("user_id")
    if not user_id:
        raise AuthenticationError(
            message="Invalid token payload",
            details={"error": "Missing user_id in token"}
        )

    # Import here to avoid circular imports
    from app.models.user import User
    from sqlalchemy import select

    # Fetch user from database
    result = await db.execute(
        select(User).where(User.id == user_id, User.is_active == True)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise AuthenticationError(
            message="User not found or inactive",
            details={"user_id": user_id}
        )

    return user


async def get_current_active_user(
    current_user = Depends(get_current_user)
):
    """
    Ensure the current user is active.

    Args:
        current_user: Current user from get_current_user

    Returns:
        User: Current active user

    Raises:
        AuthenticationError: If user is not active
    """
    if not current_user.is_active:
        raise AuthenticationError(
            message="User account is inactive",
            details={"user_id": current_user.id}
        )

    return current_user


async def require_admin(
    current_user = Depends(get_current_active_user)
):
    """
    Require admin privileges.

    Args:
        current_user: Current active user

    Returns:
        User: Current admin user

    Raises:
        AuthorizationError: If user is not admin
    """
    if not current_user.is_admin:
        raise AuthorizationError(
            message="Admin privileges required",
            details={"user_id": current_user.id}
        )

    return current_user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current user if authenticated, None otherwise.
    Useful for endpoints that work with or without authentication.

    Args:
        credentials: Optional HTTP authorization credentials
        db: Database session

    Returns:
        User or None: Current user if authenticated, None otherwise
    """
    if not credentials:
        return None

    try:
        return await get_current_user(credentials, db)
    except (AuthenticationError, HTTPException):
        return None


def pagination_params(
    page: int = 1,
    page_size: int = 20,
    max_page_size: int = 100
):
    """
    Pagination parameters dependency.

    Args:
        page: Page number (1-indexed)
        page_size: Number of items per page
        max_page_size: Maximum allowed page size

    Returns:
        dict: Pagination parameters (skip, limit)

    Raises:
        HTTPException: If parameters are invalid
    """
    if page < 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Page must be >= 1"
        )

    if page_size < 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Page size must be >= 1"
        )

    if page_size > max_page_size:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Page size must be <= {max_page_size}"
        )

    skip = (page - 1) * page_size
    limit = page_size

    return {"skip": skip, "limit": limit, "page": page, "page_size": page_size}
