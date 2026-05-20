"""
Notes AI — SSE streaming endpoints for in-editor AI features.

Provides two endpoints consumed by the Notes module frontend:

  POST /api/v1/notes/ai/transform
    — Text transformations (rewrite, summarise, expand, shorten, fix grammar, translate).
      Streams tokens back via SSE so the Tiptap editor can apply a "typewriter" effect.

  POST /api/v1/notes/ai/visualize
    — Diagram generation from note text context.
      Returns a complete Mermaid.js string (non-streaming) that the frontend feeds
      into @excalidraw/mermaid-to-excalidraw.

Design contract:
    • Every request carries a `unified_context` with BOTH the text note content
      AND the current canvas element titles.  This gives the LLM full session
      awareness regardless of which editor surface triggered the action.
    • Streaming uses the same NDJSON / SSE approach already in ai_stream.py
      (text/event-stream, data: {...} lines).
    • No external LLM dependency is added — requests go through the existing
      LiteLLM router already wired in the orchestrator.
"""

from typing import Optional
import json
import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.api.deps import get_current_user
from app.models.user import User

logger = structlog.get_logger(__name__)

router = APIRouter()


# ── Request Schemas ──────────────────────────────────────────────────────────

class NoteUnifiedContext(BaseModel):
    """
    Dual-face note context sent by the frontend on every AI request.

    text         — plain text extracted from the Tiptap document.
    canvas_summary — short textual summary of visible Excalidraw elements
                     (e.g. the text labels of shapes).  May be empty string
                     when the canvas has no text nodes.
    """
    text: str = Field(default="", description="Plain text from the Tiptap editor")
    canvas_summary: str = Field(default="", description="Text labels of Excalidraw shapes")


class NoteTransformRequest(BaseModel):
    """
    Request body for text transformation (Tiptap AI bubble menu).

    action       — one of the predefined transform types.
    selected_text — the highlighted text that will be replaced / enhanced.
    custom_prompt — used only when action == 'custom'.
    language     — target language for translate action (ISO 639-1, e.g. 'fr').
    unified_context — full session context so the AI is aware of both faces.
    """
    action: str = Field(
        ...,
        description=(
            "Transform action: rewrite | summarize | expand | shorten | "
            "fix_grammar | translate | change_tone | custom"
        ),
    )
    selected_text: str = Field(..., description="Text highlighted in the editor")
    custom_prompt: Optional[str] = Field(None, description="Custom instruction (action=custom only)")
    language: Optional[str] = Field(None, description="Target language for translate (ISO 639-1)")
    tone: Optional[str] = Field(None, description="Target tone for change_tone (formal|casual|academic)")
    unified_context: NoteUnifiedContext = Field(default_factory=NoteUnifiedContext)


class NoteVisualizeRequest(BaseModel):
    """
    Request body for diagram generation (Excalidraw AI input overlay).

    prompt         — user's natural language description of the diagram.
    unified_context — full session context so the LLM can read the text notes.
    diagram_type   — optional hint: flowchart | mindmap | sequence | class.
    """
    prompt: str = Field(..., description="Natural language description of the diagram to generate")
    diagram_type: str = Field(default="flowchart", description="Mermaid diagram type hint")
    unified_context: NoteUnifiedContext = Field(default_factory=NoteUnifiedContext)


# ── Prompt builders ──────────────────────────────────────────────────────────

_TRANSFORM_SYSTEM = """You are a precise writing assistant embedded inside a note editor.
Your job is to transform the user's selected text according to their instruction.

Rules:
- Output ONLY the transformed text — no explanations, no preamble, no markdown fences.
- Preserve the original language unless explicitly asked to translate.
- Preserve formatting intent (bullet points stay bullets, code stays code, etc.).
- Keep the response tightly scoped to the selection — do not add unrelated content.

Note context (for style awareness — do NOT include this in your output):
{context}"""

_TRANSFORM_ACTIONS = {
    "rewrite":     "Rewrite the following text to improve clarity and flow while preserving meaning:",
    "summarize":   "Summarize the following text into 2-3 concise sentences:",
    "expand":      "Expand the following text with more detail, examples, and explanation:",
    "shorten":     "Make the following text shorter and more concise without losing key information:",
    "fix_grammar": "Fix all spelling, grammar, and punctuation errors in the following text:",
    "translate":   "Translate the following text to {language}:",
    "change_tone": "Rewrite the following text in a {tone} tone:",
    "custom":      "{custom_prompt}:",
}

_VISUALIZE_SYSTEM = """You are a diagram architect. Your ONLY output must be valid Mermaid.js syntax.

Rules:
- Output ONLY the raw Mermaid code block — no prose, no markdown fences, no explanations.
- Use the diagram type specified in the instruction.
- Keep node labels short (≤ 5 words).
- Maximum 20 nodes for readability.
- Base the diagram structure on the provided note content.

Note content:
{note_text}

Canvas context (existing elements — do not duplicate these):
{canvas_summary}"""


