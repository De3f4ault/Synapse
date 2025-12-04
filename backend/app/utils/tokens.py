"""
Token counting utilities for AI quota management.

Provides functions for estimating and counting tokens
for Gemini API quota tracking.
"""

import re
from typing import Dict, List, Optional


def estimate_tokens(text: str, method: str = "simple") -> int:
    """
    Estimate token count for text.

    This is a rough approximation. For accurate counts,
    use the Gemini API's token counter.

    Args:
        text: Text to count tokens for
        method: Estimation method ("simple" or "words")

    Returns:
        Estimated token count

    Note:
        - Simple method: len(text) / 4 (rough approximation)
        - Words method: word_count * 1.3 (accounts for tokenization)
    """
    if not text:
        return 0

    if method == "simple":
        # Rough approximation: ~4 characters per token
        return len(text) // 4

    elif method == "words":
        # Count words and multiply by factor
        words = len(text.split())
        return int(words * 1.3)

    else:
        raise ValueError(f"Unknown method: {method}")


def count_tokens(text: str) -> int:
    """
    Count tokens using simple word-based heuristic.

    This provides a better estimate than character count
    but is still approximate.

    Args:
        text: Text to count

    Returns:
        Estimated token count
    """
    if not text:
        return 0

    # Split on whitespace and punctuation
    tokens = re.findall(r'\w+|[^\w\s]', text)

    # Account for multi-character tokens
    # Most words are 1 token, but some are split
    token_count = 0
    for token in tokens:
        if len(token) <= 4:
            token_count += 1
        else:
            # Longer words may be multiple tokens
            token_count += len(token) // 4 + 1

    return token_count


def estimate_tokens_for_messages(
    messages: List[Dict[str, str]],
    include_overhead: bool = True,
) -> int:
    """
    Estimate tokens for list of messages.

    Args:
        messages: List of message dicts with 'role' and 'content'
        include_overhead: Include overhead for message formatting

    Returns:
        Estimated total token count

    Example:
        messages = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there!"}
        ]
        tokens = estimate_tokens_for_messages(messages)
    """
    total = 0

    for message in messages:
        # Count content tokens
        content = message.get("content", "")
        total += count_tokens(content)

        # Add overhead for role and formatting
        if include_overhead:
            total += 4  # Rough overhead per message

    # Add conversation overhead
    if include_overhead and messages:
        total += 3  # Initial overhead

    return total


def estimate_tokens_for_context(
    context: Dict,
    max_depth: int = 10,
) -> int:
    """
    Estimate tokens for nested context dictionary.

    Args:
        context: Context dictionary
        max_depth: Maximum nesting depth to process

    Returns:
        Estimated token count
    """
    if max_depth <= 0:
        return 0

    total = 0

    for key, value in context.items():
        # Count key tokens
        total += count_tokens(str(key))

        # Count value tokens based on type
        if isinstance(value, str):
            total += count_tokens(value)

        elif isinstance(value, (int, float, bool)):
            total += 1

        elif isinstance(value, list):
            for item in value:
                if isinstance(item, str):
                    total += count_tokens(item)
                elif isinstance(item, dict):
                    total += estimate_tokens_for_context(item, max_depth - 1)
                else:
                    total += 1

        elif isinstance(value, dict):
            total += estimate_tokens_for_context(value, max_depth - 1)

    return total


def fits_in_budget(
    text: str,
    max_tokens: int,
    reserve: int = 100,
) -> bool:
    """
    Check if text fits within token budget.

    Args:
        text: Text to check
        max_tokens: Maximum allowed tokens
        reserve: Reserve tokens for safety (default: 100)

    Returns:
        True if text fits within budget, False otherwise
    """
    estimated = count_tokens(text)
    return estimated <= (max_tokens - reserve)


def truncate_to_budget(
    text: str,
    max_tokens: int,
    preserve_end: bool = False,
) -> str:
    """
    Truncate text to fit within token budget.

    Args:
        text: Text to truncate
        max_tokens: Maximum allowed tokens
        preserve_end: Keep end of text instead of beginning

    Returns:
        Truncated text
    """
    current_tokens = count_tokens(text)

    if current_tokens <= max_tokens:
        return text

    # Calculate approximate character budget
    # Rough ratio: 4 chars per token
    char_budget = max_tokens * 4

    if preserve_end:
        # Keep end of text
        return "..." + text[-char_budget:]
    else:
        # Keep beginning of text
        return text[:char_budget] + "..."


def calculate_quota_cost(
    input_tokens: int,
    output_tokens: int,
    model: str = "flash",
) -> Dict[str, int]:
    """
    Calculate quota cost for API call.

    Args:
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens
        model: Model name ("pro", "flash", "flash-lite")

    Returns:
        Dict with cost breakdown
    """
    total_tokens = input_tokens + output_tokens

    return {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": total_tokens,
        "model": model,
    }


def format_token_count(count: int) -> str:
    """
    Format token count as human-readable string.

    Args:
        count: Token count

    Returns:
        Formatted string (e.g., "1.2K tokens", "500 tokens")
    """
    if count < 1000:
        return f"{count} tokens"
    elif count < 1000000:
        return f"{count / 1000:.1f}K tokens"
    else:
        return f"{count / 1000000:.1f}M tokens"
