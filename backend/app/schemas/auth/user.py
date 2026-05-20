"""
User schemas.
"""

from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """Base user schema."""

    email: EmailStr = Field(description="User email address")
    full_name: str = Field(min_length=1, max_length=255, description="User full name")


class UserCreate(UserBase):
    """User creation schema."""

    password: str = Field(min_length=8, max_length=100, description="User password")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "SecurePass123",
                "full_name": "John Doe"
            }
        }


class UserUpdate(BaseModel):
    """User update schema."""

    full_name: Optional[str] = Field(default=None, min_length=1, max_length=255, description="User full name")
    preferences: Optional[Dict[str, Any]] = Field(default=None, description="User preferences")
    timezone: Optional[str] = Field(default=None, description="User timezone")

    class Config:
        json_schema_extra = {
            "example": {
                "full_name": "John Doe",
                "preferences": {
                    "theme": "dark",
                    "notifications_enabled": True
                },
                "timezone": "America/New_York"
            }
        }


class PasswordChange(BaseModel):
    """Password change request."""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, description="New password")


class UserResponse(UserBase):
    """User response schema."""

    id: int = Field(description="User ID")
    is_active: bool = Field(description="Whether user is active")
    is_admin: bool = Field(default=False, description="Whether user is admin")
    email_verified: bool = Field(default=False, description="Whether email is verified")
    timezone: Optional[str] = Field(default=None, description="User timezone")
    last_login: Optional[datetime] = Field(default=None, description="Last login time")
    created_at: datetime = Field(description="Account creation time")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "email": "user@example.com",
                "full_name": "John Doe",
                "is_active": True,
                "is_admin": False,
                "email_verified": True,
                "timezone": "America/New_York",
                "last_login": "2025-11-06T12:00:00Z",
                "created_at": "2025-11-01T10:00:00Z"
            }
        }


class UserStatistics(BaseModel):
    """User statistics schema."""

    total_cards: int = Field(default=0, description="Total flashcards")
    due_cards: int = Field(default=0, description="Cards due for review")
    total_decks: int = Field(default=0, description="Total decks")
    total_notes: int = Field(default=0, description="Total notes")
    total_documents: int = Field(default=0, description="Total documents")
    study_streak_days: int = Field(default=0, description="Current study streak in days")
    reviews_today: int = Field(default=0, description="Reviews completed today")
    total_reviews: int = Field(default=0, description="Total reviews completed")
    overall_accuracy: Optional[float] = Field(default=None, description="Overall accuracy rate")
    total_study_time_minutes: int = Field(default=0, description="Total study time in minutes")
    study_sessions_count: int = Field(default=0, description="Total study sessions")

    class Config:
        json_schema_extra = {
            "example": {
                "total_cards": 150,
                "due_cards": 25,
                "total_decks": 5,
                "total_notes": 30,
                "total_documents": 10,
                "study_streak_days": 7,
                "reviews_today": 12,
                "total_reviews": 500,
                "overall_accuracy": 0.85,
                "total_study_time_minutes": 300,
                "study_sessions_count": 45
            }
        }


class UserPreferences(BaseModel):
    """User preferences schema."""

    theme: str = Field(default="light", pattern="^(light|dark)$", description="UI theme")
    notifications_enabled: bool = Field(default=True, description="Enable notifications")
    daily_goal: int = Field(default=20, ge=1, le=1000, description="Daily review goal")
    study_reminders: bool = Field(default=True, description="Enable study reminders")
    reminder_time: Optional[str] = Field(default=None, pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$", description="Reminder time (HH:MM)")

    class Config:
        json_schema_extra = {
            "example": {
                "theme": "dark",
                "notifications_enabled": True,
                "daily_goal": 30,
                "study_reminders": True,
                "reminder_time": "09:00"
            }
        }
