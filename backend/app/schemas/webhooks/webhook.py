"""
Webhook schemas .
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, HttpUrl


class WebhookCreate(BaseModel):
    """Webhook creation schema."""

    url: HttpUrl = Field(description="Webhook URL")
    events: List[str] = Field(min_length=1, description="Event types to subscribe to")
    secret: str = Field(min_length=16, max_length=128, description="Webhook secret for HMAC signature")
    is_active: bool = Field(default=True, description="Whether webhook is active")
    description: Optional[str] = Field(default=None, max_length=500, description="Webhook description")

    class Config:
        json_schema_extra = {
            "example": {
                "url": "https://example.com/webhooks/synapse",
                "events": ["card.reviewed", "document.processed", "quiz.completed"],
                "secret": "webhook_secret_key_123456",
                "is_active": True,
                "description": "Production webhook for card reviews"
            }
        }


class WebhookUpdate(BaseModel):
    """Webhook update schema."""

    url: Optional[HttpUrl] = Field(default=None, description="Webhook URL")
    events: Optional[List[str]] = Field(default=None, min_length=1, description="Event types")
    secret: Optional[str] = Field(default=None, min_length=16, max_length=128, description="Webhook secret")
    is_active: Optional[bool] = Field(default=None, description="Whether webhook is active")
    description: Optional[str] = Field(default=None, max_length=500, description="Webhook description")


class WebhookResponse(BaseModel):
    """Webhook response schema."""

    id: int = Field(description="Webhook ID")
    user_id: int = Field(description="Owner user ID")
    url: str = Field(description="Webhook URL")
    events: List[str] = Field(description="Subscribed event types")
    is_active: bool = Field(description="Whether webhook is active")
    description: Optional[str] = Field(default=None, description="Webhook description")
    created_at: datetime = Field(description="Creation time")
    updated_at: datetime = Field(description="Last update time")
    last_triggered_at: Optional[datetime] = Field(default=None, description="Last trigger time")
    total_deliveries: int = Field(description="Total deliveries attempted")
    successful_deliveries: int = Field(description="Successful deliveries")
    failed_deliveries: int = Field(description="Failed deliveries")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "user_id": 1,
                "url": "https://example.com/webhooks/synapse",
                "events": ["card.reviewed", "document.processed"],
                "is_active": True,
                "description": "Production webhook",
                "created_at": "2025-11-01T10:00:00Z",
                "updated_at": "2025-11-06T12:00:00Z",
                "last_triggered_at": "2025-11-06T11:30:00Z",
                "total_deliveries": 150,
                "successful_deliveries": 148,
                "failed_deliveries": 2
            }
        }


class WebhookEventResponse(BaseModel):
    """Webhook event log response schema."""

    id: int = Field(description="Event log ID")
    webhook_id: int = Field(description="Webhook ID")
    event_type: str = Field(description="Event type")
    payload: Dict[str, Any] = Field(description="Event payload")
    status: str = Field(description="Delivery status (pending, sent, failed)")
    response_code: Optional[int] = Field(default=None, description="HTTP response code")
    response_body: Optional[str] = Field(default=None, description="Response body")
    attempts: int = Field(description="Delivery attempts")
    next_retry_at: Optional[datetime] = Field(default=None, description="Next retry time")
    created_at: datetime = Field(description="Event creation time")
    sent_at: Optional[datetime] = Field(default=None, description="Delivery time")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "webhook_id": 1,
                "event_type": "card.reviewed",
                "payload": {
                    "event_id": "evt_123",
                    "user_id": 1,
                    "card_id": 5,
                    "quality": 4,
                    "timestamp": "2025-11-06T12:00:00Z"
                },
                "status": "sent",
                "response_code": 200,
                "response_body": '{"status": "received"}',
                "attempts": 1,
                "next_retry_at": None,
                "created_at": "2025-11-06T12:00:00Z",
                "sent_at": "2025-11-06T12:00:01Z"
            }
        }



class WebhookTestRequest(BaseModel):
    """Test webhook request."""
    event_type: str = Field(..., description="Event type to test")


class WebhookTestResponse(BaseModel):
    """Webhook test response schema."""

    success: bool = Field(description="Whether test was successful")
    status_code: Optional[int] = Field(default=None, description="HTTP response code")
    response_time_ms: Optional[int] = Field(default=None, description="Response time in milliseconds")
    error: Optional[str] = Field(default=None, description="Error message if failed")
    payload_sent: Dict[str, Any] = Field(description="Test payload sent")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "status_code": 200,
                "response_time_ms": 250,
                "error": None,
                "payload_sent": {
                    "event_type": "test",
                    "timestamp": "2025-11-06T12:00:00Z",
                    "data": {"test": True}
                }
            }
        }


class WebhookEventTypesResponse(BaseModel):
    """Available webhook event types response schema."""

    event_types: List[Dict[str, str]] = Field(description="Available event types")

    class Config:
        json_schema_extra = {
            "example": {
                "event_types": [
                    {
                        "name": "card.created",
                        "description": "Triggered when a flashcard is created"
                    },
                    {
                        "name": "card.reviewed",
                        "description": "Triggered when a flashcard is reviewed"
                    },
                    {
                        "name": "document.processed",
                        "description": "Triggered when document processing completes"
                    },
                    {
                        "name": "quiz.completed",
                        "description": "Triggered when a quiz is completed"
                    }
                ]
            }
        }


class WebhookPayload(BaseModel):
    """Standard webhook payload schema."""

    event_id: str = Field(description="Unique event ID (UUID)")
    event_type: str = Field(description="Event type")
    timestamp: datetime = Field(description="Event timestamp")
    user_id: int = Field(description="User ID")
    data: Dict[str, Any] = Field(description="Event-specific data")

    class Config:
        json_schema_extra = {
            "example": {
                "event_id": "evt_a1b2c3d4e5f6",
                "event_type": "card.reviewed",
                "timestamp": "2025-11-06T12:00:00Z",
                "user_id": 1,
                "data": {
                    "card_id": 5,
                    "quality": 4,
                    "next_review": "2025-11-13T12:00:00Z",
                    "ease_factor": 2.6
                }
            }
        }
