"""
Main REST API router.

Aggregates all REST API endpoint routers into a single router
that can be included in the FastAPI application.

WebSocket endpoint registration
"""

from fastapi import APIRouter

from . import (
    auth,
    users,
    decks,
    flashcards,
    notes,
    documents,
    quizzes,
    chat,
    study,
    search,
    analytics,
    webhooks,
    health,
    rag,  # RAG API endpoints
    links,  # Knowledge graph links
    entities,  # Platform entity resolution
    platform_graph,  # Platform graph intelligence
    actions,  # Platform action execution
)

# Import WebSocket endpoint
from app.api.websockets.dashboard import dashboard_websocket_endpoint

# Create main API router
api_router = APIRouter()

# ==================== REST ENDPOINTS ====================

# Include all endpoint routers with their prefixes and tags
api_router.include_router(health.router, prefix="/health", tags=["Health"])

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

api_router.include_router(users.router, prefix="/users", tags=["Users"])

api_router.include_router(decks.router, prefix="/decks", tags=["Flashcards"])

api_router.include_router(flashcards.router, prefix="/cards", tags=["Flashcards"])

api_router.include_router(notes.router, prefix="/notes", tags=["Notes"])

api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])

api_router.include_router(quizzes.router, prefix="/quizzes", tags=["Quizzes"])

api_router.include_router(chat.router, prefix="/chat", tags=["Chat"])

api_router.include_router(study.router, prefix="/study", tags=["Study"])

api_router.include_router(search.router, prefix="/search", tags=["Search"])

api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])

api_router.include_router(webhooks.router, prefix="/webhooks", tags=["Webhooks"])

api_router.include_router(rag.router, prefix="/rag", tags=["RAG"])

api_router.include_router(links.router, prefix="/links", tags=["Links"])

# ==================== PLATFORM ENDPOINTS ====================

api_router.include_router(entities.router, prefix="/entities", tags=["Platform"])

api_router.include_router(platform_graph.router, prefix="/graph", tags=["Platform"])

api_router.include_router(actions.router, prefix="/actions", tags=["Platform"])

# ==================== WEBSOCKET ENDPOINTS ====================
# WebSocket endpoints must be registered outside the /api/v1 prefix
# They are registered in main.py to avoid prefix conflicts

# Export the websocket endpoint for registration in main.py
__all__ = ["api_router", "dashboard_websocket_endpoint"]
