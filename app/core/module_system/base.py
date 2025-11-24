"""
Base class for all learning modules.
Defines the interface that all modules must implement.
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from app.core.module_system.capabilities import ModuleCapability


class LearningModule(ABC):
    """
    Abstract base class for all learning modules.

    Each module (flashcards, notes, documents, etc.) must implement this interface
    to be integrated into the SYNAPSE system.
    """

    @abstractmethod
    def get_name(self) -> str:
        """
        Get the unique identifier for this module.

        Returns:
            str: Module name (e.g., "flashcards", "notes", "documents")
        """
        pass

    @abstractmethod
    def get_display_name(self) -> str:
        """
        Get the human-readable display name.

        Returns:
            str: Display name (e.g., "Flashcards", "Notes", "Documents")
        """
        pass

    @abstractmethod
    def get_description(self) -> str:
        """
        Get a description of what this module does.

        Returns:
            str: Module description
        """
        pass

    @abstractmethod
    def get_capabilities(self) -> List[ModuleCapability]:
        """
        Get the list of capabilities this module supports.

        Returns:
            List[ModuleCapability]: List of supported capabilities
        """
        pass

    @abstractmethod
    async def create_content(
        self,
        user_id: int,
        data: Dict[str, Any]
    ) -> Any:
        """
        Create new content in this module.

        Args:
            user_id: ID of the user creating content
            data: Content data

        Returns:
            Created content object

        Raises:
            ValidationError: If data is invalid
            AuthorizationError: If user cannot create content
        """
        pass

    @abstractmethod
    async def get_content(
        self,
        user_id: int,
        filters: Dict[str, Any]
    ) -> List[Any]:
        """
        Retrieve content from this module.

        Args:
            user_id: ID of the user requesting content
            filters: Filter criteria (pagination, search, etc.)

        Returns:
            List of content objects
        """
        pass

    @abstractmethod
    async def update_content(
        self,
        user_id: int,
        content_id: int,
        data: Dict[str, Any]
    ) -> Any:
        """
        Update existing content.

        Args:
            user_id: ID of the user updating content
            content_id: ID of content to update
            data: Updated data

        Returns:
            Updated content object

        Raises:
            ResourceNotFoundError: If content not found
            AuthorizationError: If user cannot update content
        """
        pass

    @abstractmethod
    async def delete_content(
        self,
        user_id: int,
        content_id: int
    ) -> bool:
        """
        Delete content.

        Args:
            user_id: ID of the user deleting content
            content_id: ID of content to delete

        Returns:
            bool: True if deleted successfully

        Raises:
            ResourceNotFoundError: If content not found
            AuthorizationError: If user cannot delete content
        """
        pass

    @abstractmethod
    async def search_content(
        self,
        user_id: int,
        query: str,
        filters: Dict[str, Any]
    ) -> List[Any]:
        """
        Search content in this module.

        Args:
            user_id: ID of the user searching
            query: Search query
            filters: Additional filters

        Returns:
            List of matching content objects
        """
        pass

    @abstractmethod
    async def contribute_context(
        self,
        user_id: int,
        query: str
    ) -> Dict[str, Any]:
        """
        CRITICAL: Contribute context for this module to AI agents.

        This is the most important method - it provides SYNAPSE-aware context
        to AI agents by returning relevant content and metadata for the user.

        Args:
            user_id: ID of the user
            query: Current query/task context

        Returns:
            Dict containing:
                - module: Module name
                - relevant_content: List of relevant items
                - weak_areas: Topics user struggles with
                - statistics: Module-specific stats
                - metadata: Additional context
        """
        pass

    # Optional methods - implement if module supports these capabilities

    async def get_study_items(
        self,
        user_id: int,
        limit: int = 20
    ) -> List[Any]:
        """
        Get items for study session (if module supports STUDY capability).

        Args:
            user_id: ID of the user
            limit: Maximum number of items

        Returns:
            List of items ready for study
        """
        raise NotImplementedError(
            f"Module {self.get_name()} does not support study items"
        )

    async def record_study_result(
        self,
        user_id: int,
        item_id: int,
        result: Dict[str, Any]
    ):
        """
        Record result of studying an item (if module supports STUDY capability).

        Args:
            user_id: ID of the user
            item_id: ID of studied item
            result: Study result data (quality, time, etc.)
        """
        raise NotImplementedError(
            f"Module {self.get_name()} does not support recording study results"
        )

    async def generate_with_ai(
        self,
        user_id: int,
        prompt: str,
        context: Dict[str, Any]
    ) -> Any:
        """
        Generate content using AI (if module supports AI_GENERATE capability).

        Args:
            user_id: ID of the user
            prompt: Generation prompt
            context: Additional context

        Returns:
            Generated content
        """
        raise NotImplementedError(
            f"Module {self.get_name()} does not support AI generation"
        )

    async def analyze_performance(
        self,
        user_id: int
    ) -> Dict[str, Any]:
        """
        Analyze user performance in this module (if supports ANALYTICS capability).

        Args:
            user_id: ID of the user

        Returns:
            Dict with performance metrics and insights
        """
        raise NotImplementedError(
            f"Module {self.get_name()} does not support analytics"
        )

    def has_capability(self, capability: ModuleCapability) -> bool:
        """
        Check if module has a specific capability.

        Args:
            capability: Capability to check

        Returns:
            bool: True if module has capability
        """
        return capability in self.get_capabilities()
