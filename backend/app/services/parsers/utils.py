"""
Shared parser utilities.

- Date extraction from document content and filenames.
- Metadata helpers used across all parser implementations.

Sourced from Paperless-ngx parsers.py date extraction patterns.
"""

import re
import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

# Date patterns ordered by specificity (most specific first).
# Each tuple: (compiled_regex, strptime_format_or_None)
_DATE_PATTERNS: list[tuple[re.Pattern, Optional[str]]] = [
    # ISO format: 2024-01-15
    (re.compile(r"\b(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b"), "%Y-%m-%d"),
    # US format: 01/15/2024
    (re.compile(r"\b(0[1-9]|1[0-2])/(0[1-9]|[12]\d|3[01])/(\d{4})\b"), "%m/%d/%Y"),
    # European format: 15.01.2024
    (re.compile(r"\b(0[1-9]|[12]\d|3[01])\.(0[1-9]|1[0-2])\.(\d{4})\b"), "%d.%m.%Y"),
    # Compact: 20240115 or 2024_01_15 or 2024-01-15 (in filename context)
    (re.compile(r"\b(\d{4})[_-]?(\d{2})[_-]?(\d{2})\b"), None),
]

# Written month names → month number
_MONTH_MAP = {
    "january": 1, "february": 2, "march": 3, "april": 4,
    "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
}
_WRITTEN_DATE_RE = re.compile(
    r"\b(January|February|March|April|May|June|July|August|"
    r"September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b",
    re.IGNORECASE,
)


def parse_date_from_text(text: str, filename: str = "") -> Optional[datetime]:
    """
    Extract the most likely document date from content and filename.

    Priority: filename dates first (intentional naming), then
    first occurrence in content (first 5000 chars to avoid noise).

    Returns:
        Parsed datetime or None if no date found.
    """
    # Try filename first — dates in filenames are intentional
    date = _try_extract_date(filename)
    if date:
        return date

    # Then try content (first 5000 chars to avoid noise from tables, etc.)
    search_text = text[:5000] if text else ""
    return _try_extract_date(search_text)


def _try_extract_date(text: str) -> Optional[datetime]:
    """Try all date patterns against text, return first valid match."""
    if not text:
        return None

    # Try written month format first (most specific)
    match = _WRITTEN_DATE_RE.search(text)
    if match:
        try:
            month = _MONTH_MAP.get(match.group(1).lower())
            day = int(match.group(2))
            year = int(match.group(3))
            if month and 1 <= day <= 31 and 1900 <= year <= 2100:
                return datetime(year, month, day)
        except (ValueError, TypeError):
            pass

    # Try structured patterns
    for pattern, fmt in _DATE_PATTERNS:
        match = pattern.search(text)
        if match:
            try:
                if fmt:
                    return datetime.strptime(match.group(0), fmt)
                else:
                    # Compact format: groups are (year, month, day)
                    year, month, day = int(match.group(1)), int(match.group(2)), int(match.group(3))
                    if 1900 <= year <= 2100 and 1 <= month <= 12 and 1 <= day <= 31:
                        return datetime(year, month, day)
            except (ValueError, IndexError):
                continue

    return None
