"""
Document Agent - Analyzes documents and extracts insights

Specializes in:
- Document analysis (multimodal with Gemini)
- Information extraction
- Question answering from documents
- Generating study materials from documents

Uses Gemini 2.5 Pro for complex document analysis.
"""

from typing import Dict, Any, List, Optional
from app.core.ai.agents.base_agent import BaseAgent, AgentConfig, AgentCapability
import structlog

logger = structlog.get_logger(__name__)


class DocumentAgent(BaseAgent):
    """
    Document Analysis Agent with multimodal capabilities

    Specialized for:
    - Analyzing uploaded PDFs, EPUBs, DOCX
    - Extracting key concepts and themes
    - Answering document-specific questions
    - Generating flashcards from content
    - Creating quizzes from documents
    - Summarizing chapters/sections

    Uses Gemini 2.5 Pro for:
    - Deep semantic understanding
    - Multimodal analysis (text + images)
    - Long-form document processing

    Usage:
        agent = await create_agent(
            "document",
            tools=["search_documents", "analyze_document", "generate_questions"]
        )

        result = await agent.execute(
            user_id=1,
            input="Summarize chapter 3 of my biology textbook",
            context={"document_id": 123}
        )
    """

    async def _get_system_prompt(self, context: Dict[str, Any]) -> str:
        """
        Build document analysis prompt with document context

        Args:
            context: Includes document_context, user_context

        Returns:
            Complete system prompt
        """
        document_context = context.get("document_context", {})
        user_context = context.get("user_context", {})
        weak_areas = context.get("weak_areas", [])

        # Extract document metadata
        doc_title = document_context.get("title", "Unknown Document")
        doc_type = document_context.get("type", "unknown")
        doc_pages = document_context.get("pages", "unknown")

        # Build weak areas focus
        weak_areas_text = ""
        if weak_areas:
            weak_areas_text = "\n**Student's Weak Areas (prioritize in analysis):**\n"
            for area in weak_areas[:3]:
                weak_areas_text += f"- {area.get('topic')}\n"

        prompt = f"""You are a document analysis specialist for SYNAPSE, a personalized learning platform.

**Your Role:**
Analyze documents thoroughly to extract educational value and help students learn effectively. You combine deep analysis with pedagogical awareness.

**Current Document:**
- Title: {doc_title}
- Type: {doc_type}
- Pages: {doc_pages}
{weak_areas_text}

**Analysis Capabilities:**
1. **Deep Reading**: Understand main themes, arguments, and structure
2. **Concept Extraction**: Identify key ideas, definitions, and relationships
3. **Multimodal Analysis**: Analyze text, images, diagrams, and tables
4. **Contextualization**: Connect document content to broader topics
5. **Study Material Generation**: Create flashcards, quizzes, summaries

**Available Tools:**
- `search_documents`: Find relevant sections using semantic search
- `get_document_content`: Retrieve full document or specific pages
- `analyze_document`: Deep multimodal analysis with Gemini
- `create_flashcard`: Generate flashcards for key concepts
- `create_quiz`: Create questions from content
- `search_notes`: Find related study notes
- `plan`: Break down complex analysis into steps

**Analysis Approach (Systematic):**

**Step 1: Understand the Request**
- What specific information does the student need?
- Is this for learning, review, or assignment help?
- What's the student's current understanding level?

**Step 2: Locate Relevant Content**
Use semantic search to find pertinent sections:
- Search for key terms and concepts
- Identify relevant chapters/sections
- Note important diagrams or tables

**Step 3: Extract Key Information**
- Main concepts and definitions
- Important facts and figures
- Relationships between ideas
- Supporting examples
- Visual information from diagrams

**Step 4: Structure the Analysis**
- Organize logically (not just chronologically)
- Highlight most important points first
- Group related concepts together
- Note dependencies (concept A requires understanding B)

**Step 5: Generate Study Materials**
Offer to create:
- Flashcards for key definitions and facts
- Practice questions for comprehension
- Summary notes for review
- Concept maps for relationships

**Output Guidelines:**

*For Summaries:*
- Lead with main idea
- Use hierarchical structure (main points → details)
- Include specific page references
- Highlight key terms
- Note any confusing sections

*For Concept Extraction:*
```
Concept: [Name]
Definition: [Clear explanation]
Importance: [Why it matters]
Related to: [Other concepts]
Example: [Real-world application]
Source: Page X, Section Y
```

*For Question Answering:*
- Answer directly and concisely
- Support with evidence from document
- Cite specific pages
- Explain reasoning if complex
- Suggest related concepts to explore

*For Study Material Generation:*
- Focus on concepts worth memorizing
- Vary difficulty levels
- Include explanations, not just facts
- Connect to weak areas when possible

**Special Considerations:**

*For Textbooks:*
- Identify learning objectives
- Note end-of-chapter questions
- Extract key formulas/definitions
- Map chapter flow

*For Research Papers:*
- Summarize methodology
- Extract key findings
- Note limitations
- Identify implications

*For Study Guides:*
- Organize by topic/theme
- Create comprehensive flashcard sets
- Generate practice tests
- Build review checklists

**Handling Complex Documents:**
For lengthy analysis, use planning:
```
plan(
    current_task="Analyze entire biology textbook chapter",
    next_steps=[
        "Extract main concepts from introduction",
        "Analyze each section systematically",
        "Create flashcards for key terms",
        "Generate quiz questions",
        "Create summary document"
    ]
)
```

**Quality Standards:**
- **Accuracy**: Verify all extracted information
- **Completeness**: Don't miss important concepts
- **Clarity**: Explain in accessible language
- **Utility**: Focus on what helps learning
- **Citation**: Always reference source pages

**Example Interaction:**

Student: "Summarize chapter 3 on photosynthesis"

You: "I'll analyze chapter 3 for you. Let me search for the key sections..."

[Uses search_documents to find chapter 3]

You: "Found chapter 3 (pages 45-62). Here's a structured summary:

**Main Concept**: Photosynthesis (page 45)
Plants convert light energy into chemical energy (glucose)

**Key Process** (pages 46-50):
1. Light-dependent reactions (thylakoid)
   - Chlorophyll absorbs light
   - Water splits → O2 released
   - ATP and NADPH produced

2. Light-independent reactions (Calvin cycle, stroma)
   - CO2 fixed into glucose
   - Uses ATP and NADPH

**Important Terms** (I can create flashcards):
- Chloroplast, Thylakoid, Stroma
- Chlorophyll, Carotenoids
- ATP, NADPH, Glucose

**Diagram Analysis** (page 48):
The diagram shows electron flow in the light reactions...

Would you like me to:
1. Create flashcards for these concepts?
2. Generate practice questions?
3. Explain any section in more detail?"

**Context Awareness:**
- If analyzing content related to weak areas, provide extra detail
- Adapt explanation depth to student's mastery level
- Connect to previously studied materials
- Suggest next topics to study

**Error Handling:**
- If document not found: suggest uploading or checking title
- If content unclear: note ambiguity and ask for clarification
- If outside scope: politely redirect while offering related help

**Remember:**
- You're not just extracting text—you're facilitating learning
- Every document is an opportunity to build understanding
- Quality analysis > quick summaries
- Your thoroughness directly impacts student success

Let's help this student learn from their materials! 📚
"""

        return prompt

    async def _analyze_document_section(
        self, document_id: int, section: str, user_id: int
    ) -> Dict[str, Any]:
        """
        Analyze specific document section using real content and caching.

        Args:
            document_id: Document to analyze
            section: Section identifier (page, chapter, or "full")
            user_id: User requesting analysis

        Returns:
            Analysis results with concepts, summary, and key points
        """
        logger.info(
            "document_section_analysis", document_id=document_id, section=section, user_id=user_id
        )

        try:
            # 1. Fetch document and its content from database
            from app.db.session import AsyncSessionLocal
            from app.models.document import Document
            from app.models.document_chunk import DocumentChunk
            from sqlalchemy import select, and_

            async with AsyncSessionLocal() as db:
                # Get document
                doc_result = await db.execute(
                    select(Document).where(
                        and_(
                            Document.id == document_id,
                            Document.user_id == user_id,
                            Document.deleted_at.is_(None),
                        )
                    )
                )
                document = doc_result.scalar_one_or_none()

                if not document:
                    return {"section": section, "error": f"Document {document_id} not found"}

                # Get document content (either full text or chunks)
                if document.content_text:
                    doc_content = document.content_text
                else:
                    # Fall back to chunks
                    chunks_result = await db.execute(
                        select(DocumentChunk)
                        .where(DocumentChunk.document_id == document_id)
                        .order_by(DocumentChunk.chunk_index)
                    )
                    chunks = chunks_result.scalars().all()
                    doc_content = "\n\n".join([c.content for c in chunks])

                if not doc_content:
                    return {"section": section, "error": "Document has no extracted content"}

            # 2. Use context caching for efficient analysis
            from app.core.ai.providers.cache_manager import get_cache_manager

            cache_manager = get_cache_manager()

            # Cache the document (or use existing cache)
            cache_name = await cache_manager.cache_document(
                user_id=user_id,
                document_id=str(document_id),
                content=doc_content,
                title=document.filename,
                ttl_seconds=3600,  # 1 hour cache
            )

            # 3. Query the cached document for analysis
            analysis_prompt = f"""Analyze the following section/aspect of this document: {section}

Provide:
1. **Key Concepts**: Main ideas and definitions (bullet points)
2. **Summary**: 2-3 paragraph summary of the content
3. **Key Points**: Most important takeaways
4. **Suggested Flashcards**: 3-5 flashcard ideas for studying this content

Format as structured text with clear headers."""

            result = await cache_manager.query_cached_document(
                cache_name=cache_name,
                query=analysis_prompt,
                temperature=0.3,  # Slightly creative for summaries
            )

            logger.info(
                "document_analysis_completed",
                document_id=document_id,
                section=section,
                cached_tokens=result.get("cached_tokens", 0),
            )

            # Parse the response into structured format
            response_text = result.get("text", "")

            return {
                "section": section,
                "document_id": document_id,
                "document_title": document.filename,
                "analysis": response_text,
                "cached_tokens": result.get("cached_tokens", 0),
                "cache_name": cache_name,
            }

        except Exception as e:
            logger.error("analysis_failed", error=str(e), document_id=document_id)
            return {"section": section, "error": str(e)}


def create_document_agent_config() -> AgentConfig:
    """
    Factory method for document agent configuration

    Uses Gemini Pro for complex analysis

    Returns:
        AgentConfig with document-specific settings
    """
    return AgentConfig(
        name="document",
        display_name="Document Analyst",
        description="Analyzes documents and extracts educational insights using multimodal AI",
        capabilities=[
            AgentCapability.CHAT,
            AgentCapability.TOOL_USE,
            AgentCapability.FILE_ACCESS,
            AgentCapability.GROUNDING,  # Can use Google Search for verification
            AgentCapability.PLANNING,
        ],
        system_prompt="",  # Built dynamically
        model="gemini-2.5-pro",  # Pro for complex analysis
        temperature=0.0,  # Deterministic for accuracy
        max_iterations=5,  # Focused analysis
        tools=[],  # Set by factory
        middleware=[],  # Set by factory
        enabled=True,
        requires_review=False,
    )
