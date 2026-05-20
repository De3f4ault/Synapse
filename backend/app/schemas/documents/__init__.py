"""
documents/ — Document management schemas.

    from app.schemas.documents import DocumentResponse, FolderResponse, TagCreate
"""

from app.schemas.documents.document import (
    DocumentResponse,
    DocumentUpdateRequest,
    DocumentChunkResponse,
    ProcessingStatusResponse,
    ConflictType,
    DuplicateConflictResponse,
    MoveDocumentRequest,
    SummaryResponse,
    DocumentAnalysisRequest,
    DocumentAnalysisResponse,
    StorageBreakdownItem,
    RecentActivityItem,
    DocumentStatisticsResponse,
)
from app.schemas.documents.metadata import DocumentMetadataResponse
from app.schemas.documents.notes import DocumentNoteCreate, DocumentNoteResponse
from app.schemas.documents.types import (
    DocumentTypeCreate,
    DocumentTypeUpdate,
    DocumentTypeResponse,
)
from app.schemas.documents.folders import (
    FolderSettingsSchema,
    FolderResponse,
    FolderTreeNode,
    CreateFolderRequest,
    UpdateFolderRequest,
    MoveFolderRequest,
    DeleteStrategy,
)
from app.schemas.documents.permissions import (
    PermissionEntry,
    PermissionsSet,
    DocumentPermissionResponse,
    SetPermissionsRequest,
    ShareLinkCreate,
    ShareLinkResponse,
)
from app.schemas.documents.saved_views import (
    FilterRuleCreate,
    FilterRuleResponse,
    SavedViewCreate,
    SavedViewUpdate,
    SavedViewResponse,
)
from app.schemas.documents.bulk_edit import BulkEditRequest
from app.schemas.documents.correspondent import (
    CorrespondentCreate,
    CorrespondentUpdate,
    CorrespondentResponse,
)
from app.schemas.documents.storage_path import (
    StoragePathCreate,
    StoragePathUpdate,
    StoragePathResponse,
)
from app.schemas.documents.tags import TagCreate, TagUpdate, TagResponse

__all__ = [
    # document.py
    "DocumentResponse",
    "DocumentUpdateRequest",
    "DocumentChunkResponse",
    "ProcessingStatusResponse",
    "ConflictType",
    "DuplicateConflictResponse",
    "MoveDocumentRequest",
    "SummaryResponse",
    "DocumentAnalysisRequest",
    "DocumentAnalysisResponse",
    "StorageBreakdownItem",
    "RecentActivityItem",
    "DocumentStatisticsResponse",
    # metadata.py
    "DocumentMetadataResponse",
    # notes.py
    "DocumentNoteCreate",
    "DocumentNoteResponse",
    # types.py
    "DocumentTypeCreate",
    "DocumentTypeUpdate",
    "DocumentTypeResponse",
    # folders.py
    "FolderSettingsSchema",
    "FolderResponse",
    "FolderTreeNode",
    "CreateFolderRequest",
    "UpdateFolderRequest",
    "MoveFolderRequest",
    "DeleteStrategy",
    # permissions.py
    "PermissionEntry",
    "PermissionsSet",
    "DocumentPermissionResponse",
    "SetPermissionsRequest",
    "ShareLinkCreate",
    "ShareLinkResponse",
    # saved_views.py
    "FilterRuleCreate",
    "FilterRuleResponse",
    "SavedViewCreate",
    "SavedViewUpdate",
    "SavedViewResponse",
    # bulk_edit.py
    "BulkEditRequest",
    # correspondent.py
    "CorrespondentCreate",
    "CorrespondentUpdate",
    "CorrespondentResponse",
    # storage_path.py
    "StoragePathCreate",
    "StoragePathUpdate",
    "StoragePathResponse",
    # tags.py
    "TagCreate",
    "TagUpdate",
    "TagResponse",
]
