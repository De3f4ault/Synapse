"""
RAG Tools - Agent tools that use the RAGPipeline for retrieval.

These tools enable agents to invoke the sophisticated RAG system
(Dense + Sparse + Hybrid + Reranking + Personalization) on demand.

The agent decides WHEN to retrieve - RAG is a capability, not a reflex.
"""

from typing import Dict, Any, List, Optional
from .base import BaseTool, ToolPermission
import structlog

logger = structlog.get_logger()


class SearchNotesTool(BaseTool):
    """
    Search user's notes using the RAG pipeline.

    Uses:
    - Hybrid search (dense + sparse)
    - Cross-encoder reranking
    - Learning-aware personalization

    Agent should call this when:
    - User asks about their notes
    - User needs information from documents
    - User wants to review material
    """

    @property
    def name(self) -> str:
        return "search_notes"

    @property
    def description(self) -> str:
        return (
            "Search through the user's notes and documents to find relevant information. "
            "Uses semantic search with personalization based on learning progress. "
            "Call this when the user asks about their notes, documents, or needs to find "
            "information they've previously saved."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query - what information to find",
                },
                "top_k": {
                    "type": "integer",
                    "description": "Number of results to return (default: 5)",
                },
                "include_content": {
                    "type": "boolean",
                    "description": "Whether to include full content in results (default: true)",
                },
            },
            "required": ["query"],
        }

    @property
    def required_permissions(self) -> List[ToolPermission]:
        return [ToolPermission.READ]

    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Execute note search using RAG pipeline."""
        query = kwargs.get("query", "")
        top_k = kwargs.get("top_k", 5)
        include_content = kwargs.get("include_content", True)

        if not query:
            return {"success": False, "message": "Query is required", "data": {"results": []}}

        try:
            from app.core.ai.rag.pipeline import RAGPipeline

            # Initialize pipeline with all features enabled
            pipeline = RAGPipeline(
                enable_reranking=True, enable_learning_aware=True, enable_query_enhancement=True
            )

            # Execute search
            result = await pipeline.query(
                user_id=user_id, query=query, top_k=top_k, source_type="notes"
            )

            # Format results
            formatted_results = []
            for chunk in result.get("chunks", []):
                formatted = {
                    "id": chunk.get("id"),
                    "title": chunk.get("metadata", {}).get("title", "Untitled"),
                    "relevance_score": chunk.get("score", 0.0),
                    "snippet": chunk.get("text", "")[:300] + "..."
                    if len(chunk.get("text", "")) > 300
                    else chunk.get("text", ""),
                }
                if include_content:
                    formatted["full_content"] = chunk.get("text", "")
                formatted_results.append(formatted)

            self.logger.info(
                "notes_search_completed",
                user_id=user_id,
                query=query[:50],
                results_count=len(formatted_results),
                reranked=result.get("reranked", False),
                personalized=result.get("learning_aware", False),
            )

            return {
                "success": True,
                "data": {
                    "query": query,
                    "results": formatted_results,
                    "total_found": result.get("count", 0),
                    "personalized": result.get("learning_aware", False),
                },
                "message": f"Found {len(formatted_results)} relevant notes",
            }

        except Exception as e:
            self.logger.error(
                "notes_search_failed",
                user_id=user_id,
                query=query[:50],
                error=str(e),
                exc_info=True,
            )
            return {
                "success": False,
                "message": f"Search failed: {str(e)}",
                "data": {"results": []},
            }


class SearchFlashcardsTool(BaseTool):
    """
    Search user's flashcards using the RAG pipeline.

    Finds flashcards related to a topic, prioritizing:
    - Cards in weak areas (need more practice)
    - Recently studied cards
    - High-relevance semantic matches
    """

    @property
    def name(self) -> str:
        return "search_flashcards"

    @property
    def description(self) -> str:
        return (
            "Search through the user's flashcard decks to find relevant cards. "
            "Prioritizes cards the user needs to practice most. "
            "Call this when the user asks about flashcards, wants to review, "
            "or needs to find cards on a specific topic."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query - what topic or content to find",
                },
                "top_k": {
                    "type": "integer",
                    "description": "Number of cards to return (default: 10)",
                },
                "deck_id": {
                    "type": "integer",
                    "description": "Optional: limit search to specific deck",
                },
                "prioritize_weak": {
                    "type": "boolean",
                    "description": "Prioritize cards user struggles with (default: true)",
                },
            },
            "required": ["query"],
        }

    @property
    def required_permissions(self) -> List[ToolPermission]:
        return [ToolPermission.READ]

    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Execute flashcard search using RAG pipeline."""
        query = kwargs.get("query", "")
        top_k = kwargs.get("top_k", 10)
        deck_id = kwargs.get("deck_id")
        prioritize_weak = kwargs.get("prioritize_weak", True)

        if not query:
            return {"success": False, "message": "Query is required", "data": {"results": []}}

        try:
            from app.core.ai.rag.pipeline import RAGPipeline

            # Initialize pipeline with learning-aware features
            pipeline = RAGPipeline(
                enable_reranking=True,
                enable_learning_aware=prioritize_weak,
                enable_query_enhancement=True,
            )

            # Execute search
            result = await pipeline.query(
                user_id=user_id, query=query, top_k=top_k, source_type="flashcards"
            )

            # Format results as flashcard-friendly output
            formatted_cards = []
            for chunk in result.get("chunks", []):
                metadata = chunk.get("metadata", {})
                formatted_cards.append(
                    {
                        "id": chunk.get("id"),
                        "deck_name": metadata.get("deck_name", "Unknown Deck"),
                        "deck_id": metadata.get("deck_id"),
                        "front": metadata.get("front", chunk.get("text", "")[:200]),
                        "back": metadata.get("back", ""),
                        "relevance_score": chunk.get("score", 0.0),
                        "mastery_level": metadata.get("mastery_level", "unknown"),
                        "due_for_review": metadata.get("due_for_review", False),
                    }
                )

            self.logger.info(
                "flashcard_search_completed",
                user_id=user_id,
                query=query[:50],
                results_count=len(formatted_cards),
                prioritize_weak=prioritize_weak,
            )

            return {
                "success": True,
                "data": {
                    "query": query,
                    "cards": formatted_cards,
                    "total_found": result.get("count", 0),
                    "personalized": result.get("learning_aware", False),
                },
                "message": f"Found {len(formatted_cards)} relevant flashcards",
            }

        except Exception as e:
            self.logger.error(
                "flashcard_search_failed",
                user_id=user_id,
                query=query[:50],
                error=str(e),
                exc_info=True,
            )
            return {"success": False, "message": f"Search failed: {str(e)}", "data": {"cards": []}}


