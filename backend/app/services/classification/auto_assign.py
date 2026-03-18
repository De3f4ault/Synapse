"""
Post-consumption auto-classification chain.

Runs after document ingestion to automatically assign correspondents,
document types, tags, and storage paths based on matching rules + AI.

Sourced from Paperless-ngx: documents/signals/handlers.py
  - set_correspondent (L98-151)
  - set_document_type (L154-208)
  - set_tags (L211-264)
  - set_storage_path (L267-324)
  - add_inbox_tags (L65-75)
"""

import logging
from typing import Optional

from app.models.matching import MatchingAlgorithm

logger = logging.getLogger("synapse.classification")


async def auto_classify_document(document_id: int, db) -> dict:
    """
    Run the full auto-classification chain on a document.

    Combines rule-based matching + AI classification, following the
    exact Paperless-ngx signal chain order:
    1. add_inbox_tags
    2. set_correspondent (first match wins)
    3. set_document_type (first match wins)
    4. set_tags (all matches applied)
    5. set_storage_path (first match wins)

    Args:
        document_id: The ID of the document to classify.
        db: AsyncSession database session.

    Returns:
        Dict with classification results for logging/UI feedback.
    """
    from app.models.document import Document
    from app.models.tag import Tag
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    # Load document with existing relationships
    result = await db.execute(
        select(Document)
        .where(Document.id == document_id)
        .options(selectinload(Document.tags))
    )
    document = result.scalar_one_or_none()

    if not document:
        logger.error("Document %d not found for classification", document_id)
        return {"error": "Document not found"}

    content = document.content_text or ""
    user_id = document.user_id

    if not content.strip():
        logger.info("Document %d has no content, skipping classification", document_id)
        return {"skipped": "No content"}

    classification_result = {
        "document_id": document_id,
        "correspondent_id": None,
        "document_type_id": None,
        "storage_path_id": None,
        "tag_ids": [],
        "inbox_tag_ids": [],
        "ai_used": False,
    }

    # -----------------------------------------------------------------
    # Step 1: Add inbox tags (Paperless handlers.py:65-75)
    # -----------------------------------------------------------------
    inbox_tags = await _get_inbox_tags(user_id, db)
    for tag in inbox_tags:
        if tag not in document.tags:
            document.tags.append(tag)
            classification_result["inbox_tag_ids"].append(tag.id)

    # -----------------------------------------------------------------
    # Step 2: Set correspondent (Paperless handlers.py:98-151)
    # First match wins, skip if already assigned
    # -----------------------------------------------------------------
    if not document.correspondent_id:
        from app.services.classification.matching import match_correspondents
        matched = await match_correspondents(content, user_id, db)
        if matched:
            document.correspondent_id = matched[0].id
            classification_result["correspondent_id"] = matched[0].id
            logger.info(
                "Assigned correspondent '%s' to document %d",
                matched[0].name, document_id,
            )

    # -----------------------------------------------------------------
    # Step 3: Set document type (Paperless handlers.py:154-208)
    # First match wins, skip if already assigned
    # -----------------------------------------------------------------
    if not document.document_type_id:
        from app.services.classification.matching import match_document_types
        matched = await match_document_types(content, user_id, db)
        if matched:
            document.document_type_id = matched[0].id
            classification_result["document_type_id"] = matched[0].id
            logger.info(
                "Assigned document type '%s' to document %d",
                matched[0].name, document_id,
            )

    # -----------------------------------------------------------------
    # Step 4: Set tags (Paperless handlers.py:211-264)
    # ALL matches applied (not first-wins)
    # -----------------------------------------------------------------
    from app.services.classification.matching import match_tags
    matched_tags = await match_tags(content, user_id, db)
    current_tag_ids = {t.id for t in document.tags}
    for tag in matched_tags:
        if tag.id not in current_tag_ids:
            document.tags.append(tag)
            classification_result["tag_ids"].append(tag.id)
            logger.info(
                "Applied tag '%s' to document %d", tag.name, document_id,
            )

    # -----------------------------------------------------------------
    # Step 5: Set storage path (Paperless handlers.py:267-324)
    # First match wins, skip if already assigned
    # -----------------------------------------------------------------
    if not document.storage_path_id:
        from app.services.classification.matching import match_storage_paths
        matched = await match_storage_paths(content, user_id, db)
        if matched:
            document.storage_path_id = matched[0].id
            classification_result["storage_path_id"] = matched[0].id
            logger.info(
                "Assigned storage path '%s' to document %d",
                matched[0].name, document_id,
            )

    # -----------------------------------------------------------------
    # Step 6: AI classification for AUTO items (Synapse advantage)
    # Only runs if any model uses MATCH_AUTO algorithm
    # -----------------------------------------------------------------
    needs_ai = await _has_auto_items(user_id, db)
    if needs_ai:
        classification_result["ai_used"] = True
        await _run_ai_classification(document, content, user_id, db, classification_result)

    await db.commit()

    logger.info(
        "Classification complete for document %d: %s",
        document_id, classification_result,
    )

    return classification_result


