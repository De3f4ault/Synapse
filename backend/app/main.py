"""
SYNAPSE Backend - Application Entry Point & Lifecycle Orchestrator.

This module acts as the "Composition Root" for the FastAPI backend service.
It is the only module in the system with knowledge of all high-level subsystems
(Database, AI, Caching, Platform).

AUDIT TRAIL & ARCHITECTURAL INVARIANTS:
1.  **State Isolation**: Global state is minimized. Subsystems are initialized hierarchically
    within the `lifespan` context manager, ensuring strict dependency ordering.
2.  **Startup Sequence**:
    -   Level 0 (Critical Persistence): PostgreSQL Database. Failure here is fatal.
    -   Level 1 (Optimization/Search): Redis, Qdrant. Failure is logged but non-fatal (degraded mode).
    -   Level 2 (Domain Logic): Platform Modules. Registers business logic capabilities.
    -   Level 3 (AI Services): Heavy AI models, Agents, RAG pipeline.
3.  **Middleware Pipeline**: Constructed in `create_app`. The order is fixed to ensure
    security headers (CORS) are applied *before* any request processing or logging occurs.
4.  **Side Effects**: This module leverages Python's import system to trigger
    registration decorators (e.g., `@register_module` in platform components).
"""

from contextlib import asynccontextmanager
from typing import Coroutine, Any

from fastapi import FastAPI

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


# -----------------------------------------------------------------------------
# STARTUP HELPERS
# -----------------------------------------------------------------------------


async def _run_startup_step(
    name: str, coro: Coroutine[Any, Any, Any], critical: bool = False
) -> bool:
    """
    Subsystem Initialization Wrapper.

    Encapsulates the execution of a subsystem's startup coroutine with an
    error-handling boundary.

    AUDIT LOGIC:
    - **Happy Path**: Awaits `coro`. Returns `True`.
    - **Failure (Critical=True)**: Any `Exception` is caught, logged with `level=ERROR`,
      and re-raised. This forces the ASGI server (Uvicorn) to crash instantly,
      preventing a "zombie" process with broken core dependencies.
    - **Failure (Critical=False)**: Any `Exception` is caught, logged with `level=WARNING`,
      and suppressed. Returns `False`. The application continues in a "Partially Ready" state.

    Args:
        name: Subsystem identifier used in log structure (e.g., "postgresql").
        coro: The async task to execute (e.g., `init_db()`).
        critical: Determines the failure strategy (Crash vs. Continue).
    """
    try:
        await coro
        return True
    except Exception as e:
        if critical:
            logger.error(f"{name}_failed", error=str(e))
            raise
        else:
            logger.warning(f"{name}_failed", error=str(e))
            return False


async def _init_database() -> None:
    """
    PostgreSQL Connection Pool Initialization.

    **Target**: `app.db.session.init_db`
    **Action**: Creates the asynchronous SQLAlchemy engine (`AsyncEngine`) and
    configures the `sessionmaker` factory.
    **IO Operation**: May trigger an initial TCP connection handshake to verify
    credentials and database reachability depending on driver configuration (lazy vs eager).
    **Criticality**: This component is the foundation of the persistence layer.
    """
    await init_db()
    logger.info("postgresql_initialized")


async def _init_cache() -> None:
    """
    PostgreSQL Cache Initialization.

    **Target**: `app.services.cache.client.init_cache`
    **Side Effect**: Creates a PgCacheClient singleton backed by the
    `kv_store` UNLOGGED table (created in _init_sql_functions).
    **Dependency**: Required for Rate Limiting, Auth Blacklist, and KV caching.
    """
    from app.services.cache.client import init_cache

    await init_cache()
    logger.info("pg_cache_initialized")