def _build_transform_prompt(req: NoteTransformRequest) -> tuple[str, str]:
    """Returns (system_prompt, user_message) for the transform action."""
    ctx = req.unified_context
    context_snippet = f"Note text: {ctx.text[:800]}" if ctx.text else "(no context)"
    if ctx.canvas_summary:
        context_snippet += f"\nCanvas shapes: {ctx.canvas_summary[:300]}"

    system = _TRANSFORM_SYSTEM.format(context=context_snippet)

    action_template = _TRANSFORM_ACTIONS.get(req.action, _TRANSFORM_ACTIONS["rewrite"])
    instruction = action_template.format(
        language=req.language or "English",
        tone=req.tone or "formal",
        custom_prompt=req.custom_prompt or "Improve",
    )
    user_msg = f"{instruction}\n\n{req.selected_text}"
    return system, user_msg


def _build_visualize_prompt(req: NoteVisualizeRequest) -> tuple[str, str]:
    """Returns (system_prompt, user_message) for the visualize action."""
    ctx = req.unified_context
    system = _VISUALIZE_SYSTEM.format(
        note_text=ctx.text[:2000] if ctx.text else "(no text notes)",
        canvas_summary=ctx.canvas_summary[:500] if ctx.canvas_summary else "(empty canvas)",
    )
    user_msg = (
        f"Create a {req.diagram_type} diagram. User description: {req.prompt}"
    )
    return system, user_msg


# ── SSE helper ───────────────────────────────────────────────────────────────

_SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


def _sse_event(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


# ── Transform endpoint (streaming) ───────────────────────────────────────────

@router.post(
    "/transform",
    summary="Stream AI text transformation (Tiptap)",
    description=(
        "Applies an AI transformation to selected Tiptap text and streams tokens "
        "back via SSE.  The frontend reads the stream and injects each token into "
        "the ProseMirror document via editor.commands.insertContent()."
    ),
    tags=["Notes AI"],
)
async def stream_note_transform(
    request: NoteTransformRequest,
    current_user: User = Depends(get_current_user),
):
    """Stream a text transformation for the Tiptap AI bubble menu."""
    from app.core.ai.providers.litellm_router import get_llm_router

    if not request.selected_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="selected_text must not be empty",
        )

    system_prompt, user_message = _build_transform_prompt(request)

    logger.info(
        "notes_ai_transform_started",
        user_id=current_user.id,
        action=request.action,
        text_len=len(request.selected_text),
    )

    async def _generate():
        try:
            yield _sse_event({"type": "start", "action": request.action})

            litellm_router = get_llm_router()
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ]

            response_stream = await litellm_router.acompletion(
                model="synapse-chat",
                messages=messages,
                stream=True,
                temperature=0.7,
                max_tokens=2048,
            )

            async for chunk in response_stream:
                delta = chunk.choices[0].delta
                token = getattr(delta, "content", None) or ""
                if token:
                    yield _sse_event({"type": "token", "text": token})

            yield _sse_event({"type": "done"})
            logger.info("notes_ai_transform_done", user_id=current_user.id, action=request.action)

        except Exception as e:
            logger.error("notes_ai_transform_error", error=str(e), user_id=current_user.id)
            yield _sse_event({"type": "error", "message": str(e)})

    return StreamingResponse(
        _generate(),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )


# ── Visualize endpoint (non-streaming — returns complete Mermaid) ─────────────

@router.post(
    "/visualize",
    summary="Generate Mermaid diagram from note context (Excalidraw)",
    description=(
        "Reads the unified note context (Tiptap text + canvas summary) and "
        "generates a Mermaid.js diagram string.  The frontend parses this with "
        "@excalidraw/mermaid-to-excalidraw and injects the result into the canvas."
    ),
    tags=["Notes AI"],
)
async def visualize_note(
    request: NoteVisualizeRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate a Mermaid diagram from unified note context."""
    from app.core.ai.providers.litellm_router import get_llm_router

    system_prompt, user_message = _build_visualize_prompt(request)

    logger.info(
        "notes_ai_visualize_started",
        user_id=current_user.id,
        diagram_type=request.diagram_type,
        prompt_len=len(request.prompt),
    )

    try:
        litellm_router = get_llm_router()
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]

        response = await litellm_router.acompletion(
            model="synapse-chat",
            messages=messages,
            stream=False,
            temperature=0.3,   # Lower temp for structured output
            max_tokens=1024,
        )

        mermaid_code = response.choices[0].message.content or ""

        # Strip any accidental markdown fences the model might output
        if "```" in mermaid_code:
            lines = mermaid_code.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            mermaid_code = "\n".join(lines).strip()

        logger.info("notes_ai_visualize_done", user_id=current_user.id)

        return {"mermaid": mermaid_code, "diagram_type": request.diagram_type}

    except Exception as e:
        logger.error("notes_ai_visualize_error", error=str(e), user_id=current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Diagram generation failed: {str(e)}",
        )
