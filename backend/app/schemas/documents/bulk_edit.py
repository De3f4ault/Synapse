"""
Bulk edit schemas — request/response contracts.

Matches Paperless-ngx bulk_edit.py dispatch pattern.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class BulkEditRequest(BaseModel):
    """Request body for bulk editing documents.

    Maps to Paperless-ngx bulk_edit operations:
    - set_correspondent (L41-58)
    - set_document_type (L82-96)
    - set_storage_path (L61-79)
    - add_tag / remove_tag / modify_tags (L99-202)
    - delete (L274-294)
    - set_permissions (L306-328)
    - rotate (L331-369)
    - merge (L372-455)
    - split (L458-519)
    - edit_pdf (L550-644)
    """

    documents: List[int] = Field(..., min_length=1, description="Document IDs to edit")
    method: str = Field(
        ...,
        description="Operation: set_correspondent | set_document_type | set_storage_path | "
                    "add_tag | remove_tag | modify_tags | delete | set_permissions | "
                    "rotate | merge | split | edit_pdf",
    )
    parameters: Dict[str, Any] = Field(
        default_factory=dict,
        description="Method-specific parameters",
    )