async def _init_event_bus() -> None:
    """
    Durable Event Bus Initialization.

    **Target**: `app.services.cache.event_bus.init_event_bus`
    **Action**: Opens a dedicated asyncpg connection directly to PostgreSQL
    (bypassing PgBouncer) for LISTEN/NOTIFY. Starts the consumer loop.
    **Side Effect**: Creates the global PgEventBus singleton.
    **Dependency**: Required for real-time WebSocket broadcasts.
    """
    from app.services.cache.event_bus import init_event_bus
    from app.db.session import AsyncSessionLocal

    listen_dsn = settings.PG_LISTEN_DSN
    if not listen_dsn:
        logger.warning("event_bus_skipped", reason="PG_LISTEN_DSN not configured")
        return

    await init_event_bus(
        listen_dsn=listen_dsn,
        session_factory=AsyncSessionLocal,
        schema=settings.DATABASE_SCHEMA,
    )
    logger.info("pg_event_bus_initialized")


async def _init_vector_store() -> None:
    """
    Vector Database (Qdrant) Client Handshake.

    **Target**: `app.core.ai.rag.vector_store.qdrant.client`
    **Action**: Instantiates the Qdrant client and executes a lightweight read operation
    (`get_collections()`) to validate the HTTP/gRPC channel.
    **Purpose**: Ensures semantic search capabilities are available before accepting queries.
    """
    from app.core.ai.rag.vector_store.qdrant.client import get_qdrant_client

    qdrant_client = get_qdrant_client()
    # AUDIT: Active network check. Verifies auth token and endpoint availability.
    qdrant_client.get_client().get_collections()
    logger.info("qdrant_initialized")


async def _init_sql_functions() -> None:
    """
    Database Schema augmentation.

    **Target**: `app.db.sql_loader`
    **Action**: Executes raw SQL DDL/DML scripts found in `app/sql/`.
    **Content**:
    - Custom PostgreSQL functions (e.g., for spaced repetition math).
    - Materialized Views (e.g., `user_dashboard_stats` for analytics aggregation).
    **Idempotency**: Scripts must be written to be re-runnable (e.g., `CREATE OR REPLACE`).
    """
    from app.db import load_sql_functions

    await load_sql_functions()
    logger.info("sql_functions_loaded")


async def _init_platform() -> None:
    """
    Domain Module Registry Population.

    **Target**: `app.platform.init_platform`
    **Mechanism**: Performs side-effect imports of `app.modules.*`.
    **Result**: Decorators in those modules (e.g. `@register_module`) execute,
    populating the global `ModuleRegistry` dict.
    **Modules Loaded**:
    - `notes`: Markdown/BlockNote storage logic.
    - `documents`: File upload/parsing.
    - `flashcards`: Spaced repetition items.
    - `quizzes`: Generated assessment logic.
    """
    from app.platform import init_platform

    init_platform()
    logger.info("platform_initialized", modules=["notes", "documents", "flashcards", "quizzes"])


async def _init_agents() -> None:
    """
    AI Agent Factory Configuration.

    **Target**: `app.core.ai.agents.factory`
    **Action**: Registers class references (Types) into the `AgentFactory` lookup table.
    **Details**:
    - `tutor`: Socratic method teaching agent.
    - `document`: RAG-specialized analysis agent.
    - `quiz`: Assessment generator.
    - `general`: Conversational router.
    **Note**: Does NOT instantiate the agents themselves; only registers their *definitions*.
    """
    from app.core.ai.agents.factory import get_agent_factory
    from app.core.ai.agents.implementations import (
        TutorAgent,
        DocumentAgent,
        QuizAgent,
        GeneralAssistantAgent,
    )

    factory = get_agent_factory()

    factory.register_agent_class("tutor", TutorAgent)
    factory.register_agent_class("document", DocumentAgent)
    factory.register_agent_class("quiz", QuizAgent)
    factory.register_agent_class("general", GeneralAssistantAgent)

    logger.info("agents_registered", agents=["tutor", "document", "quiz", "general"])


async def _init_orchestrator() -> None:
    """
    AI Intent Orchestrator Bootstrapping.

    **Target**: `app.core.ai.orchestrator`
    **Action**:
    1. Instantiates `AgentOrchestrator` singleton.
    2. Loads the intent classification model (zero-shot or fine-tuned).
    3. Verifies registered Tools (from `app.core.ai.tools`).
    **Performance**: May incur significant latency due to model loading.
    """
    from app.core.ai.orchestrator import get_orchestrator

    orchestrator = get_orchestrator()
    await orchestrator.initialize()
    logger.info("orchestrator_initialized")


