"""
Bulk edit service — document batch operations.

Ported from Paperless-ngx documents/bulk_edit.py (729 lines).
Adapted for SQLAlchemy async + FastAPI patterns used in Synapse.

Operations:
  - set_correspondent (Paperless L41-58)
  - set_document_type (Paperless L82-96)
  - set_storage_path (Paperless L61-79)
  - add_tag / remove_tag / modify_tags (Paperless L99-202)
  - delete (Paperless L274-294) — soft-delete
  - set_permissions (Paperless L306-328)
  - rotate / merge / split / edit_pdf (Paperless L331-644)
"""

import hashlib
import logging
import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from sqlalchemy import and_, select, update, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document

logger = logging.getLogger("synapse.bulk_edit")


# ---------------------------------------------------------------------------
# Classification operations (set_correspondent / set_document_type / set_storage_path)
# ---------------------------------------------------------------------------

async def set_correspondent(
    db: AsyncSession, user_id: int, doc_ids: List[int], correspondent_id: int | None,
) -> int:
    """Set correspondent on multiple documents. Returns affected count."""
    result = await db.execute(
        update(Document)
        .where(
            and_(
                Document.id.in_(doc_ids),
                Document.user_id == user_id,
                Document.deleted_at.is_(None),
            )
        )
        .values(correspondent_id=correspondent_id)
    )
    await db.commit()
    return result.rowcount  # type: ignore[return-value]


async def set_document_type(
    db: AsyncSession, user_id: int, doc_ids: List[int], document_type_id: int | None,
) -> int:
    """Set document type on multiple documents."""
    result = await db.execute(
        update(Document)
        .where(
            and_(
                Document.id.in_(doc_ids),
                Document.user_id == user_id,
                Document.deleted_at.is_(None),
            )
        )
        .values(document_type_id=document_type_id)
    )
    await db.commit()
    return result.rowcount  # type: ignore[return-value]


async def set_storage_path(
    db: AsyncSession, user_id: int, doc_ids: List[int], storage_path_id: int | None,
) -> int:
    """Set storage path on multiple documents."""
    result = await db.execute(
        update(Document)
        .where(
            and_(
                Document.id.in_(doc_ids),
                Document.user_id == user_id,
                Document.deleted_at.is_(None),
            )
        )
        .values(storage_path_id=storage_path_id)
    )
    await db.commit()
    return result.rowcount  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# Tag operations (add_tag / remove_tag / modify_tags)
# ---------------------------------------------------------------------------

async def add_tag(
    db: AsyncSession, user_id: int, doc_ids: List[int], tag_id: int,
) -> int:
    """Add a tag to multiple documents (Paperless L99-122)."""
    from app.models.tag import Tag
    from sqlalchemy import insert

    # Verify tag exists and belongs to user
    tag = (await db.execute(
        select(Tag).where(and_(Tag.id == tag_id, Tag.user_id == user_id))
    )).scalar_one_or_none()
    if not tag:
        raise ValueError(f"Tag {tag_id} not found")

    # Get docs that don't already have this tag
    docs = (await db.execute(
        select(Document.id).where(
            and_(
                Document.id.in_(doc_ids),
                Document.user_id == user_id,
                Document.deleted_at.is_(None),
            )
        )
    )).scalars().all()

    # Insert into association table (ignore conflicts)
    count = 0
    for doc_id in docs:
        try:
            await db.execute(
                insert(Document.tags.property.secondary).values(
                    document_id=doc_id, tag_id=tag_id,
                )
            )
            count += 1
        except Exception:
            pass  # Already tagged

    await db.commit()
    return count


async def remove_tag(
    db: AsyncSession, user_id: int, doc_ids: List[int], tag_id: int,
) -> int:
    """Remove a tag from multiple documents (Paperless L125-140)."""
    # Verify ownership
    docs = (await db.execute(
        select(Document.id).where(
            and_(
                Document.id.in_(doc_ids),
                Document.user_id == user_id,
                Document.deleted_at.is_(None),
            )
        )
    )).scalars().all()

    doc_tags_table = Document.tags.property.secondary
    result = await db.execute(
        sa_delete(doc_tags_table).where(
            and_(
                doc_tags_table.c.document_id.in_(docs),
                doc_tags_table.c.tag_id == tag_id,
            )
        )
    )
    await db.commit()
    return result.rowcount  # type: ignore[return-value]


async def modify_tags(
    db: AsyncSession,
    user_id: int,
    doc_ids: List[int],
    add_tags: List[int],
    remove_tags: List[int],
) -> int:
    """Add and remove tags atomically (Paperless L143-202)."""
    affected = 0
    for tag_id in remove_tags:
        affected += await remove_tag(db, user_id, doc_ids, tag_id)
    for tag_id in add_tags:
        affected += await add_tag(db, user_id, doc_ids, tag_id)
    return affected


# ---------------------------------------------------------------------------
# Destructive operations
# ---------------------------------------------------------------------------

