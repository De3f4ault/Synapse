"""
Text processing utilities.

Provides helpers for:
- Text normalization
- Truncation
- Slug generation
- Excerpt extraction
"""

import re
import unicodedata
from typing import Optional


def normalize_whitespace(text: str) -> str:
    """
    Normalize whitespace in text.

    - Converts multiple spaces to single space
    - Removes leading/trailing whitespace
    - Converts newlines to spaces

    Args:
        text: Text to normalize

    Returns:
        Normalized text
    """
    if not text:
        return text

    # Replace multiple whitespace with single space
    text = re.sub(r'\s+', ' ', text)

    # Remove leading/trailing whitespace
    text = text.strip()

    return text


def truncate(
    text: str,
    max_length: int,
    suffix: str = "...",
) -> str:
    """
    Truncate text to maximum length.

    Args:
        text: Text to truncate
        max_length: Maximum length (including suffix)
        suffix: Suffix to add if truncated (default: "...")

    Returns:
        Truncated text
    """
    if not text or len(text) <= max_length:
        return text

    # Account for suffix length
    truncate_at = max_length - len(suffix)

    if truncate_at <= 0:
        return suffix

    return text[:truncate_at] + suffix


def truncate_words(
    text: str,
    max_words: int,
    suffix: str = "...",
) -> str:
    """
    Truncate text to maximum number of words.

    Args:
        text: Text to truncate
        max_words: Maximum number of words
        suffix: Suffix to add if truncated (default: "...")

    Returns:
        Truncated text
    """
    if not text:
        return text

    words = text.split()

    if len(words) <= max_words:
        return text

    return ' '.join(words[:max_words]) + suffix


def slugify(text: str, max_length: int = 100) -> str:
    """
    Convert text to URL-friendly slug.

    Args:
        text: Text to slugify
        max_length: Maximum slug length (default: 100)

    Returns:
        URL-friendly slug

    Example:
        slugify("Hello World! 123") -> "hello-world-123"
    """
    if not text:
        return ""

    # Normalize unicode characters
    text = unicodedata.normalize('NFKD', text)
    text = text.encode('ascii', 'ignore').decode('ascii')

    # Convert to lowercase
    text = text.lower()

    # Replace spaces and special characters with hyphens
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)

    # Remove leading/trailing hyphens
    text = text.strip('-')

    # Truncate if needed
    if len(text) > max_length:
        text = text[:max_length].rstrip('-')

    return text


def extract_excerpt(
    text: str,
    max_length: int = 200,
    separator: str = " ",
) -> str:
    """
    Extract excerpt from text, breaking at word boundaries.

    Args:
        text: Text to extract from
        max_length: Maximum excerpt length
        separator: Word separator (default: space)

    Returns:
        Excerpt
    """
    if not text or len(text) <= max_length:
        return text

    # Find last separator before max_length
    truncated = text[:max_length]
    last_sep = truncated.rfind(separator)

    if last_sep > 0:
        return truncated[:last_sep] + "..."

    return truncated + "..."


def strip_html_tags(text: str) -> str:
    """
    Remove HTML tags from text.

    Args:
        text: Text with HTML tags

    Returns:
        Text without HTML tags
    """
    if not text:
        return text

    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)

    # Decode HTML entities
    text = text.replace('&nbsp;', ' ')
    text = text.replace('&lt;', '<')
    text = text.replace('&gt;', '>')
    text = text.replace('&amp;', '&')
    text = text.replace('&quot;', '"')

    # Normalize whitespace
    text = normalize_whitespace(text)

    return text


def highlight_search_terms(
    text: str,
    search_terms: list[str],
    highlight_start: str = "<mark>",
    highlight_end: str = "</mark>",
) -> str:
    """
    Highlight search terms in text.

    Args:
        text: Text to highlight
        search_terms: List of terms to highlight
        highlight_start: Start tag (default: <mark>)
        highlight_end: End tag (default: </mark>)

    Returns:
        Text with highlighted terms
    """
    if not text or not search_terms:
        return text

    for term in search_terms:
        if not term:
            continue

        # Case-insensitive replacement
        pattern = re.compile(re.escape(term), re.IGNORECASE)
        text = pattern.sub(
            lambda m: f"{highlight_start}{m.group(0)}{highlight_end}",
            text,
        )

    return text


def count_words(text: str) -> int:
    """
    Count words in text.

    Args:
        text: Text to count

    Returns:
        Number of words
    """
    if not text:
        return 0

    # Split on whitespace and count non-empty strings
    return len([word for word in text.split() if word])


def remove_extra_newlines(text: str, max_consecutive: int = 2) -> str:
    """
    Remove extra consecutive newlines.

    Args:
        text: Text to process
        max_consecutive: Maximum consecutive newlines to keep

    Returns:
        Text with extra newlines removed
    """
    if not text:
        return text

    # Replace consecutive newlines
    pattern = r'\n{' + str(max_consecutive + 1) + ',}'
    replacement = '\n' * max_consecutive

    return re.sub(pattern, replacement, text)


def capitalize_sentences(text: str) -> str:
    """
    Capitalize first letter of each sentence.

    Args:
        text: Text to capitalize

    Returns:
        Text with capitalized sentences
    """
    if not text:
        return text

    # Split on sentence boundaries
    sentences = re.split(r'([.!?]\s+)', text)

    # Capitalize first letter of each sentence
    result = []
    for i, part in enumerate(sentences):
        if i % 2 == 0 and part:  # Actual sentence (not delimiter)
            part = part[0].upper() + part[1:] if len(part) > 0 else part
        result.append(part)

    return ''.join(result)
