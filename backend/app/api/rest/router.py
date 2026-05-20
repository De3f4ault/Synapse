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
    folders,
    quizzes,
    threads,
    branches,
    study,
    search,
    analytics,
    webhooks,
    health,
    rag,
    links,
    entities,
    platform_graph,
    actions,
    intelligence,
    feedback,
    notifications,
    uploads,
    collections,
    # DMS Classification & Search (Phase 4)
    correspondents,
    document_types,
    storage_paths,
    tags,
    saved_views,
    # DMS Workflows (Phase 5)
    workflows,
    # DMS Permissions & Sharing (Phase 6)
    shares,
    # DMS Background Tasks (Phase 8)
    tasks,
    # Admin Dashboard
    admin,
)

# Create main API router
api_router = APIRouter()

# ==================== REST ENDPOINTS ====================

# Include all endpoint routers with their prefixes and tags
api_router.include_router(health.router, prefix="/health", tags=["Health"])

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

api_router.include_router(users.router, prefix="/users", tags=["Users"])

api_router.include_router(decks.router, prefix="/decks", tags=["Flashcards"])

api_router.include_router(flashcards.router, prefix="/cards", tags=["Flashcards"])

# AI Card Designer (conversation-first card creation)
from app.api.rest import ai_design

api_router.include_router(ai_design.router, prefix="/ai/design", tags=["AI Card Designer"])

# Collections (deck folders) + analytics + CSV import
api_router.include_router(collections.router, prefix="/collections", tags=["Collections"])

api_router.include_router(notes.router, prefix="/notes", tags=["Notes"])

# Notes AI (SSE text-transform + Excalidraw diagram generation)
from app.api.rest import notes_ai

api_router.include_router(notes_ai.router, prefix="/notes/ai", tags=["Notes AI"])

# IMPORTANT: folders must be registered BEFORE documents to prevent
# /{document_id} pattern from catching /folders path
api_router.include_router(folders.router, prefix="/documents", tags=["Document Folders"])

api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])

# DMS Classification & Search (Phase 4)
api_router.include_router(correspondents.router, prefix="/correspondents", tags=["DMS"])
api_router.include_router(document_types.router, prefix="/document-types", tags=["DMS"])
api_router.include_router(storage_paths.router, prefix="/storage-paths", tags=["DMS"])
api_router.include_router(tags.router, prefix="/tags", tags=["DMS"])
api_router.include_router(saved_views.router, prefix="/saved-views", tags=["DMS"])

# DMS Workflows (Phase 5)
api_router.include_router(workflows.router, prefix="/workflows", tags=["DMS"])

# DMS Permissions & Sharing (Phase 6)
api_router.include_router(shares.router, tags=["Sharing"])

# DMS Background Tasks (Phase 8)
api_router.include_router(tasks.router, prefix="/tasks", tags=["DMS"])

api_router.include_router(quizzes.router, prefix="/quizzes", tags=["Quizzes"])

# Chat module (modular monolith - fully migrated)
from app.modules.chat import api as chat_module

api_router.include_router(chat_module.router, prefix="/chat", tags=["Chat"])

api_router.include_router(threads.router, prefix="/chat", tags=["Chat Threads"])

api_router.include_router(branches.router, prefix="/chat", tags=["Chat Branches"])

# Chat attachments (image/file uploads for chat messages)
from app.api.rest import chat_attachments

api_router.include_router(chat_attachments.router, prefix="/chat/attachments", tags=["Chat Attachments"])

# AI Streaming (Vercel AI SDK SSE endpoints)
from app.api.rest import ai_stream

api_router.include_router(ai_stream.router, prefix="/chat", tags=["Chat Streaming"])

api_router.include_router(study.router, prefix="/study", tags=["Study"])

api_router.include_router(search.router, prefix="/search", tags=["Search"])

api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])

api_router.include_router(webhooks.router, prefix="/webhooks", tags=["Webhooks"])

api_router.include_router(rag.router, prefix="/rag", tags=["RAG"])

api_router.include_router(links.router, prefix="/links", tags=["Links"])

# Artifacts module (modular monolith)
from app.modules.artifacts import artifacts_router

api_router.include_router(artifacts_router, prefix="/artifacts", tags=["Artifacts"])

# ==================== PLATFORM ENDPOINTS ====================

api_router.include_router(entities.router, prefix="/entities", tags=["Platform"])

api_router.include_router(platform_graph.router, prefix="/graph", tags=["Platform"])

api_router.include_router(actions.router, prefix="/actions", tags=["Platform"])
api_router.include_router(intelligence.router, prefix="/intelligence", tags=["Intelligence"])
api_router.include_router(feedback.router, prefix="/feedback", tags=["Feedback"])

# ==================== NOTIFICATIONS ====================

api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])

# ==================== BLOCKSUITE ASSETS ====================

api_router.include_router(uploads.router, prefix="/uploads/blocksuite", tags=["BlockSuite"])

# ==================== ADMIN DASHBOARD ====================
# All routes require is_admin = True (enforced inside admin.py via require_admin dependency)

api_router.include_router(admin.router, prefix="/admin", tags=["Admin Dashboard"])


__all__ = ["api_router"]
