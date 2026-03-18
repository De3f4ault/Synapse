"""
SavedView executor — converts saved view filter rules to search params.

Maps each FilterRuleType to a DMSSearchService.search() keyword argument.

Sourced from Paperless-ngx: frontend FilterRuleType → query param mapping.
"""

import logging
from typing import Optional

from app.models.saved_view import SavedView, FilterRuleType

logger = logging.getLogger("synapse.search.saved_view_executor")


class SavedViewExecutor:
    """
    Convert a SavedView's filter rules into DMSSearchService.search() kwargs.

    This is Synapse's equivalent of Paperless's FilterRuleType → query
    mapping in the frontend/API layer.
    """

    def __init__(self, saved_view: SavedView):
        self.view = saved_view

    def to_search_params(self) -> dict:
        """Convert filter rules to DMSSearchService.search() kwargs."""
        params: dict = {
            "sort_by": self.view.sort_field or "created_at",
            "sort_reverse": self.view.sort_reverse,
            "page_size": self.view.page_size or 25,
        }

        for rule in self.view.filter_rules:
            try:
                rt = FilterRuleType(rule.rule_type)
            except ValueError:
                logger.warning(
                    "Unknown filter rule type %d in saved view %d, skipping",
                    rule.rule_type, self.view.id,
                )
                continue

            val = rule.value

            # Content / FTS
            if rt == FilterRuleType.FULLTEXT_QUERY:
                params["query"] = val or ""

            # Classification FK filters
            elif rt == FilterRuleType.CORRESPONDENT_IS:
                params["correspondent_id"] = int(val) if val else None
            elif rt == FilterRuleType.DOCUMENT_TYPE_IS:
                params["document_type_id"] = int(val) if val else None
            elif rt == FilterRuleType.STORAGE_PATH_IS:
                params["storage_path_id"] = int(val) if val else None

            # Tag filters
            elif rt == FilterRuleType.HAS_TAG:
                params.setdefault("tag_ids", []).append(int(val)) if val else None
            elif rt == FilterRuleType.DOES_NOT_HAVE_TAG:
                params.setdefault("tag_ids_exclude", []).append(int(val)) if val else None
            elif rt == FilterRuleType.HAS_ANY_TAG:
                params["has_any_tag"] = val.lower() == "true" if val else None

            # Date range filters
            elif rt == FilterRuleType.CREATED_AFTER:
                params["created_date_from"] = val
            elif rt == FilterRuleType.CREATED_BEFORE:
                params["created_date_to"] = val
            elif rt == FilterRuleType.ADDED_AFTER:
                params["added_date_from"] = val
            elif rt == FilterRuleType.ADDED_BEFORE:
                params["added_date_to"] = val

            # Classification existence
            elif rt == FilterRuleType.HAS_CORRESPONDENT:
                params["has_correspondent"] = val.lower() == "true" if val else None
            elif rt == FilterRuleType.HAS_DOCUMENT_TYPE:
                params["has_document_type"] = val.lower() == "true" if val else None

            # Ownership (handled by permission layer, not search)
            elif rt in (FilterRuleType.OWNER_IS, FilterRuleType.OWNER_ISNOT):
                pass  # Permission layer handles this

        return params
