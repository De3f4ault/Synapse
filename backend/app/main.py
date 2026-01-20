"""
SYNAPSE Backend - FastAPI Application Entry Point

This is the main application factory that creates and configures the FastAPI app.
All middleware, routers, and lifecycle events are registered here.

UPDATED: Now uses centralized WebSocket routing.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.middleware import (
    setup_cors,
    setup_compression,
    LoggingMiddleware,
    global_exception_handler,
)
from app.api.rest import api_router
from app.api.websockets import register_websocket_routes
from app.db import init_db, close_db
from app.utils.logging import get_logger

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.

    Handles startup and shutdown events:
    - Startup: Initialize database, Redis, vector stores, analytics
    - Shutdown: Close connections gracefully
    """
    # ==================== STARTUP ====================
    logger.info("application_starting", app_name=settings.APP_NAME)

    try:
        # Initialize PostgreSQL connection
        await init_db()
        logger.info("postgresql_initialized")

        # Initialize Redis (if enabled)
        if settings.REDIS_URL:
            try:
                from app.services.cache.client import init_redis

                await init_redis()
                logger.info("redis_initialized")
            except Exception as e:
                logger.warning("redis_init_failed", error=str(e))

        # Initialize Qdrant vector store
        try:
            from app.core.ai.rag.vector_store.qdrant.client import get_qdrant_client

            qdrant_client = get_qdrant_client()
            # Test connection
            qdrant_client.get_client().get_collections()
            logger.info("qdrant_initialized")
        except Exception as e:
            logger.warning("qdrant_init_failed", error=str(e))

        # NOTE: DuckDB analytics removed - using PostgreSQL materialized views instead
        # See app/sql/views/user_dashboard_stats.sql

        # Load SQL functions
        try:
            from app.db import load_sql_functions

            await load_sql_functions()
            logger.info("sql_functions_loaded")
        except Exception as e:
            logger.warning("sql_functions_load_failed", error=str(e))

        # ==================== INITIALIZE PLATFORM ====================
        try:
            from app.platform import init_platform

            init_platform()
            logger.info(
                "platform_initialized", modules=["notes", "documents", "flashcards", "quizzes"]
            )
        except Exception as e:
            logger.warning("platform_init_failed", error=str(e))

        # ==================== REGISTER AI AGENTS ====================
        try:
            from app.core.ai.agents.factory import get_agent_factory
            from app.core.ai.agents.implementations import (
                TutorAgent,
                DocumentAgent,
                QuizAgent,
                GeneralAssistantAgent,
            )

            factory = get_agent_factory()

            # Register agent classes
            factory.register_agent_class("tutor", TutorAgent)
            factory.register_agent_class("document", DocumentAgent)
            factory.register_agent_class("quiz", QuizAgent)
            factory.register_agent_class("general", GeneralAssistantAgent)

            logger.info("agents_registered", agents=["tutor", "document", "quiz", "general"])
        except Exception as e:
            logger.warning("agent_registration_failed", error=str(e))

        # Initialize Agent Orchestrator
        try:
            from app.core.ai.orchestrator import get_orchestrator

            orchestrator = get_orchestrator()
            await orchestrator.initialize()
            logger.info("orchestrator_initialized")
        except Exception as e:
            logger.warning("orchestrator_init_failed", error=str(e))

        # ==================== INITIALIZE RAG SYSTEM ====================
        try:
            from app.services.rag import get_rag_service

            # Initialize RAG service (triggers pipeline init)
            rag_service = get_rag_service()

            # Store in app state for access in routes
            app.state.rag_service = rag_service

            logger.info(
                "rag_system_initialized",
                features=[
                    "advanced_chunking",
                    "llm_enhancement",
                    "learning_aware_reranking",
                    "feedback_loops",
                ],
            )
        except Exception as e:
            logger.error("rag_init_failed", error=str(e), exc_info=True)
            # Non-critical for now, continue startup

        # ==================== SETUP EMBEDDING HOOKS ====================
        try:
            from app.services.background.embedding_hooks import setup_embedding_hooks

            setup_embedding_hooks()
            logger.info(
                "embedding_hooks_initialized",
                description="Note/Flashcard create/update will auto-trigger embedding generation",
            )
        except Exception as e:
            logger.warning("embedding_hooks_init_failed", error=str(e))

        logger.info(
            "application_started",
            app_name=settings.APP_NAME,
            version=settings.APP_VERSION,
            environment=settings.ENVIRONMENT,
        )

    except Exception as e:
        logger.error("startup_failed", error=str(e))
        raise

    yield  # Application runs here

    # ==================== SHUTDOWN ====================
    logger.info("application_shutting_down")

    try:
        # Stop WebSocket cleanup task
        from app.api.websockets.manager import manager

        manager.stop_cleanup_task()
        logger.info("websocket_cleanup_stopped")

        # Close database connections
        await close_db()
        logger.info("postgresql_closed")

        # Close Redis
        try:
            from app.services.cache.client import close_redis

            await close_redis()
            logger.info("redis_closed")
        except Exception:
            pass

        logger.info("application_shutdown_complete")

    except Exception as e:
        logger.error("shutdown_error", error=str(e))


def create_app() -> FastAPI:
    """
    Application factory.

    Creates and configures the FastAPI application with all middleware,
    routers, and exception handlers.

    Returns:
        FastAPI: Configured application instance
    """
    app = FastAPI(
        title=settings.APP_NAME,
        description="AI-powered learning platform with spaced repetition and intelligent tutoring",
        version=settings.APP_VERSION,
        docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
        redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
        openapi_url="/openapi.json" if settings.ENVIRONMENT != "production" else None,
        lifespan=lifespan,
    )

    # ==================== MIDDLEWARE ====================
    # Order matters: first added = outermost (executes first on request, last on response)

    # 1. CORS - Must be first to handle preflight requests
    setup_cors(app)

    # 2. Compression - Compress responses
    setup_compression(app)

    # 3. Logging - Log all requests/responses
    app.add_middleware(LoggingMiddleware)

    # 4. Global exception handler
    app.add_exception_handler(Exception, global_exception_handler)

    # ==================== ROUTERS ====================
    # Mount REST API router
    app.include_router(api_router, prefix="/api/v1")

    # ==================== WEBSOCKET ENDPOINTS ====================
    # Register all WebSocket routes (centralized)
    register_websocket_routes(app)
    logger.info("websocket_routes_registered")

    # ==================== ROOT ENDPOINTS ====================
    @app.get("/", tags=["Root"])
    async def root():
        """Root endpoint with API information."""
        return {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "status": "running",
            "docs": "/docs",
            "health": "/health",
        }

    @app.get("/ping", tags=["Root"])
    async def ping():
        """Simple ping endpoint for basic health checks."""
        return {"status": "pong"}

    return app


# Create the application instance
app = create_app()
