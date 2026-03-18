"""
SavedView CRUD API + Execute endpoint.

Manages saved views (named filter presets) and executes them
against the DMSSearchService.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.saved_view import SavedView, SavedViewFilterRule
from app.schemas.saved_view import (
    SavedViewCreate,
    SavedViewUpdate,
    SavedViewResponse,
)
from app.services.search.dms_search import DMSSearchService
from app.services.search.saved_view_executor import SavedViewExecutor

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_view_or_404(
    view_id: int, user: User, db: AsyncSession,
) -> SavedView:
    result = await db.execute(
        select(SavedView).where(
            and_(SavedView.id == view_id, SavedView.user_id == user.id)
        )
    )
    view = result.scalar_one_or_none()
    if not view:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Saved view not found"
        )
    return view


# ---------------------------------------------------------------------------
# CRUD Endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=List[SavedViewResponse])
async def list_saved_views(
    show_on_dashboard: Optional[bool] = Query(None, description="Filter dashboard views"),
    show_in_sidebar: Optional[bool] = Query(None, description="Filter sidebar views"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all saved views for the current user."""
    stmt = select(SavedView).where(SavedView.user_id == current_user.id)

    if show_on_dashboard is not None:
        stmt = stmt.where(SavedView.show_on_dashboard == show_on_dashboard)
    if show_in_sidebar is not None:
        stmt = stmt.where(SavedView.show_in_sidebar == show_in_sidebar)

    stmt = stmt.order_by(SavedView.name)

    result = await db.execute(stmt)
    return [SavedViewResponse.model_validate(v) for v in result.scalars().all()]


@router.post("", response_model=SavedViewResponse, status_code=status.HTTP_201_CREATED)
async def create_saved_view(
    data: SavedViewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a saved view with filter rules."""
    view = SavedView(
        name=data.name,
        sort_field=data.sort_field,
        sort_reverse=data.sort_reverse,
        show_on_dashboard=data.show_on_dashboard,
        show_in_sidebar=data.show_in_sidebar,
        page_size=data.page_size,
        user_id=current_user.id,
    )

    # Add filter rules
    for rule_data in data.filter_rules:
        rule = SavedViewFilterRule(
            rule_type=rule_data.rule_type,
            value=rule_data.value,
        )
        view.filter_rules.append(rule)

    db.add(view)
    await db.commit()
    await db.refresh(view)

    logger.info("Created saved view '%s' (id=%d) for user %d", view.name, view.id, current_user.id)
    return SavedViewResponse.model_validate(view)


@router.get("/{view_id}", response_model=SavedViewResponse)
async def get_saved_view(
    view_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific saved view with filter rules."""
    view = await _get_view_or_404(view_id, current_user, db)
    return SavedViewResponse.model_validate(view)


@router.put("/{view_id}", response_model=SavedViewResponse)
async def update_saved_view(
    view_id: int,
    data: SavedViewUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a saved view (partial). Filter rules are fully replaced if provided."""
    view = await _get_view_or_404(view_id, current_user, db)

    update_data = data.model_dump(exclude_unset=True)

    # Handle filter_rules separately (full replacement)
    new_rules = update_data.pop("filter_rules", None)

    for field, value in update_data.items():
        setattr(view, field, value)

    if new_rules is not None:
        # Clear existing rules and replace
        view.filter_rules.clear()
        for rule_data in new_rules:
            rule = SavedViewFilterRule(
                rule_type=rule_data["rule_type"],
                value=rule_data.get("value"),
            )
            view.filter_rules.append(rule)

    await db.commit()
    await db.refresh(view)
    return SavedViewResponse.model_validate(view)


@router.delete("/{view_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saved_view(
    view_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a saved view (cascades filter rules)."""
    view = await _get_view_or_404(view_id, current_user, db)
    await db.delete(view)
    await db.commit()
    logger.info("Deleted saved view '%s' (id=%d)", view.name, view.id)


# ---------------------------------------------------------------------------
# Execute Endpoint
# ---------------------------------------------------------------------------

@router.get("/{view_id}/execute")
async def execute_saved_view(
    view_id: int,
    page: int = Query(1, ge=1, description="Page number"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Execute a saved view's filters and return search results."""
    view = await _get_view_or_404(view_id, current_user, db)

    executor = SavedViewExecutor(view)
    params = executor.to_search_params()
    params["page"] = page

    service = DMSSearchService(db)
    return await service.search(user_id=current_user.id, **params)
