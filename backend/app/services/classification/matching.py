"""
Classification matching engine.

Evaluates MatchingModel instances against document content using 7 algorithms.
Provides match_* functions for each classification type.

Sourced from Paperless-ngx: documents/matching.py (647 lines).
"""

import logging
import re
from difflib import SequenceMatcher
from typing import Optional

from app.models.matching import MatchingAlgorithm

logger = logging.getLogger("synapse.matching")


# ---------------------------------------------------------------------------
# Core matching function (Paperless matching.py:154-249)
# ---------------------------------------------------------------------------

def matches(model_instance, document_content: str) -> bool:
    """
    Check if a MatchingModel instance matches the document content.

    Uses the model's matching_algorithm and match pattern to determine
    whether the document content satisfies the matching criteria.

    Args:
        model_instance: A MatchingModel subclass instance (Correspondent, etc.)
        document_content: The full text content of the document.

    Returns:
        True if the content matches the model's criteria.
    """
    algo = model_instance.matching_algorithm
    match_str = model_instance.match or ""

    # Empty match string never matches (Paperless matching.py:160)
    if not match_str.strip():
        return False

    if model_instance.is_insensitive:
        search_kwargs = {"flags": re.IGNORECASE}
    else:
        search_kwargs = {}

    if algo == MatchingAlgorithm.NONE:
        return False

    elif algo == MatchingAlgorithm.ANY:
        # Content contains ANY keyword (word-boundary matching)
        # Keywords can be comma-separated or space-separated
        for word in _split_keywords(match_str):
            if re.search(rf"\b{re.escape(word)}\b", document_content, **search_kwargs):
                log_reason(
                    model_instance, f"it contains this word: {word}",
                )
                return True
        return False

    elif algo == MatchingAlgorithm.ALL:
        # Content contains ALL keywords
        for word in _split_keywords(match_str):
            if not re.search(rf"\b{re.escape(word)}\b", document_content, **search_kwargs):
                return False
        log_reason(
            model_instance,
            f"it contains all of these words: {match_str}",
        )
        return True

    elif algo == MatchingAlgorithm.LITERAL:
        # Exact substring with word boundaries
        result = bool(
            re.search(
                rf"\b{re.escape(match_str)}\b",
                document_content,
                **search_kwargs,
            )
        )
        if result:
            log_reason(
                model_instance,
                f'it contains this string: "{match_str}"',
            )
        return result

    elif algo == MatchingAlgorithm.REGEX:
        # Regular expression match
        try:
            flags = re.IGNORECASE if model_instance.is_insensitive else 0
            match = re.search(
                re.compile(model_instance.match, flags),
                document_content,
            )
        except re.error:
            logger.error(
                "Error processing regex pattern: %s", model_instance.match,
            )
            return False

        if match:
            log_reason(
                model_instance,
                f"the string {match.group()} matches the regex {model_instance.match}",
            )
        return bool(match)

    elif algo == MatchingAlgorithm.FUZZY:
        # Fuzzy match using SequenceMatcher (Paperless uses rapidfuzz)
        # We use difflib.SequenceMatcher with a 0.85 threshold
        clean_match = re.sub(r"[^\w\s]", "", match_str)
        clean_text = re.sub(r"[^\w\s]", "", document_content)

        if model_instance.is_insensitive:
            clean_match = clean_match.lower()
            clean_text = clean_text.lower()

        # Sliding window approach for fuzzy matching
        match_words = clean_match.split()
        text_words = clean_text.split()
        window_size = len(match_words)

        if window_size == 0:
            return False

        for i in range(len(text_words) - window_size + 1):
            window = " ".join(text_words[i: i + window_size])
            ratio = SequenceMatcher(None, clean_match, window).ratio()
            if ratio > 0.85:
                log_reason(
                    model_instance,
                    f"fuzzy match (ratio={ratio:.2f}) for '{clean_match}'",
                )
                return True
        return False

    elif algo == MatchingAlgorithm.AUTO:
        # Handled by AI classifier separately
        return False

    else:
        logger.warning("Unknown matching algorithm: %d", algo)
        return False


# ---------------------------------------------------------------------------
# Helper: split match string into keywords
# Sourced from Paperless matching.py:252-268
# ---------------------------------------------------------------------------

