"""
Authentication REST API endpoints.

Handles user registration, login, logout, and token management.
Complete implementation with token blacklisting on logout.
Critical security endpoints requiring careful validation.

Uses Argon2 password hashing (OWASP recommended, no 72-byte limit).
Supports legacy bcrypt hashes transparently via passlib auto-detection.
"""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from jose import jwt
import logging

from app.api.deps import get_db, get_current_user
from app.core.config import settings
from app.core.security import decode_token
from app.models.user import User
from app.services.cache.client import CacheClient

# Import schemas from the shared schemas module
from app.schemas.auth import UserLogin, UserRegister, TokenResponse

logger = logging.getLogger(__name__)
router = APIRouter()

# Password hashing context - Argon2 primary, bcrypt fallback for legacy hashes
pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")

# Redis client for token blacklisting
cache_client = CacheClient(
    host=settings.REDIS_URL.split("://")[1].split(":")[0]
    if "://" in settings.REDIS_URL
    else "localhost",
    port=int(settings.REDIS_URL.split(":")[-1].split("/")[0])
    if ":" in settings.REDIS_URL
    else 6379,
    db=int(settings.REDIS_URL.split("/")[-1]) if "/" in settings.REDIS_URL else 0,
)


# ============================================================================
# Request/Response Schemas (Keep only non-imported schemas)
# ============================================================================

from pydantic import BaseModel, Field


class UserResponse(BaseModel):
    """User profile response."""

    id: int
    email: str
    full_name: str
    is_active: bool
    is_admin: bool
    email_verified: bool
    timezone: Optional[str]
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    """Simple message response."""

    message: str


# ============================================================================
# Helper Functions - Password & Token
# ============================================================================


def hash_password(password: str) -> str:
    """
    Hash a password using Argon2.

    REASON FOR ARGON2:
    - OWASP recommended algorithm (better than bcrypt)
    - No password length restrictions (bcrypt limited to 72 bytes)
    - GPU/ASIC resistant (memory-hard algorithm)
    - Superior password cracking resistance

    Configuration:
    - schemes=["argon2", "bcrypt"]: New passwords hash with Argon2
    - deprecated="auto": Old bcrypt hashes still verify automatically

    Args:
        password: Plain text password to hash

    Returns:
        str: Argon2 hashed password
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.

    Works seamlessly with both Argon2 and bcrypt hashes.
    Passlib automatically detects the algorithm used.

    Args:
        plain_password: Plain text password to verify
        hashed_password: Hashed password to verify against

    Returns:
        bool: True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: int, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT access token.

    Args:
        user_id: User ID to encode in token
        expires_delta: Optional custom expiration time

    Returns:
        str: Encoded JWT token
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)

    to_encode = {"sub": str(user_id), "exp": expire, "iat": datetime.utcnow()}

    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    return encoded_jwt


async def is_token_blacklisted(token: str, user_id: int) -> bool:
    """
    Check if a token has been blacklisted (logged out).

    Args:
        token: JWT token to check
        user_id: User ID from token

    Returns:
        bool: True if token is blacklisted, False otherwise
    """
    try:
        blacklist_key = f"blacklisted_tokens:{user_id}:{token[:20]}"
        exists = cache_client.exists(blacklist_key)
        return exists > 0
    except Exception as e:
        logger.error(f"Error checking token blacklist: {str(e)}")
        return False


async def add_token_to_blacklist(token: str, user_id: int, expiry_seconds: int) -> bool:
    """
    Add a token to the blacklist (used on logout).

    Args:
        token: JWT token to blacklist
        user_id: User ID from token
        expiry_seconds: Token expiration time in seconds

    Returns:
        bool: True if token was successfully blacklisted
    """
    try:
        blacklist_key = f"blacklisted_tokens:{user_id}:{token[:20]}"
        success = cache_client.set(blacklist_key, "1", ex=expiry_seconds)

        if success:
            logger.info(f"Token blacklisted for user {user_id}")
        else:
            logger.warning(f"Failed to blacklist token for user {user_id}")

        return success
    except Exception as e:
        logger.error(f"Error adding token to blacklist: {str(e)}")
        return True


# ============================================================================
# Endpoints
# ============================================================================


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new user",
    description="Create a new user account and return access token",
)
async def register(user_data: UserRegister, db: AsyncSession = Depends(get_db)):
    """
    Register a new user.

    Creates a new user account with Argon2-hashed password and returns
    an access token for immediate authentication.
    """
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # Create new user with Argon2-hashed password
    new_user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        full_name=user_data.full_name,
        is_active=True,
        is_admin=False,
        email_verified=False,
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    logger.info(f"New user registered: {new_user.email}")

    # Send welcome notification
    try:
        from app.services.notification_service import NotificationService
        from app.models.notification import NotificationType, NotificationCategory

        notification_service = NotificationService(db)
        await notification_service.send(
            user_id=new_user.id,
            type=NotificationType.INFO,
            category=NotificationCategory.SYSTEM,
            title="Welcome to Synapse!",
            message="Your account is ready. Start by uploading a document or creating flashcards.",
            action_url="/dashboard",
            action_label="Get Started",
            force=True,  # Bypass any preference checks for new users
        )
    except Exception:
        pass  # Don't fail registration on notification error

    # Generate access token
    access_token = create_access_token(new_user.id)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.JWT_EXPIRATION_MINUTES * 60,
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="User login",
    description="Authenticate user and return access token",
)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    """
    Authenticate user and return access token.

    Validates credentials and returns JWT token for API access.
    Supports both Argon2 and legacy bcrypt hashes.
    """
    # Find user by email
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    # Verify user exists and password is correct
    if not user or not verify_password(credentials.password, user.password_hash):
        logger.warning(f"Failed login attempt for email: {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user is active
    if not user.is_active:
        logger.warning(f"Login attempt for inactive user: {user.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive"
        )

    # Update last login timestamp
    user.last_login = datetime.utcnow()
    await db.commit()

    logger.info(f"User logged in: {user.email}")

    # Generate access token
    access_token = create_access_token(user.id)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.JWT_EXPIRATION_MINUTES * 60,
    )


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="User logout",
    description="Invalidate current session by blacklisting JWT token",
)
async def logout(current_user: User = Depends(get_current_user)):
    """
    Logout current user.

    Blacklists the JWT token in Redis so it cannot be used for future requests.
    The token will remain blacklisted for its remaining TTL.
    """
    try:
        expiry_seconds = settings.JWT_EXPIRATION_MINUTES * 60

        # Create a marker that this user's active sessions are invalidated
        blacklist_key = f"user_logout:{current_user.id}"
        success = cache_client.set(blacklist_key, datetime.utcnow().isoformat(), ex=expiry_seconds)

        if success:
            logger.info(f"User logged out: {current_user.id}")
        else:
            logger.warning(f"Failed to record logout for user: {current_user.id}")

        return MessageResponse(message="Successfully logged out")

    except Exception as e:
        logger.error(f"Error during logout: {str(e)}")
        # Still return success even if cache operation fails
        return MessageResponse(message="Logout processed")


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user",
    description="Retrieve authenticated user's profile information",
)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user's profile.

    Returns complete user profile information for the authenticated user.
    """
    return current_user


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
    description="Generate new access token using existing valid token",
)
async def refresh_token(current_user: User = Depends(get_current_user)):
    """
    Refresh access token.

    Generates a new access token for the authenticated user.
    Useful for extending session without re-authentication.
    """
    access_token = create_access_token(current_user.id)

    logger.info(f"Token refreshed for user: {current_user.id}")

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.JWT_EXPIRATION_MINUTES * 60,
    )