class AnalyzeDocumentTool(BaseTool):
    """
    Analyze a specific document using RAG for context retrieval.

    Useful for deep-dive questions about a specific document.
    """

    @property
    def name(self) -> str:
        return "analyze_document"

    @property
    def description(self) -> str:
        return (
            "Analyze a specific document to answer questions about its content. "
            "Use this when the user asks about a particular document they've uploaded, "
            "or needs detailed information from a specific source."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "document_id": {"type": "integer", "description": "ID of the document to analyze"},
                "question": {
                    "type": "string",
                    "description": "Question to answer about the document",
                },
                "detailed": {
                    "type": "boolean",
                    "description": "Whether to include detailed excerpts (default: true)",
                },
            },
            "required": ["document_id", "question"],
        }

    @property
    def required_permissions(self) -> List[ToolPermission]:
        return [ToolPermission.READ]

    async def execute(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Analyze document using RAG pipeline."""
        document_id = kwargs.get("document_id")
        question = kwargs.get("question", "")
        detailed = kwargs.get("detailed", True)

        if not document_id or not question:
            return {
                "success": False,
                "message": "Both document_id and question are required",
                "data": {},
            }

        try:
            from app.core.ai.rag.pipeline import RAGPipeline

            # Initialize pipeline
            pipeline = RAGPipeline(enable_reranking=True, enable_learning_aware=True)

            # Search within specific document
            # Note: This would filter by document_id in production
            result = await pipeline.query(
                user_id=user_id,
                query=question,
                top_k=5,
                source_type="documents",
                # filter={"document_id": document_id}  # TODO: Add filter support
            )

            # Extract relevant passages
            passages = []
            for chunk in result.get("chunks", []):
                passages.append(
                    {
                        "text": chunk.get("text", ""),
                        "page": chunk.get("metadata", {}).get("page"),
                        "relevance": chunk.get("score", 0.0),
                    }
                )

            # Generate summary response
            if passages:
                answer_context = "\n\n".join([p["text"] for p in passages[:3]])
            else:
                answer_context = "No relevant content found in document."

            self.logger.info(
                "document_analysis_completed",
                user_id=user_id,
                document_id=document_id,
                question=question[:50],
                passages_found=len(passages),
            )

            return {
                "success": True,
                "data": {
                    "document_id": document_id,
                    "question": question,
                    "relevant_passages": passages if detailed else [],
                    "summary_context": answer_context,
                },
                "message": f"Found {len(passages)} relevant passages in document",
            }

        except Exception as e:
            self.logger.error(
                "document_analysis_failed",
                user_id=user_id,
                document_id=document_id,
                error=str(e),
                exc_info=True,
            )
            return {"success": False, "message": f"Analysis failed: {str(e)}", "data": {}}


# Tool factory functions
def get_search_notes_tool() -> SearchNotesTool:
    """Get SearchNotesTool instance."""
    return SearchNotesTool()


def get_search_flashcards_tool() -> SearchFlashcardsTool:
    """Get SearchFlashcardsTool instance."""
    return SearchFlashcardsTool()


def get_analyze_document_tool() -> AnalyzeDocumentTool:
    """Get AnalyzeDocumentTool instance."""
    return AnalyzeDocumentTool()


def register_rag_tools():
    """Register all RAG tools in the global registry."""
    from .registry import get_registry

    registry = get_registry()

    tools = [SearchNotesTool(), SearchFlashcardsTool(), AnalyzeDocumentTool()]

    for tool in tools:
        if not registry.tool_exists(tool.name):
            registry.register_tool(tool)
            logger.info("rag_tool_registered", tool=tool.name)

    return tools
