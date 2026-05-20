"""
QuizIntentClassifier — infers whether the user wants to be tested or to review answers.

Answer exposure decision tree:
  1. TESTING intent detected \u2192 hide answers (always, regardless of mode)
  2. ANALYSIS intent detected \u2192 show answers (always, regardless of mode)
  3. Ambiguous/default \u2192 mode decides:
       - tutor / socratic modes \u2192 hide answers (Socratic principle)
       - all other modes      \u2192 show answers

Signal phrases live in app.config.intent_signals so non-engineers can tune them
without touching this file.
"""

from typing import Literal

from app.config.intent_signals import TESTING_SIGNALS, ANALYSIS_SIGNALS, TUTOR_MODES

QuizIntent = Literal["testing", "analysis", "default"]


class QuizIntentClassifier:
    """
    Keyword-based classifier for quiz answer exposure.

    Intentionally simple: substring matching on lowercased message.
    Order of checks matters \u2014 testing signals are checked before analysis signals
    so "practice with the correct answers shown" routes to testing, not analysis.
    """

    def classify(self, message: str, mode_id: str) -> QuizIntent:
        """
        Classify the user's intent when referencing a quiz.

        Args:
            message: The user's raw message text.
            mode_id: Current chat mode (e.g. "tutor", "direct", "socratic").

        Returns:
            "testing"  \u2192 user wants to be quizzed, hide answers
            "analysis" \u2192 user wants to review results/explanations, show answers
            "default"  \u2192 ambiguous, let mode decide
        """
        msg = message.lower()

        if any(signal in msg for signal in TESTING_SIGNALS):
            return "testing"

        if any(signal in msg for signal in ANALYSIS_SIGNALS):
            return "analysis"

        return "default"

    def should_expose_answers(self, message: str, mode_id: str) -> bool:
        """
        Determine whether quiz answer keys should be included in the AI context.

        Args:
            message: The user's raw message text.
            mode_id: Current chat mode.

        Returns:
            True if the AI should see correct answers, False otherwise.
        """
        intent = self.classify(message, mode_id)

        if intent == "testing":
            return False  # Never expose answers when user is being tested

        if intent == "analysis":
            return True   # Always expose answers when user is reviewing

        # Ambiguous: tutor/socratic modes hide by default; direct modes expose
        return mode_id not in TUTOR_MODES