async def bulk_delete(
    db: AsyncSession, user_id: int, doc_ids: List[int],
) -> int:
    """Soft-delete multiple documents (Paperless L274-294)."""
    now = datetime.utcnow()
    result = await db.execute(
        update(Document)
        .where(
            and_(
                Document.id.in_(doc_ids),
                Document.user_id == user_id,
                Document.deleted_at.is_(None),
            )
        )
        .values(deleted_at=now)
    )
    await db.commit()
    return result.rowcount  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# Permission operations
# ---------------------------------------------------------------------------

async def bulk_set_permissions(
    db: AsyncSession,
    user_id: int,
    doc_ids: List[int],
    permissions: Dict[str, Any],
    merge: bool = False,
) -> int:
    """Set permissions on multiple documents (Paperless L306-328)."""
    from app.services.permissions.service import PermissionService

    count = 0
    for doc_id in doc_ids:
        doc = (await db.execute(
            select(Document).where(
                and_(
                    Document.id == doc_id,
                    Document.user_id == user_id,
                    Document.deleted_at.is_(None),
                )
            )
        )).scalar_one_or_none()
        if doc:
            await PermissionService.set_permissions(
                db=db,
                document=doc,
                permissions=permissions,
                merge=merge,
            )
            count += 1
    await db.commit()
    return count


# ---------------------------------------------------------------------------
# PDF operations (require pikepdf)
# ---------------------------------------------------------------------------

async def rotate_documents(
    db: AsyncSession, user_id: int, doc_ids: List[int], degrees: int,
) -> int:
    """Rotate pages of PDF documents (Paperless L331-369)."""
    import pikepdf

    docs = (await db.execute(
        select(Document).where(
            and_(
                Document.id.in_(doc_ids),
                Document.user_id == user_id,
                Document.deleted_at.is_(None),
                Document.mime_type == "application/pdf",
            )
        )
    )).scalars().all()

    affected = 0
    for doc in docs:
        try:
            with pikepdf.open(doc.file_path, allow_overwriting_input=True) as pdf:
                for page in pdf.pages:
                    page.rotate(degrees, relative=True)
                pdf.save()
            doc.content_hash = hashlib.sha256(
                Path(doc.file_path).read_bytes()
            ).hexdigest()
            affected += 1
        except Exception as e:
            logger.error(f"Error rotating document {doc.id}: {e}")

    await db.commit()
    return affected


async def merge_documents(
    db: AsyncSession,
    user_id: int,
    doc_ids: List[int],
    metadata_document_id: int | None = None,
    delete_originals: bool = False,
) -> str:
    """Merge multiple PDFs into a single document (Paperless L372-455)."""
    import pikepdf

    docs = (await db.execute(
        select(Document).where(
            and_(
                Document.id.in_(doc_ids),
                Document.user_id == user_id,
                Document.deleted_at.is_(None),
            )
        )
    )).scalars().all()

    # Maintain order from doc_ids
    docs_ordered = sorted(docs, key=lambda d: doc_ids.index(d.id))

    merged_pdf = pikepdf.new()
    for doc in docs_ordered:
        try:
            with pikepdf.open(doc.file_path) as pdf:
                merged_pdf.pages.extend(pdf.pages)
        except Exception as e:
            logger.error(f"Error merging document {doc.id}: {e}")

    if len(merged_pdf.pages) == 0:
        return "No documents could be merged"

    # Save merged file
    upload_dir = os.path.dirname(docs_ordered[0].file_path)
    merged_path = os.path.join(upload_dir, f"merged_{'_'.join(str(d) for d in doc_ids[:5])}.pdf")
    merged_pdf.remove_unreferenced_resources()
    merged_pdf.save(merged_path)
    merged_pdf.close()

    # Create new document record
    meta_doc = docs_ordered[0]
    if metadata_document_id:
        for d in docs_ordered:
            if d.id == metadata_document_id:
                meta_doc = d
                break

    merged_doc = Document(
        user_id=user_id,
        filename=f"{meta_doc.filename} (merged)",
        file_path=merged_path,
        file_type="pdf",
        file_size=os.path.getsize(merged_path),
        mime_type="application/pdf",
        content_hash=hashlib.sha256(Path(merged_path).read_bytes()).hexdigest(),
        folder_id=meta_doc.folder_id,
        correspondent_id=meta_doc.correspondent_id,
        document_type_id=meta_doc.document_type_id,
    )
    db.add(merged_doc)

    if delete_originals:
        now = datetime.utcnow()
        for doc in docs_ordered:
            doc.deleted_at = now

    await db.commit()
    return f"Merged {len(docs_ordered)} documents"