async def _init_rag(app: FastAPI) -> None:
    """
    RAG Service Injection.

    **Target**: `app.services.rag`
    **State Mutation**: `app.state.rag_service`
    **Action**: Instantiates the RAG pipeline (Retrieval -> Reranking -> Generation)
    and attaches it to the FastAPI application state.
    **Usage**: Route handlers access this via `request.app.state.rag_service`.
    **Dependencies**: Requires Vector Store (`_init_vector_store`) to be ready.
    """
    from app.services.rag import get_rag_service

    rag_service = get_rag_service()
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


async def _init_embedding_hooks() -> None:
    """
    ORM Event Listener Registration.

    **Target**: `app.services.background.embedding_hooks`
    **Mechanism**: Attaches SQLAlchemy event listeners (`after_insert`, `after_update`)
    to the `Note` and `Flashcard` models.
    **Behavior**:
    - Insert/Update in DB -> Triggers async Celery/Background task -> Calculates Embedding -> Upserts to Qdrant.
    **Consistency**: Ensures eventual consistency between Relational DB (PostgreSQL) and Vector Search Index (Qdrant).
    """
    from app.services.background.embedding_hooks import setup_embedding_hooks

    setup_embedding_hooks()
    logger.info(
        "embedding_hooks_initialized",
        description="Note/Flashcard create/update will auto-trigger embedding generation",
    )


# -----------------------------------------------------------------------------
# SHUTDOWN HELPERS
# -----------------------------------------------------------------------------


async def _shutdown_application() -> None:
    """
    Resource Teardown Sequence.

    **Strategy**: Reverse dependency order (High-level -> Low-level).
    1.  **WebSocket Manager**: Cancel the background `cleanup_stale_connections` asyncio task.
        Prevents concurrency errors during loop closure.
    2.  **Database**: Dispose of the SQLAlchemy connection pool. Closes all active TCP sockets to PG.
    3.  **Redis**: Close the connection pool.
    """
    logger.info("application_shutting_down")

    # 1. Stop WebSocket cleanup task
    try:
        from app.api.websockets.core.manager import manager

        manager.stop_cleanup_task()
        logger.info("websocket_cleanup_stopped")
    except Exception:
        # Swallow errors here; shutdown priority is resource release, not debugging.
        pass

    # 2. Close database connections
    try:
        await close_db()
        logger.info("postgresql_closed")
    except Exception as e:
        logger.error("postgresql_close_failed", error=str(e))

    # 3. Close cache
    try:
        from app.services.cache.client import close_cache

        await close_cache()
        logger.info("pg_cache_closed")
    except Exception:
        pass

    # 4. Close event bus
    try:
        from app.services.cache.event_bus import close_event_bus

        await close_event_bus()
        logger.info("pg_event_bus_closed")
    except Exception:
        pass

    logger.info("application_shutdown_complete")


