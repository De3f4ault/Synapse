"""Chat Service"""

from typing import Dict, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from .constants import MessageRole


class ChatService:
    """Service layer for chat business logic"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_session(self, user_id: int, data: Dict) -> Dict:
        """Create a chat session"""
        from app.models.chat_session import ChatSession

        session = ChatSession(
            user_id=user_id,
            title=data.get("title", "New Chat"),
            document_id=data.get("document_id"),
            context_modules=data.get("context_modules", [])
        )

        self.session.add(session)
        await self.session.commit()
        await self.session.refresh(session)

        return self._session_to_dict(session)

    async def get_session(self, session_id: int, user_id: int) -> Dict:
        """Get a chat session"""
        from app.models.chat_session import ChatSession

        query = select(ChatSession).where(
            and_(
                ChatSession.id == session_id,
                ChatSession.user_id == user_id,
                ChatSession.deleted_at.is_(None)
            )
        )

        result = await self.session.execute(query)
        chat_session = result.scalar_one_or_none()

        if not chat_session:
            raise Exception("Session not found")

        return self._session_to_dict(chat_session)

    async def list_sessions(self, user_id: int) -> List[Dict]:
        """List user's chat sessions"""
        from app.models.chat_session import ChatSession

        query = select(ChatSession).where(
            and_(
                ChatSession.user_id == user_id,
                ChatSession.deleted_at.is_(None)
            )
        ).order_by(ChatSession.updated_at.desc())

        result = await self.session.execute(query)
        sessions = result.scalars().all()

        return [self._session_to_dict(s) for s in sessions]

    async def send_message(
        self,
        session_id: int,
        user_id: int,
        content: str
    ) -> str:
        """
        Send a message and get AI response.

        This is a simplified version - full implementation would:
        1. Build context from specified modules
        2. Call AIOrchestrator
        3. Stream response
        4. Track tokens and cost
        """
        from app.models.chat_message import ChatMessage

        # Save user message
        user_message = ChatMessage(
            session_id=session_id,
            role=MessageRole.USER,
            content=content
        )

        self.session.add(user_message)
        await self.session.commit()

        # AI response would go here
        assistant_response = "This is a placeholder response"

        # Save assistant message
        assistant_message = ChatMessage(
            session_id=session_id,
            role=MessageRole.ASSISTANT,
            content=assistant_response,
            model_used="flash"
        )

        self.session.add(assistant_message)
        await self.session.commit()

        return assistant_response

    async def get_messages(self, session_id: int, user_id: int) -> List[Dict]:
        """Get messages for a session"""
        from app.models.chat_message import ChatMessage
        from app.models.chat_session import ChatSession

        # Verify ownership
        session_query = select(ChatSession).where(
            and_(
                ChatSession.id == session_id,
                ChatSession.user_id == user_id
            )
        )

        session_result = await self.session.execute(session_query)
        chat_session = session_result.scalar_one_or_none()

        if not chat_session:
            raise Exception("Session not found")

        # Get messages
        query = select(ChatMessage).where(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.created_at.asc())

        result = await self.session.execute(query)
        messages = result.scalars().all()

        return [self._message_to_dict(m) for m in messages]

    async def delete_session(self, session_id: int, user_id: int):
        """Soft delete a session"""
        from app.models.chat_session import ChatSession

        query = select(ChatSession).where(
            and_(
                ChatSession.id == session_id,
                ChatSession.user_id == user_id
            )
        )

        result = await self.session.execute(query)
        chat_session = result.scalar_one_or_none()

        if not chat_session:
            raise Exception("Session not found")

        chat_session.deleted_at = datetime.utcnow()
        await self.session.commit()

    def _session_to_dict(self, session) -> Dict:
        """Convert ChatSession model to dict"""
        return {
            "id": session.id,
            "user_id": session.user_id,
            "title": session.title,
            "document_id": session.document_id,
            "context_modules": session.context_modules,
            "total_tokens_used": session.total_tokens_used or 0,
            "created_at": session.created_at,
            "updated_at": session.updated_at
        }

    def _message_to_dict(self, message) -> Dict:
        """Convert ChatMessage model to dict"""
        return {
            "id": message.id,
            "session_id": message.session_id,
            "role": message.role,
            "content": message.content,
            "model_used": message.model_used,
            "tokens": message.tokens,
            "created_at": message.created_at
        }
