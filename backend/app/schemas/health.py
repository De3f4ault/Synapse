"""
Health check schemas.

Extracted from rest/health.py.
"""

from datetime import datetime
from typing import Dict, Optional
from pydantic import BaseModel


class ServiceStatus(BaseModel):
    """Individual service status."""
    status: str
    message: str
    latency_ms: Optional[float] = None
    details: Optional[Dict] = None


class HealthResponse(BaseModel):
    """Overall health status response."""
    status: str
    timestamp: datetime
    services: Dict[str, ServiceStatus]
