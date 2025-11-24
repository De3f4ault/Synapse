"""
Flashcard Module Constants

Defines constants for the flashcard module including learning states,
quality ratings, SM-2 algorithm parameters, and other configuration values.
"""

from enum import Enum


class LearningState(str, Enum):
    """Learning state of a flashcard"""
    NEW = "new"
    LEARNING = "learning"
    REVIEW = "review"
    MASTERED = "mastered"


# Quality ratings for SM-2 algorithm (0-5)
QUALITY_RATINGS = {
    0: "Again",        # Complete blackout
    1: "Hard",         # Incorrect response; correct answer remembered
    2: "Good",         # Correct response with hesitation
    3: "Easy",         # Correct response with some effort
    4: "Perfect",      # Perfect response with no effort
    5: "Trivial"       # Correct response; answer seemed too easy
}

# SM-2 Algorithm Parameters
DEFAULT_EASE_FACTOR = 2.5      # Starting ease factor for new cards
MIN_EASE_FACTOR = 1.3          # Minimum ease factor (prevents cards from becoming too hard)
MAX_EASE_FACTOR = 5.0          # Maximum ease factor (prevents excessive intervals)

# Interval Configuration
INITIAL_INTERVAL = 1           # First review interval (days)
MIN_INTERVAL = 1               # Minimum interval between reviews (days)
MAX_INTERVAL = 365             # Maximum interval between reviews (days)

# Review Configuration
DEFAULT_DUE_CARD_LIMIT = 20    # Default number of due cards to fetch
MAX_DUE_CARD_LIMIT = 100       # Maximum cards that can be fetched at once

# Mastery Thresholds
MASTERY_EASE_THRESHOLD = 2.7   # Ease factor threshold for mastered state
MASTERY_INTERVAL_THRESHOLD = 30 # Days threshold for mastered state
MASTERY_REVIEW_THRESHOLD = 5   # Minimum successful reviews for mastery

# Performance Metrics
WEAK_AREA_THRESHOLD = 0.7      # Accuracy below this is considered weak
STRONG_AREA_THRESHOLD = 0.85   # Accuracy above this is considered strong

# Module Configuration
MODULE_NAME = "flashcards"
MODULE_DISPLAY_NAME = "Flashcards"
MODULE_DESCRIPTION = "Spaced repetition flashcard system using SM-2 algorithm for optimal learning"

# Database Configuration
DECK_NAME_MAX_LENGTH = 255
CARD_TEXT_MAX_LENGTH = 10000   # Maximum characters for front/back text
MEDIA_URL_MAX_LENGTH = 500