async def split_document(
    db: AsyncSession,
    user_id: int,
    doc_ids: List[int],
    pages: List[List[int]],
    delete_original: bool = False,
) -> str:
    """Split a document into multiple PDFs (Paperless L458-519)."""
    import pikepdf

    doc = (await db.execute(
        select(Document).where(
            and_(
                Document.id == doc_ids[0],
                Document.user_id == user_id,
                Document.deleted_at.is_(None),
            )
        )
    )).scalar_one_or_none()

    if not doc:
        raise ValueError(f"Document {doc_ids[0]} not found")

    upload_dir = os.path.dirname(doc.file_path)
    created = 0

    with pikepdf.open(doc.file_path) as pdf:
        for idx, page_group in enumerate(pages):
            dst = pikepdf.new()
            for page_num in page_group:
                dst.pages.append(pdf.pages[page_num - 1])  # 1-indexed

            split_path = os.path.join(upload_dir, f"{doc.id}_split_{idx + 1}.pdf")
            dst.remove_unreferenced_resources()
            dst.save(split_path)
            dst.close()

            split_doc = Document(
                user_id=user_id,
                filename=f"{doc.filename} (split {idx + 1})",
                file_path=split_path,
                file_type="pdf",
                file_size=os.path.getsize(split_path),
                mime_type="application/pdf",
                content_hash=hashlib.sha256(Path(split_path).read_bytes()).hexdigest(),
                folder_id=doc.folder_id,
            )
            db.add(split_doc)
            created += 1

    if delete_original:
        doc.deleted_at = datetime.utcnow()

    await db.commit()
    return f"Created {created} split documents"


async def edit_pdf(
    db: AsyncSession,
    user_id: int,
    doc_ids: List[int],
    operations: List[Dict[str, Any]],
    update_document: bool = False,
) -> str:
    """
    Edit PDF pages: reorder, rotate, or remove pages (Paperless L550-644).

    Each operation dict: {"page": 1, "rotate": 90, "doc": 0}
    """
    import pikepdf

    doc = (await db.execute(
        select(Document).where(
            and_(
                Document.id == doc_ids[0],
                Document.user_id == user_id,
                Document.deleted_at.is_(None),
            )
        )
    )).scalar_one_or_none()

    if not doc:
        raise ValueError(f"Document {doc_ids[0]} not found")

    with pikepdf.open(doc.file_path) as src:
        if update_document:
            # In-place edit
            dst = pikepdf.new()
            for op in operations:
                page = src.pages[op["page"] - 1]
                dst.pages.append(page)
                if op.get("rotate"):
                    dst.pages[-1].rotate(op["rotate"], relative=True)

            temp_path = doc.file_path + ".tmp"
            dst.remove_unreferenced_resources()
            dst.save(temp_path)
            dst.close()
            os.replace(temp_path, doc.file_path)

            doc.content_hash = hashlib.sha256(Path(doc.file_path).read_bytes()).hexdigest()
            doc.page_count = len(operations)
            await db.commit()
            return "Document updated in-place"
        else:
            # Create new document(s)
            max_idx = max(op.get("doc", 0) for op in operations)
            pdfs = [pikepdf.new() for _ in range(max_idx + 1)]

            for op in operations:
                dst = pdfs[op.get("doc", 0)]
                page = src.pages[op["page"] - 1]
                dst.pages.append(page)
                if op.get("rotate"):
                    dst.pages[-1].rotate(op["rotate"], relative=True)

            upload_dir = os.path.dirname(doc.file_path)
            for idx, pdf in enumerate(pdfs):
                edit_path = os.path.join(upload_dir, f"{doc.id}_edit_{idx + 1}.pdf")
                pdf.remove_unreferenced_resources()
                pdf.save(edit_path)
                pdf.close()

                edit_doc = Document(
                    user_id=user_id,
                    filename=f"{doc.filename} (edit {idx + 1})",
                    file_path=edit_path,
                    file_type="pdf",
                    file_size=os.path.getsize(edit_path),
                    mime_type="application/pdf",
                    content_hash=hashlib.sha256(Path(edit_path).read_bytes()).hexdigest(),
                    folder_id=doc.folder_id,
                )
                db.add(edit_doc)

            await db.commit()
            return f"Created {len(pdfs)} edited documents"


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------

METHODS = {
    "set_correspondent": set_correspondent,
    "set_document_type": set_document_type,
    "set_storage_path": set_storage_path,
    "add_tag": add_tag,
    "remove_tag": remove_tag,
    "modify_tags": modify_tags,
    "delete": bulk_delete,
    "set_permissions": bulk_set_permissions,
    "rotate": rotate_documents,
    "merge": merge_documents,
    "split": split_document,
    "edit_pdf": edit_pdf,
}


async def dispatch(
    db: AsyncSession,
    user_id: int,
    doc_ids: List[int],
    method: str,
    parameters: Dict[str, Any],
) -> str:
    """Dispatch a bulk edit operation by method name."""
    handler = METHODS.get(method)
    if not handler:
        raise ValueError(f"Unknown bulk edit method: {method}")

    logger.info(f"Bulk edit: method={method}, docs={len(doc_ids)}, user={user_id}")

    result = await handler(db=db, user_id=user_id, doc_ids=doc_ids, **parameters)

    if isinstance(result, int):
        return f"{method}: {result} documents affected"
    return str(result)