def _split_keywords(match_str: str) -> list[str]:
    """
    Split match string on commas (primary) or whitespace (fallback).

    Returns plain strings (not regex-escaped) for use with ANY/ALL.
    """
    if "," in match_str:
        return [k.strip() for k in match_str.split(",") if k.strip()]
    return [k.strip() for k in match_str.split() if k.strip()]


def _split_match(match_str: str) -> list[str]:
    """
    Split match string into individual keywords for word-boundary matching.

    Handles quoted phrases and collapses spaces into \\s+ patterns.

    Example:
        'some random "with quotes" and spaces'
        => ["some", "random", "with\\s+quotes", "and", "spaces"]
    """
    findterms = re.compile(r'"([^"]+)"|(\S+)').findall
    normspace = re.compile(r"\s+").sub
    return [
        re.escape(normspace(" ", (t[0] or t[1]).strip())).replace(r"\ ", r"\s+")
        for t in findterms(match_str)
    ]


def log_reason(model_instance, reason: str) -> None:
    """Log why a model matched a document."""
    class_name = type(model_instance).__name__
    name = getattr(model_instance, "name", str(model_instance))
    logger.debug("%s '%s' matched because %s", class_name, name, reason)


# ---------------------------------------------------------------------------
# Match functions per classification type
# Sourced from Paperless matching.py:46-151
# ---------------------------------------------------------------------------

async def match_correspondents(
    document_content: str,
    user_id: int,
    db,
    classifier=None,
) -> list:
    """
    Find all Correspondent instances that match the document content.

    Combines rule-based matching with AI classifier predictions.
    """
    from app.models.correspondent import Correspondent
    from sqlalchemy import select

    result = await db.execute(
        select(Correspondent).where(Correspondent.user_id == user_id)
    )
    correspondents = result.scalars().all()

    pred_id = None
    if classifier:
        pred_id = await classifier.predict_correspondent(document_content)

    return [
        c for c in correspondents
        if matches(c, document_content)
        or (c.pk == pred_id and c.matching_algorithm == MatchingAlgorithm.AUTO)
    ]


async def match_document_types(
    document_content: str,
    user_id: int,
    db,
    classifier=None,
) -> list:
    """
    Find all DocumentType instances that match the document content.
    """
    from app.models.document_type import DocumentType
    from sqlalchemy import select

    result = await db.execute(
        select(DocumentType).where(DocumentType.user_id == user_id)
    )
    doc_types = result.scalars().all()

    pred_id = None
    if classifier:
        pred_id = await classifier.predict_document_type(document_content)

    return [
        dt for dt in doc_types
        if matches(dt, document_content)
        or (dt.id == pred_id and dt.matching_algorithm == MatchingAlgorithm.AUTO)
    ]


async def match_tags(
    document_content: str,
    user_id: int,
    db,
    classifier=None,
) -> list:
    """
    Find all Tag instances that match the document content.

    Unlike correspondents/types, tags apply ALL matches (not first-wins).
    """
    from app.models.tag import Tag
    from sqlalchemy import select

    result = await db.execute(
        select(Tag).where(Tag.user_id == user_id)
    )
    tags = result.scalars().all()

    pred_tag_ids = []
    if classifier:
        pred_tag_ids = await classifier.predict_tags(document_content)

    return [
        t for t in tags
        if matches(t, document_content)
        or (
            t.matching_algorithm == MatchingAlgorithm.AUTO
            and t.id in pred_tag_ids
        )
    ]


async def match_storage_paths(
    document_content: str,
    user_id: int,
    db,
    classifier=None,
) -> list:
    """
    Find all StoragePath instances that match the document content.
    """
    from app.models.storage_path import StoragePath
    from sqlalchemy import select

    result = await db.execute(
        select(StoragePath).where(StoragePath.user_id == user_id)
    )
    storage_paths = result.scalars().all()

    pred_id = None
    if classifier:
        pred_id = await classifier.predict_storage_path(document_content)

    return [
        sp for sp in storage_paths
        if matches(sp, document_content)
        or (sp.id == pred_id and sp.matching_algorithm == MatchingAlgorithm.AUTO)
    ]
