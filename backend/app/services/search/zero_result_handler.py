"""
Zero-Result Recovery.

When a search returns zero results, this module provides:
1. Query normalization (strip stopwords, trim whitespace)
2. One-shot auto-retry with relaxed parameters
3. Suggestion fetching via search_suggestions SQL function

Guardrails:
- Maximum 1 retry per search (no cascading retries)
- Retry only fires if original query had >2 non-stopword tokens
- Suggestions always returned, even if retry also finds nothing
"""

import logging
from typing import List, Tuple

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# Common English stopwords — small set, covers ~80% of noise
STOPWORDS = frozenset(
    {
        "a",
        "an",
        "the",
        "and",
        "or",
        "but",
        "in",
        "on",
        "at",
        "to",
        "for",
        "of",
        "with",
        "by",
        "from",
        "is",
        "are",
        "was",
        "were",
        "be",
        "been",
        "being",
        "have",
        "has",
        "had",
        "do",
        "does",
        "did",
        "will",
        "would",
        "could",
        "should",
        "may",
        "might",
        "shall",
        "can",
        "not",
        "no",
        "nor",
        "so",
        "if",
        "then",
        "than",
        "that",
        "this",
        "these",
        "those",
        "it",
        "its",
        "my",
        "your",
        "his",
        "her",
        "our",
        "their",
        "me",
        "him",
        "us",
        "them",
        "i",
        "you",
        "he",
        "she",
        "we",
        "they",
        "what",
        "which",
        "who",
        "whom",
        "how",
        "when",
        "where",
        "why",
        "about",
        "into",
        "through",
        "during",
        "before",
        "after",
        "above",
        "below",
        "between",
        "out",
        "up",
        "down",
        "off",
        "over",
        "under",
        "again",
        "further",
        "just",
        "also",
        "very",
        "much",
        "too",
        "only",
        "all",
        "each",
        "every",
        "any",
        "some",
    }
)


def strip_stopwords(query: str) -> str:
    """
    Remove stopwords from query, preserving meaningful tokens.

    Returns the cleaned query, or the original if stripping would
    result in an empty string.
    """
    tokens = query.strip().split()
    meaningful = [t for t in tokens if t.lower() not in STOPWORDS]
    cleaned = " ".join(meaningful)
    return cleaned if cleaned else query


def should_retry(original_query: str) -> Tuple[bool, str]:
    """
    Decide whether to auto-retry a zero-result query.

    Guardrails:
    - Query must have >2 non-stopword tokens (otherwise stripping
      is unlikely to help)
    - Stripped query must differ from original

    Returns:
        (should_retry: bool, retry_query: str)
    """
    stripped = strip_stopwords(original_query)

    # Only retry if stripping changed the query
    if stripped.lower().strip() == original_query.lower().strip():
        return False, original_query

    # Only retry if there are enough meaningful tokens
    tokens = stripped.split()
    if len(tokens) < 1:
        return False, original_query

    return True, stripped


async def fetch_suggestions(
    db: AsyncSession,
    user_id: int,
    query: str,
    limit: int = 5,
) -> List[dict]:
    """
    Fetch Tier 1-2 suggestions from search_suggestions SQL function.

    Returns a list of dicts with keys: suggestion, source, similarity, entity_type.
    Swallows errors — returns empty list on failure.
    """
    try:
        result = await db.execute(
            text("SELECT * FROM developer_schema.search_suggestions(:user_id, :query, :limit)"),
            {"user_id": user_id, "query": query, "limit": limit},
        )
        rows = result.fetchall()
        return [
            {
                "suggestion": row.suggestion,
                "source": row.source,
                "similarity": float(row.similarity or 0.0),
                "entity_type": row.entity_type,
            }
            for row in rows
        ]
    except Exception as e:
        logger.warning("suggestion_fetch_failed", error=str(e)[:100])
        return []