async def _get_inbox_tags(user_id: int, db) -> list:
    """Get all inbox tags for a user."""
    from app.models.tag import Tag
    from sqlalchemy import select

    result = await db.execute(
        select(Tag).where(
            Tag.user_id == user_id,
            Tag.is_inbox_tag == True,
        )
    )
    return list(result.scalars().all())


async def _has_auto_items(user_id: int, db) -> bool:
    """Check if user has any MatchingModel items using AUTO algorithm."""
    from app.models.correspondent import Correspondent
    from app.models.document_type import DocumentType
    from app.models.tag import Tag
    from app.models.storage_path import StoragePath
    from sqlalchemy import select, exists

    for model_class in [Correspondent, DocumentType, Tag, StoragePath]:
        result = await db.execute(
            select(exists().where(
                model_class.user_id == user_id,
                model_class.matching_algorithm == MatchingAlgorithm.AUTO,
            ))
        )
        if result.scalar():
            return True
    return False


async def _run_ai_classification(
    document, content: str, user_id: int, db, classification_result: dict,
) -> None:
    """
    Run Gemini AI classification for AUTO items.

    Only classifies against items that use MATCH_AUTO algorithm.
    Rule-based assignments take priority (AI fills the gaps).
    """
    from app.models.correspondent import Correspondent
    from app.models.document_type import DocumentType
    from app.models.tag import Tag
    from app.services.classification.ai_classifier import AIDocumentClassifier
    from sqlalchemy import select

    # Gather AUTO items for each category
    auto_correspondents = []
    if not document.correspondent_id:
        result = await db.execute(
            select(Correspondent).where(
                Correspondent.user_id == user_id,
                Correspondent.matching_algorithm == MatchingAlgorithm.AUTO,
            )
        )
        auto_correspondents = [
            {"id": c.id, "name": c.name}
            for c in result.scalars().all()
        ]

    auto_doc_types = []
    if not document.document_type_id:
        result = await db.execute(
            select(DocumentType).where(
                DocumentType.user_id == user_id,
                DocumentType.matching_algorithm == MatchingAlgorithm.AUTO,
            )
        )
        auto_doc_types = [
            {"id": dt.id, "name": dt.name}
            for dt in result.scalars().all()
        ]

    current_tag_ids = {t.id for t in document.tags}
    result = await db.execute(
        select(Tag).where(
            Tag.user_id == user_id,
            Tag.matching_algorithm == MatchingAlgorithm.AUTO,
        )
    )
    auto_tags = [
        {"id": t.id, "name": t.name}
        for t in result.scalars().all()
        if t.id not in current_tag_ids
    ]

    # Only call AI if there are items to classify against
    if not auto_correspondents and not auto_doc_types and not auto_tags:
        return

    try:
        classifier = AIDocumentClassifier()
        prediction = await classifier.classify(
            content,
            auto_correspondents,
            auto_doc_types,
            auto_tags,
        )

        # Apply AI results (only if rule-based didn't already assign)
        if not document.correspondent_id and prediction.get("correspondent_id"):
            document.correspondent_id = prediction["correspondent_id"]
            classification_result["correspondent_id"] = prediction["correspondent_id"]
            logger.info(
                "AI assigned correspondent %d to document %d",
                prediction["correspondent_id"], document.id,
            )

        if not document.document_type_id and prediction.get("document_type_id"):
            document.document_type_id = prediction["document_type_id"]
            classification_result["document_type_id"] = prediction["document_type_id"]
            logger.info(
                "AI assigned document type %d to document %d",
                prediction["document_type_id"], document.id,
            )

        for tag_id in prediction.get("tag_ids", []):
            if tag_id not in current_tag_ids:
                from app.models.tag import Tag as TagModel
                tag_result = await db.execute(
                    select(TagModel).where(TagModel.id == tag_id)
                )
                tag = tag_result.scalar_one_or_none()
                if tag:
                    document.tags.append(tag)
                    classification_result["tag_ids"].append(tag_id)
                    logger.info(
                        "AI applied tag '%s' to document %d",
                        tag.name, document.id,
                    )

    except Exception as e:
        logger.error(
            "AI classification failed for document %d: %s",
            document.id, e, exc_info=True,
        )
