"""
# =============================================================================
# DEPRECATED: Legacy Chat Routes
# =============================================================================
#
# This file has been fully migrated to the Chat module:
#   - app/modules/chat/api.py       (routes)
#   - app/modules/chat/service.py   (business logic)
#   - app/modules/chat/internal/    (models, repository)
#
# This stub is kept for backwards compatibility with imports only.
# DO NOT ADD NEW CODE HERE.
#
# Migrated on: 2026-02-02
# Migration task: Chat Module Pilot (Phase 0)
# =============================================================================
"""

from fastapi import APIRouter

# Empty router for backwards compatibility
router = APIRouter()

# Re-export for any legacy imports
__all__ = ["router"]
