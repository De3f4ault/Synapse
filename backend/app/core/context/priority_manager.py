"""
Priority Manager

Manages token budgets and prioritizes context elements for AI models.
"""

from typing import Dict, Any, List
import structlog

logger = structlog.get_logger(__name__)


class PriorityManager:
    """Manages context prioritization and token budgets"""

    # Approximate tokens per character (rough estimate)
    CHARS_PER_TOKEN = 4

    # Priority weights for different context types
    PRIORITY_WEIGHTS = {
        "weak_areas": 1.0,        # Highest priority
        "recent_activity": 0.8,
        "mastery_scores": 0.7,
        "due_items": 0.9,
        "user_preferences": 0.6,
        "historical_data": 0.4,   # Lowest priority
    }

    def __init__(self, max_tokens: int = 8000):
        """
        Initialize priority manager

        Args:
            max_tokens: Maximum token budget for context
        """
        self.max_tokens = max_tokens

    def estimate_tokens(self, text: str) -> int:
        """
        Estimate token count for text

        Args:
            text: Text to estimate

        Returns:
            Estimated token count
        """
        return len(text) // self.CHARS_PER_TOKEN

    def prioritize_context(
        self,
        context: Dict[str, Any],
        max_tokens: int = None
    ) -> Dict[str, Any]:
        """
        Prioritize context elements to fit within token budget

        Args:
            context: Complete context dict
            max_tokens: Optional token limit (uses instance default if None)

        Returns:
            Pruned context dict that fits within token budget
        """
        if max_tokens is None:
            max_tokens = self.max_tokens

        logger.debug(
            "prioritizing_context",
            max_tokens=max_tokens
        )

        # Convert context to string to estimate total tokens
        import json
        context_str = json.dumps(context)
        total_tokens = self.estimate_tokens(context_str)

        # If we're under budget, return as-is
        if total_tokens <= max_tokens:
            logger.debug(
                "context_within_budget",
                total_tokens=total_tokens,
                max_tokens=max_tokens
            )
            return context

        # Need to prune - prioritize sections
        logger.info(
            "context_exceeds_budget_pruning",
            total_tokens=total_tokens,
            max_tokens=max_tokens,
            overage=total_tokens - max_tokens
        )

        # Create prioritized context
        pruned = {}
        current_tokens = 0

        # Sort context sections by priority
        sections = self._prioritize_sections(context)

        # Add sections until we hit token limit
        for section_name, section_data, priority in sections:
            section_str = json.dumps(section_data)
            section_tokens = self.estimate_tokens(section_str)

            if current_tokens + section_tokens <= max_tokens:
                pruned[section_name] = section_data
                current_tokens += section_tokens
                logger.debug(
                    "added_section",
                    section=section_name,
                    tokens=section_tokens,
                    total=current_tokens
                )
            else:
                # Try to add truncated version
                remaining_tokens = max_tokens - current_tokens
                if remaining_tokens > 100:  # Only if we have meaningful space
                    truncated = self._truncate_section(
                        section_data,
                        remaining_tokens
                    )
                    pruned[section_name] = truncated
                    current_tokens += remaining_tokens
                    logger.debug(
                        "added_truncated_section",
                        section=section_name,
                        tokens=remaining_tokens,
                        total=current_tokens
                    )
                break

        logger.info(
            "context_pruned",
            original_tokens=total_tokens,
            final_tokens=current_tokens,
            sections_kept=len(pruned)
        )

        return pruned

    def _prioritize_sections(
        self,
        context: Dict[str, Any]
    ) -> List[tuple]:
        """
        Prioritize context sections by importance

        Args:
            context: Context dict

        Returns:
            List of (section_name, section_data, priority) tuples, sorted by priority
        """
        sections = []

        for key, value in context.items():
            # Determine priority based on key
            priority = self.PRIORITY_WEIGHTS.get(key, 0.5)

            # Boost priority for analytics section with weak areas
            if key == "analytics" and isinstance(value, dict):
                if "weak_topics" in value and value["weak_topics"]:
                    priority = 1.0

            sections.append((key, value, priority))

        # Sort by priority (descending)
        sections.sort(key=lambda x: x[2], reverse=True)

        return sections

    def _truncate_section(
        self,
        section_data: Any,
        max_tokens: int
    ) -> Any:
        """
        Truncate a section to fit within token budget

        Args:
            section_data: Section data to truncate
            max_tokens: Maximum tokens allowed

        Returns:
            Truncated section data
        """
        import json

        # If it's a list, take first N items
        if isinstance(section_data, list):
            result = []
            current_tokens = 0

            for item in section_data:
                item_str = json.dumps(item)
                item_tokens = self.estimate_tokens(item_str)

                if current_tokens + item_tokens <= max_tokens:
                    result.append(item)
                    current_tokens += item_tokens
                else:
                    break

            return result

        # If it's a dict, take subset of keys
        if isinstance(section_data, dict):
            result = {}
            current_tokens = 0

            for key, value in section_data.items():
                item_str = json.dumps({key: value})
                item_tokens = self.estimate_tokens(item_str)

                if current_tokens + item_tokens <= max_tokens:
                    result[key] = value
                    current_tokens += item_tokens
                else:
                    break

            return result

        # For other types, just truncate string representation
        text = str(section_data)
        max_chars = max_tokens * self.CHARS_PER_TOKEN
        if len(text) > max_chars:
            return text[:max_chars] + "..."

        return section_data
