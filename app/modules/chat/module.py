"""Chat Module Implementation"""

from typing import Dict, List, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession

from .service import ChatService
from .constants import MODULE_NAME, MODULE_DISPLAY_NAME, MODULE_DESCRIPTION


class ChatModule:
    """
    Chat module for SYNAPSE.

    Note: Chat consumes context from other modules but doesn't contribute context.
    """

    def __init__(self, session: AsyncSession):
        self.session = session
        self.service = ChatService(session)

    def get_name(self) -> str:
        return MODULE_NAME

    def get_display_name(self) -> str:
        return MODULE_DISPLAY_NAME

    def get_description(self) -> str:
        return MODULE_DESCRIPTION

    def get_capabilities(self) -> List[str]:
        return ["CREATE", "READ", "DELETE"]

    async def create_content(self, user_id: int, data: Dict) -> Any:
        """Create chat session"""
        return await self.service.create_session(user_id, data)

    async def get_content(self, user_id: int, filters: Optional[Dict] = None) -> List[Any]:
        """List chat sessions"""
        return await self.service.list_sessions(user_id)

    async def update_content(self, user_id: int, content_id: int, data: Dict) -> Any:
        """Not applicable"""
        raise NotImplementedError()

    async def delete_content(self, user_id: int, content_id: int) -> bool:
        """Delete session"""
        await self.service.delete_session(content_id, user_id)
        return True

    async def search_content(self, user_id: int, query: str, filters: Optional[Dict] = None) -> List[Any]:
        """Not applicable"""
        return []

    async def contribute_context(self, user_id: int, query: str) -> Dict:
        """Chat doesn't contribute context - it consumes it"""
        return {
            "module": MODULE_NAME,
            "relevant_content": [],
            "statistics": {}
        }

    async def analyze_performance(self, user_id: int) -> Dict:
        """Analyze chat usage"""
        sessions = await self.service.list_sessions(user_id)

        return {
            "module": MODULE_NAME,
            "analytics": {
                "total_sessions": len(sessions)
            }
        }