# -----------------------------------------------------------------------------
# LIFESPAN MANAGER
# -----------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    ASGI Lifespan Context Manager.

    This generator defines the exact sequence of operations for Application Startup
    and Application Shutdown.

    **Flow Control**:
    1.  **Pre-Yield (Start)**: Executed when Uvicorn receives the process start signal.
        If an Exception escapes here, the server process terminates.
    2.  **Yield**: Control is passed to the Request/Response loop. The application is "Live".
    3.  **Post-Yield (Stop)**: Executed when Uvicorn receives SIGTERM/SIGINT.

    **Dependency Graph Enforced Here**:
    - Database MUST be ready before Platforms.
    - Platforms MUST be ready before Agents.
    - Vector Store MUST be ready before RAG.
    """
    logger.info("application_starting", app_name=settings.APP_NAME)

    # ==================== STARTUP PHASE ====================

    # BLOCK 1: HARD INFRASTRUCTURE (Critical)
    # The application cannot function without the primary data store.
    await _run_startup_step("postgresql", _init_database(), critical=True)

    # BLOCK 2: SOFT INFRASTRUCTURE (Degradable)
    # SQL tables/functions must load before cache (tables need to exist).
    await _run_startup_step("sql_functions", _init_sql_functions(), critical=False)

    # Cache, event bus, and vector store are independent — run concurrently
    import asyncio

    await asyncio.gather(
        _run_startup_step("cache", _init_cache(), critical=False),
        _run_startup_step("event_bus", _init_event_bus(), critical=False),
        _run_startup_step("qdrant", _init_vector_store(), critical=False),
    )

    # BLOCK 3: DOMAIN LOGIC
    # Registering the business rules and entities.
    await _run_startup_step("platform", _init_platform(), critical=False)

    # BLOCK 4: AI SERVICES
    # High-level intelligent services composed of the blocks above.
    await _run_startup_step("agents", _init_agents(), critical=False)
    await _run_startup_step("orchestrator", _init_orchestrator(), critical=False)
    await _run_startup_step("rag", _init_rag(app), critical=False)
    await _run_startup_step("embedding_hooks", _init_embedding_hooks(), critical=False)

    logger.info(
        "application_started",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
    )

    yield  # <-- APPLICATION RUNTIME -->

    # ==================== SHUTDOWN PHASE ====================
    # Graceful teardown of resources.
    await _shutdown_application()


# -----------------------------------------------------------------------------
# APPLICATION FACTORY
# -----------------------------------------------------------------------------


def create_app() -> FastAPI:
    """
    FastAPI Instance Factory.

    Constructs the ASGI application object with a strictly ordered middleware stack.

    **Middleware Pipeline (Outer -> Inner)**:
    1.  `CORSMiddleware`:
        -   **Role**: Security/Browser Policy.
        -   **Action**: Intercepts OPTIONS requests immediately. Adds Access-Control-Allow-* headers.
        -   **Why First?**: Browsers reject requests immediately if preflight fails. No app logic should run.

    2.  `GZipMiddleware` (via setup_compression):
        -   **Role**: Performance.
        -   **Action**: Compresses response body if `Accept-Encoding: gzip` is present.
        -   **Why Second?**: Must compress the *entire* response generated by inner layers.

    3.  `LoggingMiddleware`:
        -   **Role**: Observability.
        -   **Action**: Generates structured logs (JSON) for Request ID, Latency, Status Code.
        -   **Why Third?**: Captures the "real" status code from the app logic, but sits *inside* CORS/Compression
            so it logs the application's intent.

    4.  `GlobalExceptionHandler`:
        -   **Role**: Fault Tolerance.
        -   **Action**: Catches unhandled logic errors (500s) and returns safe, sanitized JSON responses.
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

    # MIddleware Stack Construction
    setup_cors(app)  # Layer 1: Security Boundary
    setup_compression(app)  # Layer 2: Transport Optimization
    app.add_middleware(LoggingMiddleware)  # Layer 3: Observability

    # Exception Handling Boundary
    app.add_exception_handler(Exception, global_exception_handler)

    # Route Mounting
    # - /api/v1: All RESTful business logic
    app.include_router(api_router, prefix="/api/v1")

    # WebSocket Registration
    # - /ws: Real-time bi-directional channels
    register_websocket_routes(app)
    logger.info("websocket_routes_registered")

    # Root Level Observability Endpoints
    @app.get("/", tags=["Health"])
    async def root():
        """Static metadata endpoint for system identification."""
        return {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "status": "running",
            "docs": "/docs",
            "health": "/health",
        }

    @app.get("/ping", tags=["Health"])
    async def ping():
        """
        Liveness Probe.
        Returns 200 OK immediately. Used by load balancers to detect frozen processes.
        Does NOT touch the database.
        """
        return {"status": "pong"}

    return app


# -----------------------------------------------------------------------------
# APPLICATION INSTANCE
# -----------------------------------------------------------------------------


# The ASGI callable.
# This variable `app` is what the server (uvicorn) looks for by default.
app = create_app()
