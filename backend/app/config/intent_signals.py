"""
Intent signal configuration for QuizIntentClassifier.

EXTENSION POINT: Add or remove signal phrases here to tune quiz answer exposure
without touching classifier logic. Non-engineers can PR this file directly.

Rules:
- Phrases are matched as substrings of the lowercased user message
- Earlier signal wins: testing_signals checked before analysis_signals
- Both sets are lowercase — the classifier lowercases the message before matching
"""

# Signals indicating the user wants to be tested (hide answers)
TESTING_SIGNALS: frozenset[str] = frozenset({
    "quiz me",
    "test me",
    "practice",
    "give me questions",
    "ask me",
    "drill me",
    "challenge me",
    "let's practice",
    "lets practice",
    "practice questions",
    "test my knowledge",
    "quiz myself",
})

# Signals indicating the user wants to review/understand results (show answers)
ANALYSIS_SIGNALS: frozenset[str] = frozenset({
    "what did i get wrong",
    "explain why",
    "why is the answer",
    "show me my results",
    "my score",
    "went wrong",
    "review my answers",
    "understand why",
    "correct answer",
    "explain the answer",
    "show answers",
    "what's the answer",
    "what is the answer",
})

# Mode IDs that hide answers by default when intent is ambiguous.
# All other modes expose answers in the default case.
TUTOR_MODES: frozenset[str] = frozenset({
    "tutor",
    "socratic",
})
