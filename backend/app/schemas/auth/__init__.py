"""
auth/ — Authentication, token, and user schemas.

    from app.schemas.auth import UserLogin, TokenResponse, UserResponse
"""

from app.schemas.auth.auth import (
    UserRegister,
    UserLogin,
    TokenResponse,
    TokenData,
    PasswordChange,
    PasswordReset,
    PasswordResetConfirm,
)
from app.schemas.auth.user import (
    UserBase,
    UserCreate,
    UserUpdate,
    UserResponse,
    UserStatistics,
    UserPreferences,
)

__all__ = [
    # auth.py
    "UserRegister",
    "UserLogin",
    "TokenResponse",
    "TokenData",
    "PasswordChange",
    "PasswordReset",
    "PasswordResetConfirm",
    # user.py
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserStatistics",
    "UserPreferences",
]
