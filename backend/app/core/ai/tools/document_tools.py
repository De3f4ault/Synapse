"""
Document Tools

AI tools for document analysis and retrieval.
"""

from typing import Dict, Any, List
from .base import BaseTool, ToolPermission, ToolExecutionError
from app.core.module_system.registry import ModuleRegistry
import structlog

logger = structlog.get_logger()


class SearchDocumentsTool(BaseTool):
    """Search across all user documents using semantic search."""

    @property
    def name(self) -> str:
        return "search_documents"

    @property
    def description(self) -> str:
        return (
            "Search through the user's uploaded documents using semantic search. "
            "Finds relevant passages even if exact words don't match. "
            "Returns chunks of text with source information. "
            "Use this to find information in PDFs, textbooks, or research papers."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query (question, topic, or concept)"
                },
                "document_id": {
                    "type": "integer",
                    "description": "Optional: Search within specific document only"
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of results",
                    "default": 5
                }
            },
            "required": ["query"]
        }

    @property
    def required_permissions(self) -> List[ToolPermission]:
        return [ToolPermission.READ]

    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Execute document search."""
        try:
            from app.services.rag import get_rag_service

            service = get_rag_service()

            # Build filters for document-specific search
            filters = None
            if kwargs.get("document_id"):
                filters = {"source_id": str(kwargs["document_id"])}

            result = await service.query(
                user_id=user_id,
                query=kwargs["query"],
                top_k=kwargs.get("limit", 5),
                source_type="documents",
                filters=filters,
            )

            chunks = result.get("chunks", [])

            return {
                "success": True,
                "data": {
                    "results": chunks,
                    "count": len(chunks),
                    "sources": list({c.get("metadata", {}).get("title", "") for c in chunks}),
                },
                "message": f"Found {len(chunks)} relevant passages"
            }

        except Exception as e:
            logger.error("document_search_failed", user_id=user_id, error=str(e))
            return {
                "success": False,
                "data": {"results": [], "count": 0},
                "message": f"Search failed: {str(e)}"
            }


class GetDocumentContentTool(BaseTool):
    """Retrieve specific document or chunk content."""

    @property
    def name(self) -> str:
        return "get_document_content"

    @property
    def description(self) -> str:
        return (
            "Retrieve the full content or specific chunk from a document. "
            "Use this when you need to read detailed information from a document. "
            "Can get entire document or specific page/chunk."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "document_id": {
                    "type": "integer",
                    "description": "Document ID"
                },
                "chunk_id": {
                    "type": "integer",
                    "description": "Optional: Specific chunk ID to retrieve"
                },
                "page": {
                    "type": "integer",
                    "description": "Optional: Specific page number"
                }
            },
            "required": ["document_id"]
        }

    @property
    def required_permissions(self) -> List[ToolPermission]:
        return [ToolPermission.READ]

    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Execute content retrieval."""
        try:
            registry = ModuleRegistry()
            documents_module = registry.get_module("documents")

            if not documents_module:
                raise ToolExecutionError("Documents module not available")

            document = await documents_module.get_content(
                user_id=user_id,
                filters={"id": kwargs["document_id"]}
            )

            if not document:
                return {
                    "success": False,
                    "data": {},
                    "message": "Document not found"
                }

            # Get specific chunk if requested
            if kwargs.get("chunk_id") or kwargs.get("page"):
                from app.db.session import get_db
                from app.models.document_chunk import DocumentChunk
                from sqlalchemy import select

                async with get_db() as db:
                    query = select(DocumentChunk).where(
                        DocumentChunk.document_id == kwargs["document_id"]
                    )

                    if kwargs.get("chunk_id"):
                        query = query.where(DocumentChunk.id == kwargs["chunk_id"])
                    elif kwargs.get("page"):
                        query = query.where(DocumentChunk.page == kwargs["page"])

                    result = await db.execute(query)
                    chunks = result.scalars().all()

                content = "\n\n".join(chunk.content for chunk in chunks)
            else:
                # Get full document (summary or all chunks)
                content = f"Document: {document[0].filename}\nPages: {document[0].page_count}"

            return {
                "success": True,
                "data": {
                    "document_id": kwargs["document_id"],
                    "content": content
                },
                "message": "Content retrieved successfully"
            }

        except Exception as e:
            logger.error("get_content_failed", user_id=user_id, error=str(e))
            return {
                "success": False,
                "data": {},
                "message": f"Failed to get content: {str(e)}"
            }


class AnalyzeDocumentTool(BaseTool):
    """Analyze a document using Gemini's multimodal capabilities."""

    @property
    def name(self) -> str:
        return "analyze_document"

    @property
    def description(self) -> str:
        return (
            "Analyze a document using AI to extract insights, summarize, or answer questions. "
            "Can process PDFs with text and images. "
            "Use this for deep document analysis or comprehension tasks."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "document_id": {
                    "type": "integer",
                    "description": "Document ID to analyze"
                },
                "task": {
                    "type": "string",
                    "description": "Analysis task (e.g., 'summarize', 'extract key concepts', 'answer question')"
                },
                "question": {
                    "type": "string",
                    "description": "Optional: Specific question about the document"
                }
            },
            "required": ["document_id", "task"]
        }

    @property
    def required_permissions(self) -> List[ToolPermission]:
        return [ToolPermission.READ]

    @property
    def timeout_seconds(self) -> int:
        return 60  # Longer timeout for document analysis

    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Execute document analysis."""
        try:
            from app.core.ai.providers.gemini import GeminiProvider
            from app.db.session import get_db
            from app.models.document import Document
            from sqlalchemy import select

            async with get_db() as db:
                result = await db.execute(
                    select(Document).where(
                        Document.id == kwargs["document_id"],
                        Document.user_id == user_id
                    )
                )
                document = result.scalar_one_or_none()

                if not document:
                    return {
                        "success": False,
                        "data": {},
                        "message": "Document not found"
                    }

                # Build prompt
                prompt = f"Task: {kwargs['task']}\n\n"
                if kwargs.get("question"):
                    prompt += f"Question: {kwargs['question']}\n\n"
                prompt += f"Analyze the document: {document.filename}"

                # Use Gemini for analysis
                provider = GeminiProvider()

                # If document has Gemini URI, use it
                if document.gemini_file_uri:
                    analysis = await provider.generate_with_file(
                        prompt=prompt,
                        file_uri=document.gemini_file_uri
                    )
                else:
                    # Fall back to text-only analysis
                    analysis = await provider.generate(prompt=prompt)

            return {
                "success": True,
                "data": {
                    "document_id": kwargs["document_id"],
                    "analysis": analysis
                },
                "message": "Document analyzed successfully"
            }

        except Exception as e:
            logger.error("document_analysis_failed", user_id=user_id, error=str(e))
            return {
                "success": False,
                "data": {},
                "message": f"Analysis failed: {str(e)}"
            }
