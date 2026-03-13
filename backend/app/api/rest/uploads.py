"""
BlockSuite asset upload endpoint.

Handles image/file uploads for BlockSuite editor.
Assets stored in data/blocksuite/{user_id}/ with UUID filenames.

VAULT RULE: Returns URL strings. JSONB stores URLs, not Base64.
"""

import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from app.schemas.common import MessageResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.core.config import settings
from app.schemas.upload import UploadResponse

router = APIRouter()

# Configuration
BLOCKSUITE_UPLOAD_DIR = os.path.join(
    settings.DATA_DIR if hasattr(settings, "DATA_DIR") else "data", "blocksuite"
)
MAX_ASSET_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".svg",  # Images
    ".mp4",
    ".webm",  # Video
    ".mp3",
    ".wav",
    ".ogg",  # Audio
    ".pdf",  # Documents
}




# ============================================================================
# Helper Functions
# ============================================================================


def get_file_extension(filename: str) -> str:
    """Extract file extension."""
    return os.path.splitext(filename)[1].lower()


def validate_asset(file: UploadFile) -> tuple[bool, Optional[str]]:
    """
    Validate uploaded asset.

    Returns:
        (is_valid, error_message)
    """
    if not file.filename:
        return False, "No filename provided"

    ext = get_file_extension(file.filename)
    if ext not in ALLOWED_EXTENSIONS:
        return (
            False,
            f"File type {ext} not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    return True, None


def get_user_upload_dir(user_id: int) -> str:
    """Get or create user's upload directory."""
    user_dir = os.path.join(BLOCKSUITE_UPLOAD_DIR, str(user_id))
    os.makedirs(user_dir, exist_ok=True)
    return user_dir


# ============================================================================
# Endpoints
# ============================================================================


@router.post(
    "",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload BlockSuite asset",
    description="Upload an image or file for use in BlockSuite editor. Returns URL for JSONB storage.",
)
async def upload_blocksuite_asset(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload asset for BlockSuite editor.

    Assets are stored in data/blocksuite/{user_id}/{uuid}.{ext}
    Returns a URL that can be stored in the JSONB snapshot.
    """
    # Validate file
    is_valid, error_message = validate_asset(file)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message,
        )

    # Read file content
    content = await file.read()
    file_size = len(content)

    # Check size limit
    if file_size > MAX_ASSET_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_ASSET_SIZE // (1024 * 1024)}MB",
        )

    # Generate unique filename
    ext = get_file_extension(file.filename or "file")
    unique_id = str(uuid.uuid4())
    unique_filename = f"{unique_id}{ext}"

    # Save file
    user_dir = get_user_upload_dir(current_user.id)
    filepath = os.path.join(user_dir, unique_filename)

    with open(filepath, "wb") as f:
        f.write(content)

    # Generate URL (relative path for API serving)
    url = f"/api/uploads/blocksuite/{current_user.id}/{unique_filename}"

    return UploadResponse(
        url=url,
        filename=file.filename or "file",
        size=file_size,
    )


@router.get(
    "/{user_id}/{filename}",
    summary="Retrieve BlockSuite asset",
    description="Serve an uploaded BlockSuite asset by user ID and filename.",
)
async def get_blocksuite_asset(
    user_id: int,
    filename: str,
):
    """
    Serve uploaded asset.

    No authentication required for asset serving (URLs are unguessable UUIDs).
    """
    # Validate filename to prevent path traversal
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename",
        )

    filepath = os.path.join(BLOCKSUITE_UPLOAD_DIR, str(user_id), filename)

    if not os.path.exists(filepath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found",
        )

    return FileResponse(
        filepath,
        headers={"Cache-Control": "public, max-age=31536000"},  # Cache for 1 year
    )


@router.delete(
    "/{asset_id}",
    response_model=MessageResponse,
    summary="Delete BlockSuite asset",
    description="Delete an uploaded asset by its UUID.",
)
async def delete_blocksuite_asset(
    asset_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete an uploaded asset.

    Only the owning user can delete their assets.
    """
    # Find and delete the file
    user_dir = get_user_upload_dir(current_user.id)

    # Search for file with this UUID prefix
    for filename in os.listdir(user_dir):
        if filename.startswith(asset_id):
            filepath = os.path.join(user_dir, filename)
            os.remove(filepath)
            return MessageResponse(message="Asset deleted successfully")

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Asset not found",
    )
