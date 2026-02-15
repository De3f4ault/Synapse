"""
Health check REST API endpoints.

System health and service status monitoring endpoints.
Complete implementation with service checks:
- PostgreSQL database
- PostgreSQL cache (kv_store)
- Qdrant vector store
- Gemini API

Note: DuckDB removed - using PostgreSQL materialized views for analytics.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Dict, Optional
import logging

from app.api.deps import get_db
from app.core.config import settings
from app.core.ai.registry.models import DEFAULT_TOKENIZER_MODEL

logger = logging.getLogger(__name__)
router = APIRouter()


# ============================================================================
# Response Schemas
# ============================================================================


class ServiceStatus(BaseModel):
    """Individual service status."""

    status: str  # "healthy" or "unhealthy"
    message: str
    latency_ms: Optional[float] = None
    details: Optional[Dict] = None


class HealthResponse(BaseModel):
    """Overall health status response."""

    status: str  # "healthy" or "unhealthy"
    timestamp: datetime
    services: Dict[str, ServiceStatus]


# ============================================================================
# Helper Functions - Service Checks
# ============================================================================


async def check_postgresql(db: AsyncSession) -> ServiceStatus:
    """
    Check PostgreSQL database connectivity.

    Returns:
        ServiceStatus with health status
    """
    import time

    start = time.time()

    try:
        await db.execute(text("SELECT 1"))
        latency = (time.time() - start) * 1000

        return ServiceStatus(
            status="healthy",
            message="Connected to PostgreSQL",
            latency_ms=latency,
            details={"driver": "asyncpg"},
        )
    except Exception as e:
        logger.error(f"PostgreSQL health check failed: {str(e)}")
        return ServiceStatus(
            status="unhealthy",
            message=f"PostgreSQL connection failed: {str(e)}",
            details={"error": str(e)},
        )


async def check_cache() -> ServiceStatus:
    """
    Check PostgreSQL cache (kv_store) connectivity.

    Returns:
        ServiceStatus with health status
    """
    import time

    start = time.time()

    try:
        from app.services.cache.client import get_cache

        cache = get_cache()
        is_alive = await cache.ping()
        latency = (time.time() - start) * 1000

        if is_alive:
            return ServiceStatus(
                status="healthy",
                message="PostgreSQL cache operational",
                latency_ms=latency,
                details={"backend": "kv_store (UNLOGGED)"},
            )
        else:
            return ServiceStatus(
                status="unhealthy",
                message="PostgreSQL cache ping failed",
                details={"backend": "kv_store"},
            )
    except Exception as e:
        logger.error(f"Cache health check failed: {str(e)}")
        return ServiceStatus(
            status="unhealthy",
            message=f"Cache check failed: {str(e)}",
            details={"error": str(e)},
        )


async def check_qdrant() -> ServiceStatus:
    """
    Check Qdrant vector store connectivity.

    Returns:
        ServiceStatus with Qdrant health information
    """
    import time

    start = time.time()

    try:
        from app.core.ai.rag.vector_store.qdrant.client import get_qdrant_client

        qdrant_client = get_qdrant_client()
        client = qdrant_client.get_client()

        # Test connection by getting collections
        collections = client.get_collections()

        latency_ms = int((time.time() - start) * 1000)

        return ServiceStatus(
            status="healthy",
            message="Connected to Qdrant",
            latency_ms=latency_ms,
            details={
                "collections_count": len(collections.collections),
                "host": qdrant_client.config.host,
                "port": qdrant_client.config.port,
            },
        )
    except Exception as e:
        latency_ms = int((time.time() - start) * 1000)
        logger.error(f"Qdrant health check failed: {str(e)}")
        return ServiceStatus(
            status="unhealthy",
            message=f"Qdrant connection failed: {str(e)}",
            latency_ms=latency_ms,
            details={"error": str(e)},
        )


# NOTE: DuckDB check removed - analytics now use PostgreSQL materialized views
# See app/sql/views/user_dashboard_stats.sql


async def check_gemini_api() -> ServiceStatus:
    """
    Check Gemini API connectivity and quota.

    Returns:
        ServiceStatus with health status
    """
    import time

    start = time.time()

    try:
        from google import genai

        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        # Test API by making a simple generation request
        response = client.models.generate_content(
            model=DEFAULT_TOKENIZER_MODEL, contents="Say 'OK' in one word."
        )
        latency = (time.time() - start) * 1000

        return ServiceStatus(
            status="healthy",
            message="Connected to Gemini API",
            latency_ms=latency,
            details={"response_received": bool(response.text), "api_configured": True},
        )
    except Exception as e:
        logger.error(f"Gemini API health check failed: {str(e)}")
        return ServiceStatus(
            status="unhealthy",
            message=f"Gemini API check failed: {str(e)}",
            details={
                "error": str(e),
                "possible_causes": ["Invalid API key", "API quota exceeded", "Network issue"],
            },
        )


# ============================================================================
# Endpoints
# ============================================================================


@router.get(
    "",
    response_model=HealthResponse,
    summary="Overall health check",
    description="Check health of all system services",
)
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Check overall system health.

    Verifies connectivity and basic functionality of:
    - PostgreSQL database
    - Redis cache
    - Qdrant vector store
    - DuckDB analytics database
    - Gemini API

    Returns 200 with "healthy" status if all services are operational.
    Returns 503 with "unhealthy" status if any critical service fails.
    """
    services = {}

    # Check PostgreSQL (critical)
    services["postgresql"] = await check_postgresql(db)

    # Check PostgreSQL cache (important)
    services["cache"] = await check_cache()

    # Check Qdrant (important)
    services["qdrant"] = await check_qdrant()

    # NOTE: DuckDB removed - analytics now use PostgreSQL materialized views

    # Check Gemini API (important)
    services["gemini_api"] = await check_gemini_api()

    # Determine overall status
    # All services must be healthy for overall health
    overall_status = (
        "healthy" if all(s.status == "healthy" for s in services.values()) else "unhealthy"
    )

    response = HealthResponse(status=overall_status, timestamp=datetime.utcnow(), services=services)

    # Return appropriate status code
    if overall_status == "unhealthy":
        # Log which services failed
        failed = [name for name, svc in services.items() if svc.status == "unhealthy"]
        logger.warning(f"Health check failed for services: {', '.join(failed)}")

    return response


@router.get(
    "/ready",
    summary="Readiness check",
    description="Kubernetes readiness probe - check if app is ready for traffic",
)
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """
    Kubernetes readiness probe.

    Returns 200 if application is ready to handle requests.
    Returns 503 if critical services are unavailable.

    Critical services for readiness:
    - PostgreSQL database

    This is less strict than /health to allow graceful degradation.
    """
    try:
        # Check PostgreSQL (critical for readiness)
        await db.execute(text("SELECT 1"))

        # Check cache (needed for many features)
        from app.services.cache.client import get_cache

        cache = get_cache()
        await cache.ping()

        logger.info("Readiness check passed")
        return {
            "status": "ready",
            "timestamp": datetime.utcnow(),
            "services_required": ["postgresql", "cache"],
        }
    except Exception as e:
        logger.error(f"Readiness check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Application not ready - critical services unavailable",
        )


@router.get(
    "/live",
    summary="Liveness check",
    description="Kubernetes liveness probe - check if app process is alive",
)
async def liveness_check():
    """
    Kubernetes liveness probe.

    Returns 200 if application process is alive (always succeeds).
    Used to determine if container should be restarted.
    """
    return {"status": "alive", "timestamp": datetime.utcnow()}
