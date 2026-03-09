"""
Chat Service — Application Layer.

This module implements the business logic for the Chat functionality.
It orchestrates operations between:
- Domain Entities (ChatSession, ChatMessage)
- Data Access (Repositories)
- External AI Services (Orchestrators)

The service enforces:
- Resource ownership (User can only access their own sessions)
- Data consistency (Transactions)
- Business rules (Branching logic, Message deletion policies)
"""

from typing import Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from .internal.repository import (
    ChatSessionRepository,
    ChatMessageRepository,
    ChatThreadRepository,
)
from .internal.models import MessageRole, ChatMessage
from .interface import ChatSessionResponse, ChatMessageResponse


logger = structlog.get_logger(__name__)


class ChatService:
    """
    Application service for the Chat domain.

    This service encapsulates all business logic for chat sessions, messages,
    and AI interactions. It is designed to be used by the API layer and other modules.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self._session_repo = ChatSessionRepository(db)
        self._message_repo = ChatMessageRepository(db)
        self._thread_repo = ChatThreadRepository(db)

    # -------------------------------------------------------------------------
    # Session Operations
    # -------------------------------------------------------------------------

    async def create_session(
        self,
        user_id: int,
        *,
        title: Optional[str] = None,
        document_id: Optional[int] = None,
        context_modules: Optional[List[str]] = None,
    ) -> ChatSessionResponse:
        """
        Create a new chat session.

        If no title is provided, generates a default timestamp-based title.
        """
        from datetime import datetime

        session = await self._session_repo.create(
            user_id=user_id,
            title=title or f"Chat {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
            document_id=document_id,
            context_modules=context_modules,
        )
        await self.db.commit()

        logger.info("chat_session_created", session_id=session.id, user_id=user_id)

        return ChatSessionResponse(
            id=session.id,
            user_id=session.user_id,
            title=session.title,
            document_id=session.document_id,
            context_modules=context_modules or ["flashcards", "notes"],
            message_count=0,
            total_tokens_used=0,
            total_cost=0.0,
            created_at=session.created_at,
            updated_at=session.updated_at,
        )

    async def get_session(
        self,
        session_id: int,
        user_id: int,
    ) -> Optional[ChatSessionResponse]:
        """
        Get a chat session details.

        Enforces ownership check: User can only retrieve their own sessions.
        """
        result = await self._session_repo.get_with_message_count(session_id, user_id=user_id)
        if not result:
            return None

        session, message_count = result
        return self._to_session_response(session, message_count)

    async def list_sessions(
        self,
        user_id: int,
        *,
        page: int = 1,
        page_size: int = 20,
    ) -> List[ChatSessionResponse]:
        """List all chat sessions for a user with pagination."""
        sessions_with_counts = await self._session_repo.list_by_user(
            user_id, page=page, page_size=page_size
        )
        return [
            self._to_session_response(session, count) for session, count in sessions_with_counts
        ]

    async def update_session_title(
        self,
        session_id: int,
        user_id: int,
        title: str,
    ) -> Optional[ChatSessionResponse]:
        """Update the title of a chat session."""
        session = await self._session_repo.get_by_id(session_id, user_id=user_id)
        if not session:
            return None

        session = await self._session_repo.update_title(session, title)
        await self.db.commit()

        # Get updated session with message count
        result = await self._session_repo.get_with_message_count(session_id)
        if result:
            session, message_count = result
            return self._to_session_response(session, message_count)
        return None

    async def delete_session(
        self,
        session_id: int,
        user_id: int,
    ) -> bool:
        """
        Soft-delete a chat session.

        Returns True if successful, False if session not found or access denied.
        """
        session = await self._session_repo.get_by_id(session_id, user_id=user_id)
        if not session:
            return False

        await self._session_repo.soft_delete(session)
        await self.db.commit()

        logger.info("chat_session_deleted", session_id=session_id)
        return True

    # -------------------------------------------------------------------------
    # Message Operations
    # -------------------------------------------------------------------------

    async def get_messages(
        self,
        session_id: int,
        user_id: int,
        *,
        limit: int = 100,
    ) -> Optional[List[ChatMessageResponse]]:
        """Retrieve messages for a session."""
        # Verify session ownership
        session = await self._session_repo.get_by_id(session_id, user_id=user_id)
        if not session:
            return None

        messages = await self._message_repo.list_by_session(session_id, limit=limit)
        return [self._to_message_response(msg) for msg in messages]

    async def add_user_message(
        self,
        session_id: int,
        content: str,
    ) -> ChatMessageResponse:
        """Add a user message to a session (internal use)."""
        message = await self._message_repo.create(
            session_id=session_id,
            role=MessageRole.USER,
            content=content,
        )
        await self.db.flush()
        return self._to_message_response(message)

    async def add_assistant_message(
        self,
        session_id: int,
        content: str,
        *,
        tokens: int = 0,
        model_used: Optional[str] = None,
        function_calls: Optional[dict] = None,
        grounding_sources: Optional[dict] = None,
    ) -> ChatMessageResponse:
        """Add an assistant message to a session (internal use)."""
        message = await self._message_repo.create(
            session_id=session_id,
            role=MessageRole.ASSISTANT,
            content=content,
            tokens=tokens,
            model_used=model_used,
            function_calls=function_calls,
            grounding_sources=grounding_sources,
        )
        await self.db.flush()
        return self._to_message_response(message)

    async def get_chat_history_for_context(
        self,
        session_id: int,
        *,
        max_chars: int = 16000,
    ) -> List[Dict]:
        """Retrieves recent chat history formatted for AI context window."""
        return await self._message_repo.list_recent_for_context(session_id, max_chars=max_chars)

    async def send_message_with_ai(
        self,
        session_id: int,
        user_id: int,
        content: str,
    ) -> ChatMessageResponse:
        """
        Orchestrate the full message flow:
        1. Validates session access
        2. Persists user message
        3. Retrieves chat history context
        4. Calls AI Orchestrator
        5. Persists and returns AI response
        """

        # Helper for basic token estimation
        def estimate_tokens(text: str) -> int:
            return max(1, len(text) // 4)

        # Verify session ownership
        session = await self._session_repo.get_by_id(session_id, user_id=user_id)
        if not session:
            return None  # Caller should raise 404

        # Save user message
        user_message = await self._message_repo.create(
            session_id=session_id,
            role=MessageRole.USER,
            content=content,
            tokens=estimate_tokens(content),
        )
        await self.db.flush()

        logger.info("user_message_saved", message_id=user_message.id, session_id=session_id)

        # Get chat history for AI context
        messages = await self._message_repo.list_by_session(session_id, limit=50)
        chat_history = [
            {
                "role": msg.role.value if hasattr(msg.role, "value") else msg.role,
                "content": msg.content,
            }
            for msg in messages
            if msg.id != user_message.id
        ]

        logger.info("loaded_chat_history", count=len(chat_history))

        # Call AI orchestrator
        from app.core.ai.orchestrator import get_orchestrator

        orchestrator = get_orchestrator()
        orchestration_result = await orchestrator.handle_message(
            message=content,
            user_id=user_id,
            session_id=session_id,
            context={
                "document_id": session.document_id,
                "context_modules": session.context_modules,
            },
            chat_history=chat_history,
        )

        # Process tool_calls from orchestration result
        tool_calls_data = None
        if orchestration_result.metadata:
            tc = orchestration_result.metadata.get("tool_calls")
            if isinstance(tc, dict):
                tool_calls_data = tc
            elif isinstance(tc, int) and tc > 0:
                tool_calls_data = {"count": tc}

        # Save AI response
        ai_message = await self._message_repo.create(
            session_id=session_id,
            role=MessageRole.ASSISTANT,
            content=orchestration_result.output,
            tokens=orchestration_result.tokens_used or estimate_tokens(orchestration_result.output),
            model_used=orchestration_result.metadata.get("model", orchestration_result.agent_used),
            function_calls=tool_calls_data,
        )

        # Update session token count
        await self._session_repo.update_token_count(
            session, user_message.tokens + ai_message.tokens
        )

        await self.db.commit()
        await self.db.refresh(ai_message)

        logger.info("ai_message_saved", message_id=ai_message.id, session_id=session_id)

        return self._to_message_response(ai_message)

    # -------------------------------------------------------------------------
    # Message Lifecycle Operations
    # -------------------------------------------------------------------------

    async def delete_message(
        self,
        message_id: int,
        user_id: int,
    ) -> bool:
        """
        Delete a specific message.

        Enforces ownership check. Returns True if deleted, False if not found.
        """
        message = await self._message_repo.get_with_ownership_check(message_id, user_id)
        if not message:
            return False

        await self._message_repo.delete(message_id)
        await self.db.commit()

        logger.info("message_deleted", message_id=message_id)
        return True

    async def regenerate_message(
        self,
        message_id: int,
        user_id: int,
    ) -> Optional[ChatMessageResponse]:
        """
        Regenerate an AI response by creating a new version (sibling message).

        Instead of overwriting the old response, creates a new message with
        incremented version at the same branch point. This enables
        Qwen/ChatGPT-style version carousel navigation (< 1/2 >).
        """

        def estimate_tokens(text: str) -> int:
            return max(1, len(text) // 4)

        # Get original assistant message with ownership check
        old_message = await self._message_repo.get_assistant_message_with_owner(message_id, user_id)
        if not old_message:
            return None  # Not found or not assistant message

        # Get the user message that triggered this response
        user_message = await self._message_repo.get_preceding_user_message(
            old_message.session_id, old_message.created_at
        )
        if not user_message:
            raise ValueError("Cannot find original user message")

        # Get session for context
        session = await self._session_repo.get_by_id(old_message.session_id)

        # Get chat history (exclude the old response)
        messages = await self._message_repo.list_by_session(old_message.session_id, limit=50)
        chat_history = [
            {
                "role": msg.role.value if hasattr(msg.role, "value") else msg.role,
                "content": msg.content,
            }
            for msg in messages
            if msg.id != old_message.id
        ]

        # Call AI orchestrator
        from app.core.ai.orchestrator import get_orchestrator

        orchestrator = get_orchestrator()
        result = await orchestrator.handle_message(
            message=user_message.content,
            user_id=user_id,
            session_id=old_message.session_id,
            context={
                "document_id": session.document_id if session else None,
                "context_modules": session.context_modules if session else {},
            },
            chat_history=chat_history,
        )

        # Count existing sibling versions to determine the new version number
        sibling_count = 1  # The original message is version 1
        if old_message.parent_message_id:
            # Count siblings sharing the same parent
            from sqlalchemy import select, func

            count_result = await self.db.execute(
                select(func.count(ChatMessage.id)).where(
                    ChatMessage.parent_message_id == old_message.parent_message_id
                )
            )
            sibling_count = count_result.scalar() or 1

        # Deactivate the old message
        old_message.is_active = False

        # Create a NEW sibling message (new version) with the same parent
        new_message = ChatMessage(
            session_id=old_message.session_id,
            parent_message_id=old_message.parent_message_id or user_message.id,
            role=MessageRole.ASSISTANT,
            content=result.output,
            tokens=result.tokens_used or estimate_tokens(result.output),
            model_used=result.metadata.get("model", result.agent_used),
            version=sibling_count + 1,
            is_active=True,
        )

        # Handle function_calls from result
        if result.metadata:
            tc = result.metadata.get("tool_calls")
            if isinstance(tc, dict):
                new_message.function_calls = tc
            elif isinstance(tc, int) and tc > 0:
                new_message.function_calls = {"count": tc}

        self.db.add(new_message)
        await self.db.commit()
        await self.db.refresh(new_message)

        logger.info(
            "message_regenerated_as_version",
            old_id=message_id,
            new_id=new_message.id,
            version=new_message.version,
        )
        return self._to_message_response(new_message)

    async def edit_message_with_branch(
        self,
        message_id: int,
        user_id: int,
        new_content: str,
    ) -> Optional[List[ChatMessageResponse]]:
        """
        Edit a user message by creating a new conversation branch.

        Steps:
        1. Deactivate original message path
        2. Create new user message (branch point)
        3. Generate new AI response
        4. Return [new_user_msg, new_ai_msg]
        """
        from datetime import datetime

        def estimate_tokens(text: str) -> int:
            return max(1, len(text) // 4)

        # Get original user message with ownership check
        original = await self._message_repo.get_user_message_with_owner(message_id, user_id)
        if not original:
            return None

        # Mark original and descendants as inactive
        original.is_active = False
        await self._message_repo.mark_descendants_inactive(original.session_id, original.created_at)

        # Create new edited message
        new_user_msg = await self._message_repo.create(
            session_id=original.session_id,
            role=MessageRole.USER,
            content=new_content,
            tokens=estimate_tokens(new_content),
            parent_message_id=original.parent_message_id,
            version=(original.version or 0) + 1,
        )
        await self.db.flush()

        logger.info("branch_created", new_message_id=new_user_msg.id, original_id=message_id)

        # Get chat history up to branch point
        history = await self._message_repo.list_active_before(
            original.session_id, original.created_at, limit=50
        )
        chat_history = [
            {
                "role": msg.role.value if hasattr(msg.role, "value") else msg.role,
                "content": msg.content,
            }
            for msg in history
        ]

        # Generate new AI response
        from app.core.ai.orchestrator import get_orchestrator

        orchestrator = get_orchestrator()
        result = await orchestrator.handle_message(
            message=new_content,
            user_id=user_id,
            session_id=original.session_id,
            context={},
            chat_history=chat_history,
        )

        # Create AI response message
        new_ai_msg = await self._message_repo.create(
            session_id=original.session_id,
            role=MessageRole.ASSISTANT,
            content=result.output,
            tokens=result.tokens_used or estimate_tokens(result.output),
            model_used=result.metadata.get("model", result.agent_used),
            parent_message_id=new_user_msg.id,
        )

        await self.db.commit()
        await self.db.refresh(new_user_msg)
        await self.db.refresh(new_ai_msg)

        logger.info(
            "branch_complete",
            user_msg_id=new_user_msg.id,
            ai_msg_id=new_ai_msg.id,
        )

        return [
            self._to_message_response(new_user_msg),
            self._to_message_response(new_ai_msg),
        ]

    # -------------------------------------------------------------------------
    # Branching Operations
    # -------------------------------------------------------------------------

    async def get_conversation_tree(
        self,
        session_id: int,
        user_id: int,
        include_inactive: bool = False,
    ) -> Optional[dict]:
        """
        Retrieve the full conversation tree structure.

        Returns a dictionary containing:
        - session_id
        - messages (list of all messages)
        - branch_points (list of message IDs that have multiple children)
        """
        session = await self._session_repo.get_by_id(session_id, user_id=user_id)
        if not session:
            return None

        # Get messages (optionally including inactive)
        messages = await self._message_repo.list_by_session_with_active_filter(
            session_id, include_inactive=include_inactive
        )

        # Find branch points (messages with multiple children)
        branch_points = await self._message_repo.get_branch_points(session_id)

        # Build message IDs with children for has_children field
        message_ids_with_children = set()
        for msg in messages:
            if msg.parent_message_id:
                message_ids_with_children.add(msg.parent_message_id)

        return {
            "session_id": session_id,
            "messages": [
                self._to_message_response_with_children(msg, msg.id in message_ids_with_children)
                for msg in messages
            ],
            "branch_points": branch_points,
        }

    async def switch_branch(
        self,
        message_id: int,
        user_id: int,
    ) -> Optional[int]:
        """
        Switch the active conversation path to the specified message.

        This deactivates sibling branches and recursively activates the target
        message and its descendants.
        """
        # Get target message with ownership check
        target = await self._message_repo.get_with_ownership_check(message_id, user_id)
        if not target:
            return None

        # Deactivate sibling branches and their descendants
        if target.parent_message_id:
            await self._message_repo.deactivate_sibling_branches(
                target.parent_message_id, message_id, target.session_id
            )

        # Activate target and its descendants
        target.is_active = True
        await self._message_repo.activate_descendants(message_id)

        await self.db.commit()

        logger.info("branch_switched", message_id=message_id)
        return message_id

    # -------------------------------------------------------------------------
    # Extras: Export, Models, Dashboard, Notes
    # -------------------------------------------------------------------------

    async def export_conversation(
        self,
        session_id: int,
        user_id: int,
        format: str = "json",
        include_full_tree: bool = False,
    ) -> Optional[dict]:
        """
        Export conversation data in JSON or Markdown format.
        """
        from datetime import datetime
        import json as json_lib

        session = await self._session_repo.get_by_id(session_id, user_id=user_id)
        if not session:
            return None

        # Get messages
        if include_full_tree:
            messages = await self._message_repo.list_by_session(session_id)
        else:
            messages = await self._message_repo.list_active_by_session(session_id)

        if format == "json":
            export_data = {
                "session": {
                    "id": session.id,
                    "title": session.title,
                    "created_at": session.created_at.isoformat(),
                    "updated_at": session.updated_at.isoformat(),
                    "total_tokens_used": session.total_tokens_used,
                },
                "messages": [
                    {
                        "id": msg.id,
                        "role": msg.role.value if hasattr(msg.role, "value") else msg.role,
                        "content": msg.content,
                        "tokens": msg.tokens,
                        "model_used": msg.model_used,
                        "created_at": msg.created_at.isoformat(),
                        "parent_message_id": msg.parent_message_id,
                        "version": msg.version,
                        "is_active": msg.is_active,
                    }
                    for msg in messages
                ],
                "exported_at": datetime.utcnow().isoformat(),
                "export_options": {"include_full_tree": include_full_tree},
            }
            content = json_lib.dumps(export_data, indent=2, ensure_ascii=False)
            filename = f"conversation_{session_id}_{datetime.utcnow().strftime('%Y%m%d')}.json"
            media_type = "application/json"
        else:
            # Markdown format
            lines = [
                f"# {session.title}",
                "",
                f"*Exported on {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}*",
                "",
                "---",
                "",
            ]
            for msg in messages:
                role_value = msg.role.value if hasattr(msg.role, "value") else msg.role
                role_emoji = "👤" if role_value == "user" else "🤖"
                role_name = "User" if role_value == "user" else "Assistant"
                timestamp = msg.created_at.strftime("%Y-%m-%d %H:%M")
                lines.extend(
                    [
                        f"### {role_emoji} {role_name}",
                        f"*{timestamp}*",
                        "",
                        msg.content,
                        "",
                        "---",
                        "",
                    ]
                )
            lines.extend(
                [
                    "",
                    "## Metadata",
                    "",
                    f"- **Session ID**: {session.id}",
                    f"- **Messages**: {len(messages)}",
                    f"- **Total Tokens**: {session.total_tokens_used}",
                ]
            )
            content = "\n".join(lines)
            filename = f"conversation_{session_id}_{datetime.utcnow().strftime('%Y%m%d')}.md"
            media_type = "text/markdown"

        logger.info("conversation_exported", session_id=session_id, format=format)
        return {"content": content, "filename": filename, "media_type": media_type}

    def get_ai_models(self) -> list[dict]:
        """Return list of available AI models, pulled dynamically from MODEL_REGISTRY."""
        from app.core.ai.registry.models import MODEL_REGISTRY

        # Human-readable names for registry keys
        _DISPLAY_NAMES: dict[str, str] = {
            "deepseek_v3_1": "DeepSeek V3.1",
            "deepseek_v3_2": "DeepSeek V3.2",
            "qwen3_coder": "Qwen3 Coder 480B",
            "qwen3_next": "Qwen3 Next 80B",
            "qwen3_vl": "Qwen3 VL 235B",
            "gpt_oss_120b": "GPT-OSS 120B",
            "gpt_oss_20b": "GPT-OSS 20B",
            "gemini_flash": "Gemini 2.5 Flash",
            "gemini_pro": "Gemini 1.5 Pro",
            "gemini_thinking": "Gemini 2.0 Flash (Thinking)",
        }

        models = []
        for key, descriptor in MODEL_REGISTRY.items():
            capabilities = [cap.value for cap in descriptor.capabilities]
            models.append(
                {
                    "id": key,
                    "name": _DISPLAY_NAMES.get(key, key),
                    "description": ", ".join(descriptor.strengths) if descriptor.strengths else "",
                    "capabilities": capabilities,
                    "max_tokens": descriptor.max_context_tokens,
                    "supports_vision": descriptor.supports_multimodal,
                    "supports_search": False,
                    "provider": descriptor.provider,
                    "tier": descriptor.tier.value
                    if hasattr(descriptor.tier, "value")
                    else str(descriptor.tier),
                    "supports_thinking": descriptor.supports_thinking,
                }
            )

        # Ollama models first (higher priority), then Google
        models.sort(key=lambda m: (0 if m["provider"] == "ollama" else 1, m["name"]))
        return models

    async def send_dashboard_message(
        self,
        user_id: int,
        content: str,
    ) -> ChatMessageResponse:
        """
        Send message to the Dashboard Orchestrator.

        Interacts with the system-level Dashboard Agent that allows control
        over the Synapse platform (navigating modules, creating resources).
        """
        from datetime import datetime
        from app.core.ai.context.dashboard_context_builder import build_dashboard_context
        from app.core.ai.orchestrator import get_orchestrator

        DASHBOARD_SESSION_KEY = "synapse_dashboard_session"

        def estimate_tokens(text: str) -> int:
            return max(1, len(text) // 4)

        # Get or create dashboard session
        session = await self._session_repo.get_by_title(user_id, DASHBOARD_SESSION_KEY)
        if not session:
            session = await self._session_repo.create(user_id=user_id, title=DASHBOARD_SESSION_KEY)
            await self.db.commit()

        # Save user message
        user_msg = await self._message_repo.create(
            session_id=session.id,
            role=MessageRole.USER,
            content=content,
            tokens=estimate_tokens(content),
        )
        await self.db.commit()

        # Build context and get history
        context = await build_dashboard_context(user_id=user_id, db=self.db)
        context["agent_preference"] = "dashboard"

        messages = await self._message_repo.list_by_session(session.id, limit=20)
        chat_history = [
            {
                "role": msg.role.value if hasattr(msg.role, "value") else msg.role,
                "content": msg.content,
            }
            for msg in messages
            if msg.id != user_msg.id
        ]

        # Call orchestrator
        orchestrator = get_orchestrator()
        result = await orchestrator.handle_message(
            message=content,
            user_id=user_id,
            session_id=session.id,
            context=context,
            chat_history=chat_history,
        )

        # Extract actions taken
        actions_taken = []
        tool_calls = result.metadata.get("tool_calls", [])
        if isinstance(tool_calls, list):
            for tc in tool_calls:
                tr = tc.get("result", {})
                if isinstance(tr, dict) and tr.get("success"):
                    actions_taken.append(
                        {
                            "type": tc.get("tool", ""),
                            "data": tr.get("data", {}),
                            "message": tr.get("message", ""),
                        }
                    )

        # Save AI response
        ai_msg = await self._message_repo.create(
            session_id=session.id,
            role=MessageRole.ASSISTANT,
            content=result.output,
            tokens=result.tokens_used or estimate_tokens(result.output),
            model_used=result.agent_used,
            function_calls={"tool_calls": tool_calls, "actions_taken": actions_taken},
        )

        session.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(ai_msg)

        logger.info("dashboard_message_sent", message_id=ai_msg.id, actions=len(actions_taken))
        return self._to_message_response(ai_msg)

    async def send_notes_message(
        self,
        user_id: int,
        content: str,
    ) -> ChatMessageResponse:
        """
        Send message to the Notes AI Agent.

        Specialized for text editing, summarizing, and note generation.
        Maintains a separate persistent session.
        """
        from datetime import datetime
        from app.core.ai.orchestrator import get_orchestrator

        NOTES_SESSION_KEY = "synapse_notes_session"

        def estimate_tokens(text: str) -> int:
            return max(1, len(text) // 4)

        # Get or create notes session
        session = await self._session_repo.get_by_title(user_id, NOTES_SESSION_KEY)
        if not session:
            session = await self._session_repo.create(user_id=user_id, title=NOTES_SESSION_KEY)
            await self.db.commit()

        # Save user message
        user_msg = await self._message_repo.create(
            session_id=session.id,
            role=MessageRole.USER,
            content=content,
            tokens=estimate_tokens(content),
        )
        await self.db.commit()

        # Minimal context
        context = {"agent_preference": "notes", "task_type": "text_editing"}

        # Get last 5 messages for history
        messages = await self._message_repo.list_by_session(session.id, limit=5)
        chat_history = [
            {
                "role": msg.role.value if hasattr(msg.role, "value") else msg.role,
                "content": msg.content,
            }
            for msg in messages
            if msg.id != user_msg.id
        ]

        # Call orchestrator
        orchestrator = get_orchestrator()
        result = await orchestrator.handle_message(
            message=content,
            user_id=user_id,
            session_id=session.id,
            context=context,
            chat_history=chat_history,
        )

        # Save AI response
        ai_msg = await self._message_repo.create(
            session_id=session.id,
            role=MessageRole.ASSISTANT,
            content=result.output,
            tokens=result.tokens_used or estimate_tokens(result.output),
            model_used=result.agent_used,
        )

        session.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(ai_msg)

        logger.info("notes_message_sent", message_id=ai_msg.id)
        return self._to_message_response(ai_msg)

    def _to_message_response_with_children(self, msg, has_children: bool) -> ChatMessageResponse:
        """Internal: Convert message to response DTO with has_children field."""
        return ChatMessageResponse(
            id=msg.id,
            session_id=msg.session_id,
            role=msg.role,
            content=msg.content,
            tokens=msg.tokens,
            model_used=msg.model_used,
            function_calls=msg.function_calls if isinstance(msg.function_calls, dict) else None,
            grounding_sources=msg.grounding_sources
            if isinstance(msg.grounding_sources, dict)
            else None,
            created_at=msg.created_at,
            parent_message_id=msg.parent_message_id,
            version=msg.version,
            is_active=msg.is_active,
            has_children=has_children,
        )

    # -------------------------------------------------------------------------
    # Internal Helpers
    # -------------------------------------------------------------------------

    def _to_session_response(self, session, message_count: int) -> ChatSessionResponse:
        """Internal: Convert ChatSession model to response DTO."""
        return ChatSessionResponse(
            id=session.id,
            user_id=session.user_id,
            title=session.title,
            document_id=session.document_id,
            context_modules=(
                session.context_modules.get("modules", []) if session.context_modules else []
            ),
            message_count=message_count,
            total_tokens_used=session.total_tokens_used,
            total_cost=float(session.total_cost or 0.0),
            created_at=session.created_at,
            updated_at=session.updated_at,
        )

    def _to_message_response(self, msg) -> ChatMessageResponse:
        """Internal: Convert ChatMessage model to response DTO."""
        return ChatMessageResponse(
            id=msg.id,
            session_id=msg.session_id,
            role=msg.role,
            content=msg.content,
            tokens=msg.tokens,
            model_used=msg.model_used,
            function_calls=msg.function_calls if isinstance(msg.function_calls, dict) else None,
            grounding_sources=msg.grounding_sources
            if isinstance(msg.grounding_sources, dict)
            else None,
            created_at=msg.created_at,
        )


def get_chat_service(db: AsyncSession) -> ChatService:
    """Factory function to instantiate ChatService with a database session."""
    return ChatService(db)
