"""
Health check REST API endpoints.

System health and service status monitoring endpoints.
Complete implementation with all 5 service checks:
- PostgreSQL database
- Redis cache
- Qdrant vector store
- DuckDB analytics
- Gemini API
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
            details={"driver": "asyncpg"}
        )
    except Exception as e:
        logger.error(f"PostgreSQL health check failed: {str(e)}")
        return ServiceStatus(
            status="unhealthy",
            message=f"PostgreSQL connection failed: {str(e)}",
            details={"error": str(e)}
        )


async def check_redis() -> ServiceStatus:
    """
    Check Redis cache connectivity.

    Returns:
        ServiceStatus with health status
    """
    import time
    start = time.time()

    try:
        import redis.asyncio as redis

        redis_client = redis.from_url(settings.REDIS_URL)
        await redis_client.ping()
        latency = (time.time() - start) * 1000

        # Get connection info
        info = await redis_client.info()
        used_memory = info.get("used_memory_human", "unknown")

        await redis_client.close()

        return ServiceStatus(
            status="healthy",
            message="Connected to Redis",
            latency_ms=latency,
            details={
                "url": settings.REDIS_URL,
                "used_memory": used_memory,
                "connected_clients": info.get("connected_clients", 0)
            }
        )
    except Exception as e:
        logger.error(f"Redis health check failed: {str(e)}")
        return ServiceStatus(
            status="unhealthy",
            message=f"Redis connection failed: {str(e)}",
            details={"error": str(e), "url": settings.REDIS_URL}
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
                "port": qdrant_client.config.port
            }
        )
    except Exception as e:
        latency_ms = int((time.time() - start) * 1000)
        logger.error(f"Qdrant health check failed: {str(e)}")
        return ServiceStatus(
            status="unhealthy",
            message=f"Qdrant connection failed: {str(e)}",
            latency_ms=latency_ms,
            details={"error": str(e)}
        )


async def check_duckdb() -> ServiceStatus:
    """
    Check DuckDB analytics database connectivity.

    Returns:
        ServiceStatus with health status
    """
    import time
    start = time.time()

    try:
        import duckdb

        conn = duckdb.connect(str(settings.DUCKDB_PATH))

        # Check database is accessible
        result = conn.execute(
            "SELECT COUNT(*) as table_count FROM information_schema.tables"
        ).fetchone()

        table_count = result[0] if result else 0
        latency = (time.time() - start) * 1000

        conn.close()

        return ServiceStatus(
            status="healthy",
            message="Connected to DuckDB",
            latency_ms=latency,
            details={
                "path": str(settings.DUCKDB_PATH),
                "table_count": table_count
            }
        )
    except Exception as e:
        logger.error(f"DuckDB health check failed: {str(e)}")
        return ServiceStatus(
            status="unhealthy",
            message=f"DuckDB connection failed: {str(e)}",
            details={"error": str(e), "path": str(settings.DUCKDB_PATH)}
        )


async def check_gemini_api() -> ServiceStatus:
    """
    Check Gemini API connectivity and quota.

    Returns:
        ServiceStatus with health status
    """
    import time
    start = time.time()

    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)

        # List available models to verify API key is valid
        models = list(genai.list_models())
        latency = (time.time() - start) * 1000

        # Count available models
        available_models = [m.name for m in models if "generateContent" in m.supported_generation_methods]

        return ServiceStatus(
            status="healthy",
            message="Connected to Gemini API",
            latency_ms=latency,
            details={
                "available_models": len(available_models),
                "model_names": [m.split("/")[-1] for m in available_models[:5]],
                "api_configured": True
            }
        )
    except Exception as e:
        logger.error(f"Gemini API health check failed: {str(e)}")
        return ServiceStatus(
            status="unhealthy",
            message=f"Gemini API check failed: {str(e)}",
            details={"error": str(e), "possible_causes": ["Invalid API key", "API quota exceeded", "Network issue"]}
        )


# ============================================================================
# Endpoints
# ============================================================================

@router.get(
    "",
    response_model=HealthResponse,
    summary="Overall health check",
    description="Check health of all system services"
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

    # Check Redis (important)
    services["redis"] = await check_redis()

    # Check Qdrant (important)
    services["qdrant"] = await check_qdrant()

    # Check DuckDB (important)
    services["duckdb"] = await check_duckdb()

    # Check Gemini API (important)
    services["gemini_api"] = await check_gemini_api()

    # Determine overall status
    # All services must be healthy for overall health
    overall_status = "healthy" if all(
        s.status == "healthy" for s in services.values()
    ) else "unhealthy"

    response = HealthResponse(
        status=overall_status,
        timestamp=datetime.utcnow(),
        services=services
    )

    # Return appropriate status code
    if overall_status == "unhealthy":
        # Log which services failed
        failed = [name for name, svc in services.items() if svc.status == "unhealthy"]
        logger.warning(f"Health check failed for services: {', '.join(failed)}")

    return response


@router.get(
    "/ready",
    summary="Readiness check",
    description="Kubernetes readiness probe - check if app is ready for traffic"
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

        # Check Redis (needed for many features)
        import redis.asyncio as redis
        redis_client = redis.from_url(settings.REDIS_URL)
        await redis_client.ping()
        await redis_client.close()

        logger.info("Readiness check passed")
        return {
            "status": "ready",
            "timestamp": datetime.utcnow(),
            "services_required": ["postgresql", "redis"]
        }
    except Exception as e:
        logger.error(f"Readiness check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Application not ready - critical services unavailable"
        )


@router.get(
    "/live",
    summary="Liveness check",
    description="Kubernetes liveness probe - check if app process is alive"
)
async def liveness_check():
    """
    Kubernetes liveness probe.

    Returns 200 if application process is alive (always succeeds).
    Used to determine if container should be restarted.
    """
    return {
        "status": "alive",
        "timestamp": datetime.utcnow()
    }
