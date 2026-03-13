"""
Quiz Quality Score Mapping.

Maps quiz question outcomes to SM-2 compatible quality scores (0-5).
This enables unified scheduling semantics across flashcards and quizzes.

Philosophy:
- Quality measures retrieval strength, not just correctness
- Fast correct = strong memory (5)
- Slow correct = weak but successful retrieval (3)
- Incorrect = failed retrieval (1)
"""

from app.core.config import settings

# Default thresholds (can be overridden via settings)
FAST_THRESHOLD_SECONDS = 10  # Fast recall: < 10s
MODERATE_THRESHOLD_SECONDS = 30  # Moderate: 10-30s
MAX_QUESTION_DURATION_SECONDS = 120  # Cap to prevent noise


def map_quality_score(
    is_correct: bool,
    duration_seconds: int,
    was_skipped: bool = False,
) -> int:
    """
    Map quiz question outcome to SM-2 quality score (0-5).

    Quality Score Mapping:
    | Outcome             | Duration  | Quality |
    |---------------------|-----------|---------|
    | Skipped / timeout   | -         | 0       |
    | Incorrect           | any       | 1       |
    | Correct + slow      | > 30s     | 3       |
    | Correct + moderate  | 10-30s    | 4       |
    | Correct + fast      | < 10s     | 5       |

    Args:
        is_correct: Whether the answer was correct
        duration_seconds: Time taken to answer (raw, will be clamped)
        was_skipped: Whether the question was skipped

    Returns:
        Quality score 0-5, compatible with SM-2 algorithm
    """
    # Skipped = complete failure
    if was_skipped:
        return 0

    # Clamp duration to prevent pollution from idle tabs
    max_duration = getattr(settings, "MAX_QUESTION_DURATION_SECONDS", MAX_QUESTION_DURATION_SECONDS)
    clamped_duration = min(duration_seconds, max_duration)

    # Incorrect = failed retrieval
    if not is_correct:
        return 1

    # Correct — quality depends on retrieval speed
    fast_threshold = getattr(settings, "QUIZ_FAST_THRESHOLD", FAST_THRESHOLD_SECONDS)
    moderate_threshold = getattr(settings, "QUIZ_MODERATE_THRESHOLD", MODERATE_THRESHOLD_SECONDS)

    if clamped_duration < fast_threshold:
        return 5  # Fast recall = strong memory
    elif clamped_duration < moderate_threshold:
        return 4  # Moderate recall = decent memory
    else:
        return 3  # Slow but correct = weak but successful retrieval


def clamp_duration(duration_seconds: int) -> tuple[int, bool]:
    """
    Clamp duration to prevent noise from idle tabs/distractions.

    Returns:
        Tuple of (clamped_duration, was_clamped)
    """
    max_duration = getattr(settings, "MAX_QUESTION_DURATION_SECONDS", MAX_QUESTION_DURATION_SECONDS)
    clamped = min(duration_seconds, max_duration)
    was_clamped = clamped != duration_seconds
    return clamped, was_clamped


def normalize_accuracy(quality_score: int) -> float:
    """
    Normalize quality score to accuracy (0.0 - 1.0).

    This matches the flashcard accuracy formula for unified analytics.
    """
    return quality_score / 5.0
