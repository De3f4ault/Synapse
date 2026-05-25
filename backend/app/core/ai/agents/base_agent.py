"""
Base Agent — Foundation for all SYNAPSE agents.

Implements:
- ReAct pattern (Reasoning + Acting)
- Middleware pipeline
- Tool execution framework
- Memory management
- Error handling and retries
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
import asyncio
import json
import time
import structlog

from app.core.ai.agents.messages import (
    AIMessage, HumanMessage, SystemMessage, ToolMessage,
    AgentMessage, message_from_db_row,
)
from app.core.ai.tools.base import BaseTool

# Cognitive Router — used by AgentConfig.cognitive_task and subclasses
from app.core.ai.contracts.task import AITask
from app.core.ai.router import router

logger = structlog.get_logger(__name__)


def _try_parse_text_tool_call(text: str) -> Optional[Dict[str, Any]]:
    """
    Detect when a model outputs a tool call as plain JSON text instead of
    using the structured ``delta.tool_calls`` protocol.

    Handles three common model output formats:

    1. Raw JSON::

        {"name": "search_notes", "arguments": {}}

    2. Markdown code-fenced JSON (DeepSeek / Ollama often do this)::

        ```json
        {"name": "search_notes", "arguments": {}}
        ```

    3. JSON embedded after a ``<think>`` reasoning block::

        <think>I should search...</think>
        {"name": "search_notes", "arguments": {}}

    Returns a ``{"name": str, "args": dict}`` dict when a tool call is
    detected, otherwise ``None``.
    """
    import re as _re

    # 1. Strip <think>...</think> blocks (reasoning models prepend these)
    cleaned = _re.sub(r"<think>.*?</think>", "", text, flags=_re.DOTALL).strip()

    # 2. Extract JSON from ```json ... ``` or ``` ... ``` code fences
    fence_match = _re.search(
        r"```(?:json)?\s*\n?({.*?})\s*\n?```",
        cleaned,
        flags=_re.DOTALL,
    )
    if fence_match:
        candidate = fence_match.group(1).strip()
    else:
        candidate = cleaned

    # Quick gate: must look like a JSON object containing "name"
    if not candidate.startswith("{") or '"name"' not in candidate:
        return None

    try:
        data = json.loads(candidate)
    except (json.JSONDecodeError, ValueError):
        return None
    if not isinstance(data, dict) or "name" not in data:
        return None
    # Accept both "arguments" (OpenAI style) and "args" (shorthand)
    args = data.get("arguments") or data.get("args") or {}
    if not isinstance(args, dict):
        args = {}
    return {"name": str(data["name"]), "args": args}


class AgentCapability(str, Enum):
    """Agent capabilities - what the agent can do"""

    CHAT = "chat"
    TOOL_USE = "tool_use"
    PLANNING = "planning"
    DELEGATION = "delegation"  # Can spawn sub-agents
    MEMORY = "memory"  # Has conversation memory
    GROUNDING = "grounding"  # Can use web search
    FILE_ACCESS = "file_access"  # Can read/write files
    CODE_EXECUTION = "code_execution"


@dataclass
class AgentConfig:
    """Configuration for agent initialization"""

    name: str
    display_name: str
    description: str
    capabilities: List[AgentCapability]
    system_prompt: str
    # Cognitive Router: specify task type for model selection
    cognitive_task: AITask = AITask.GENERAL_ASSISTANCE
    model: str = ""  # Deprecated: will be set by router
    temperature: float = 0.0  # Deterministic by default
    max_iterations: int = 10  # Max ReAct loops
    max_tokens: int = 8000  # Max context window
    timeout_seconds: int = 120  # Max execution time
    retry_attempts: int = 3  # Retry on failures
    tools: List[BaseTool] = field(default_factory=list)
    middleware: List[Any] = field(default_factory=list)
    enable_memory: bool = False
    memory_type: str = "buffer"  # "buffer", "summary", "vector"
    verbose: bool = False


@dataclass
class AgentResult:
    """Result from agent execution"""

    success: bool
    output: str
    intermediate_steps: List[Dict[str, Any]]
    tool_calls: List[Dict[str, Any]]
    total_tokens: int
    execution_time_ms: int
    iterations: int
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class AgentState:
    """Maintains agent state across execution.

    Also serves as the checkpoint boundary: the DB *is* the checkpoint
    store, and ``from_chat_history`` reconstructs state from chat_messages
    rows so an agent can resume mid-session.
    """

    def __init__(self):
        self.messages: List[AgentMessage] = []
        self.iterations: int = 0
        self.tool_calls: List[Dict] = []
        self.metadata: Dict[str, Any] = {}
        self.output: str = ""  # Accumulated output for post-execution middleware
        self.start_time: float = time.time()

    def add_message(self, message: AgentMessage) -> None:
        """Add message to state"""
        self.messages.append(message)

    def add_tool_call(self, tool_name: str, args: Dict, result: Any) -> None:
        """Track tool usage"""
        self.tool_calls.append(
            {
                "tool": tool_name,
                "args": args,
                "result": result,
                "timestamp": datetime.utcnow().isoformat(),
            }
        )

    def get_execution_time_ms(self) -> int:
        """Get elapsed time in milliseconds"""
        return int((time.time() - self.start_time) * 1000)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize state"""
        return {
            "messages": [str(m) for m in self.messages],
            "iterations": self.iterations,
            "tool_calls": self.tool_calls,
            "metadata": self.metadata,
            "execution_time_ms": self.get_execution_time_ms(),
        }

    # ── Layer 2: Checkpoint / Restore ────────────────────────────────

    def checkpoint(self) -> Dict[str, Any]:
        """Serialize full state for debugging or out-of-band persistence."""
        return {
            "messages": [m.model_dump() for m in self.messages],
            "iterations": self.iterations,
            "tool_calls": self.tool_calls,
            "metadata": self.metadata,
        }

    @classmethod
    def from_chat_history(
        cls,
        db_rows: List[Dict[str, Any]],
    ) -> "AgentState":
        """Reconstruct state from chat_messages DB rows.

        The DB *is* the checkpoint. This is the resume path for
        interrupted sessions — no Redis, no separate checkpoint store.

        Args:
            db_rows: List of dicts from ChatMessage rows, each with
                     at minimum ``role`` and ``content`` keys.
        """
        state = cls()
        for row in db_rows:
            state.add_message(message_from_db_row(row))
        return state


class BaseAgent(ABC):
    """
    Base class for all SYNAPSE agents

    Implements ReAct pattern with middleware pipeline:
    1. Pre-execution middleware (context injection, quota check)
    2. ReAct loop (Thought → Action → Observation)
    3. Post-execution middleware (logging, webhooks)

    Usage:
        class MyAgent(BaseAgent):
            async def _get_system_prompt(self, context: Dict) -> str:
                return "You are a helpful assistant..."

        agent = MyAgent(config)
        result = await agent.execute(user_id=1, input="Help me study")
    """

    def __init__(self, config: AgentConfig):
        self.config = config
        self.tools_dict = {tool.name: tool for tool in config.tools}
        self.logger = logger.bind(agent=config.name)
        self._validate_config()
        # Cache routing decision for this agent
        self._routing_decision: Optional[ModelRoutingDecision] = None

    def _validate_config(self) -> None:
        """Validate agent configuration"""
        if not self.config.name:
            raise ValueError("Agent must have a name")
        if self.config.system_prompt is None:
            raise ValueError("Agent must have a system prompt")
        if self.config.max_iterations < 1:
            raise ValueError("max_iterations must be >= 1")

    # _get_routed_provider() removed — superseded by _resolve_litellm_model().
    # All LLM calls now go through the LiteLLM Router singleton.
    # See: app.core.ai.providers.litellm_router.get_llm_router()

    def _resolve_litellm_model(self, context: Dict[str, Any]) -> str:
        """
        Resolve the LiteLLM Router alias for this agent execution.

        The orchestrator writes ``context["litellm_alias"]`` via ``mode_to_alias()``
        before calling ``execute_stream()``.  The Router then handles all provider
        selection, failover, and cooldown logic transparently.

        Falls back to ``"synapse-chat"`` for the non-streaming ``execute()`` path
        where no alias has been injected.

        Returns:
            LiteLLM Router alias string (e.g. ``"synapse-chat"``, ``"synapse-reasoning"``)
        """
        alias = context.get("litellm_alias", "synapse-chat")
        self.logger.debug("agent_resolved_alias", litellm_alias=alias)
        return alias

    # ============================================================================
    # Abstract Methods - Must be implemented by subclasses
    # ============================================================================

    @abstractmethod
    async def _get_system_prompt(self, context: Dict[str, Any]) -> str:
        """
        Build system prompt with context.
        Must be implemented by each agent.

        Args:
            context: User context (weak areas, preferences, etc.)

        Returns:
            Complete system prompt string
        """
        pass

    # ============================================================================
    # Main Execution Method
    # ============================================================================

    async def execute(
        self,
        user_id: int,
        input: str,
        context: Optional[Dict[str, Any]] = None,
        chat_history: Optional[List[Dict[str, Any]]] = None,
        **kwargs,
    ) -> AgentResult:
        """
        Execute agent with ReAct pattern

        Flow:
        1. Run pre-execution middleware
        2. Build system prompt with context
        3. Enter ReAct loop:
           - Thought: Reason about what to do
           - Action: Call tool or respond
           - Observation: Process tool result
        4. Run post-execution middleware
        5. Return result

        Args:
            user_id: User ID for context
            input: User's input message
            context: Additional context (optional)
            **kwargs: Additional arguments

        Returns:
            AgentResult with output and metadata
        """
        state = AgentState()
        context = context or {}

        try:
            # Log execution start
            self.logger.info("agent_execution_started", user_id=user_id, input_length=len(input))

            # Inject input into context for middleware visibility
            context["input"] = input

            # Expose chat history in context so grounding middleware can pass it
            # to the context-aware query rewriter (resolves pronoun/continuation queries).
            if chat_history:
                context["chat_history"] = chat_history

            # ================================================================
            # PRE-EXECUTION MIDDLEWARE
            # ================================================================
            await self._run_middleware_stage("pre", state, context, user_id)

            # ================================================================
            # BUILD SYSTEM PROMPT
            # ================================================================
            system_prompt = await self._get_system_prompt(context)
            state.add_message(SystemMessage(content=system_prompt))

            # ================================================================
            # INJECT CONVERSATION HISTORY
            # ================================================================
            if chat_history:
                for msg in chat_history:
                    role = msg.get("role", "").upper()
                    content = msg.get("content", "")
                    if role == "USER":
                        state.add_message(HumanMessage(content=content))
                    elif role == "ASSISTANT":
                        state.add_message(AIMessage(content=content))

                self.logger.debug("chat_history_injected", message_count=len(chat_history))

            # Add current user message
            state.add_message(HumanMessage(content=input))

            # ================================================================
            # REACT LOOP
            # ================================================================
            output = await self._react_loop(state, context, user_id)

            # ================================================================
            # POST-EXECUTION MIDDLEWARE
            # ================================================================
            await self._run_middleware_stage("post", state, context, user_id)

            # ================================================================
            # BUILD RESULT
            # ================================================================
            result = AgentResult(
                success=True,
                output=output,
                intermediate_steps=[],  # Could extract from state
                tool_calls=state.tool_calls,
                total_tokens=self._count_tokens(state.messages),
                execution_time_ms=state.get_execution_time_ms(),
                iterations=state.iterations,
                metadata=state.metadata,
            )

            self.logger.info(
                "agent_execution_completed",
                user_id=user_id,
                iterations=state.iterations,
                tool_calls=len(state.tool_calls),
                execution_time_ms=result.execution_time_ms,
            )

            return result

        except Exception as e:
            self.logger.error(
                "agent_execution_failed", user_id=user_id, error=str(e), error_type=type(e).__name__
            )

            return AgentResult(
                success=False,
                output="",
                intermediate_steps=[],
                tool_calls=state.tool_calls,
                total_tokens=0,
                execution_time_ms=state.get_execution_time_ms(),
                iterations=state.iterations,
                error=str(e),
                metadata=state.metadata,
            )

    # ============================================================================
    # Streaming Execution Method (True Token Streaming)
    # ============================================================================

    async def execute_stream(
        self,
        user_id: int,
        input: str,
        context: Optional[Dict[str, Any]] = None,
        chat_history: Optional[List[Dict[str, Any]]] = None,
        **kwargs,
    ):
        """
        Execute agent with streaming output (true token streaming).

        Unlike execute(), this yields tokens as they arrive from the LLM,
        providing real-time streaming to WebSocket clients.

        Yields:
            {"type": "thinking", "text": "..."}  - If model supports thinking
            {"type": "token", "text": "..."}     - Streamed text tokens
            {"type": "tool_call", "name": "...", "args": {...}}
            {"type": "tool_result", "name": "...", "result": {...}}
            {"type": "complete", "metadata": {...}}

        Args:
            user_id: User ID for context
            input: User's input message
            context: Additional context (optional)
            chat_history: Previous messages for context
            **kwargs: Additional arguments
        """
        state = AgentState()
        context = context or {}

        # Expose input to middleware (same as execute())
        context["input"] = input

        # Expose chat history for context-aware query rewriting in grounding.
        if chat_history:
            context["chat_history"] = chat_history

        # ── Designer tool injection ────────────────────────────────────
        # When this stream is anchored to a card-designer session, inject
        # ProposeCardPlanTool so the model can call it as a real function.
        # The tool is added to tools_dict (execution) here; _format_tools_for_litellm
        # is patched below to also include it in the LiteLLM schema.
        if context.get("card_designer_system"):
            try:
                from app.core.ai.tools.card_design_tools import ProposeCardPlanTool
                self.tools_dict["propose_card_plan"] = ProposeCardPlanTool()
            except Exception:
                pass  # non-fatal — text-fallback detection still works
        # ──────────────────────────────────────────────────────────────

        # Resolve LiteLLM model string from context + cognitive router
        litellm_model = self._resolve_litellm_model(context)

        try:
            self.logger.info(
                "agent_stream_started",
                user_id=user_id,
                input_length=len(input),
                litellm_model=litellm_model,
            )

            # ================================================================
            # PRE-EXECUTION MIDDLEWARE (e.g., GroundingMiddleware retrieves evidence)
            # ================================================================
            await self._run_middleware_stage("pre", state, context, user_id)

            # Build system prompt (now has context["grounding"] from middleware)
            system_prompt = await self._get_system_prompt(context)

            # Append RAG citation instruction when relevant tools are available
            _RAG_TOOL_NAMES = {"search_notes", "search_flashcards", "analyze_document"}
            if any(t.name in _RAG_TOOL_NAMES for t in self.config.tools):
                system_prompt += (
                    "\n\nWhen your response draws on retrieved search results, "
                    "cite each reference with [1], [2], etc. matching the numbered "
                    "results returned by the search tools. Place citation markers "
                    "only where you are genuinely using that specific source. "
                    "Do not cite when answering from general knowledge."
                )

            state.add_message(SystemMessage(content=system_prompt))

            # Inject chat history into state
            if chat_history:
                for msg in chat_history:
                    role = msg.get("role", "").upper()
                    content = msg.get("content", "")
                    if role == "USER":
                        state.add_message(HumanMessage(content=content))
                    elif role == "ASSISTANT":
                        state.add_message(AIMessage(content=content))

            # Add current user message
            state.add_message(HumanMessage(content=input))

            # Streaming ReAct loop (using LiteLLM)
            for iteration in range(self.config.max_iterations):
                state.iterations = iteration + 1

                # Format messages and tools for LiteLLM (OpenAI-standard format)
                litellm_messages = self._format_messages_for_litellm(state.messages)
                litellm_tools = self._format_tools_for_litellm() or None

                # Accumulate text for this iteration.
                # IMPORTANT: we buffer tokens and do NOT yield them immediately.
                # After the stream ends we inspect the buffer to detect text-encoded
                # tool calls (models that output {"name":"...","arguments":{}} as plain
                # delta.content instead of delta.tool_calls).  Real text is flushed
                # to the client only after we confirm it is not a tool call.
                iteration_text = ""
                text_token_buffer: List[str] = []  # holds raw token strings pre-flush
                pending_tool_calls = []
                tool_call_buffers: Dict[int, Dict[str, Any]] = {}  # index → partial tc

                # Build extra kwargs (multimodal image passthrough)
                image_bytes = context.get("image_bytes")
                if image_bytes:
                    # LiteLLM handles images via content list on the last user message
                    # Inject images into the last user message part
                    last_user_idx = next(
                        (i for i, m in reversed(list(enumerate(litellm_messages)))
                         if m["role"] == "user"), None
                    )
                    if last_user_idx is not None:
                        import base64, imghdr, io
                        from PIL import Image
                        
                        parts = []
                        orig_text = litellm_messages[last_user_idx].get("content", "")
                        if orig_text:
                            parts.append({"type": "text", "text": orig_text})
                        for img_data in image_bytes:
                            img_type = imghdr.what(None, h=img_data) or "jpeg"
                            
                            # Downscale image if too large to prevent OOM and speed up request
                            try:
                                img = Image.open(io.BytesIO(img_data))
                                if img.mode in ("RGBA", "P"):
                                    img = img.convert("RGB")
                                    img_type = "jpeg"
                                
                                # Gemini/Vision models don't need raw 4K images
                                img.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
                                
                                buffer = io.BytesIO()
                                img.save(buffer, format="JPEG" if img_type.lower() == "jpg" else img_type.upper())
                                img_data = buffer.getvalue()
                            except Exception as e:
                                self.logger.warning("image_resize_failed", error=str(e))
                                
                            mime = f"image/{img_type}"
                            b64 = base64.b64encode(img_data).decode()
                            parts.append({"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}})
                        litellm_messages[last_user_idx]["content"] = parts
                        self.logger.info(
                            "agent_image_passthrough",
                            image_count=len(image_bytes),
                            litellm_model=litellm_model,
                        )

                # ── Stream via LiteLLM Router (handles failover automatically) ──
                try:
                    from app.core.ai.providers.litellm_router import get_llm_router
                    stream = await get_llm_router().acompletion(
                        model=litellm_model,
                        messages=litellm_messages,
                        tools=litellm_tools,
                        temperature=self.config.temperature,
                        timeout=float(self.config.timeout_seconds),
                        stream=True,
                    )
                except Exception as stream_init_err:
                    self.logger.error("router_stream_init_failed", error=str(stream_init_err), alias=litellm_model)
                    yield {"type": "error", "message": str(stream_init_err)}
                    return

                # ── Two-phase streaming: no hang + reliable tool detection ─
                #
                # Phase 1 — <think> content:  stream immediately as `thinking`
                #   events. This prevents the UI from hanging during long
                #   reasoning blocks (DeepSeek-R1 can think for 60-70 s).
                #
                # Phase 2 — post-think text:  apply a minimal heuristic.
                #   Because <think> content is already stripped, the ONLY thing
                #   left in text_out is either a JSON tool call (starts with `{`
                #   or ` ```json`) or normal response text. We can safely check
                #   the first character and unlock immediate token streaming as
                #   soon as we confirm it is not a JSON tool call.
                _in_think_tag = False
                _think_started_at: Optional[float] = None  # monotonic wall-clock
                _streaming_active = False  # unlocked once we confirm text is not a tool call

                async for chunk in stream:
                    choice = chunk.choices[0] if chunk.choices else None
                    if not choice:
                        continue
                    delta = choice.delta

                    # ── Text token: split <think> from real content ──────────
                    if delta.content:
                        raw = delta.content
                        text_out = ""
                        think_out = ""

                        i = 0
                        while i < len(raw):
                            if _in_think_tag:
                                end_idx = raw.find("</think>", i)
                                if end_idx != -1:
                                    think_out += raw[i:end_idx]
                                    _in_think_tag = False
                                    # Emit the measured thinking duration
                                    if _think_started_at is not None:
                                        import time as _time
                                        duration = round(_time.monotonic() - _think_started_at, 1)
                                        yield {"type": "thinking_complete", "duration_seconds": duration}
                                        _think_started_at = None
                                    i = end_idx + len("</think>")
                                else:
                                    think_out += raw[i:]
                                    i = len(raw)
                            else:
                                start_idx = raw.find("<think>", i)
                                if start_idx != -1:
                                    text_out += raw[i:start_idx]
                                    _in_think_tag = True
                                    if _think_started_at is None:
                                        import time as _time
                                        _think_started_at = _time.monotonic()
                                    i = start_idx + len("<think>")
                                else:
                                    text_out += raw[i:]
                                    i = len(raw)

                        # Phase 1: stream thinking immediately (prevents UI hang)
                        if think_out:
                            yield {"type": "thinking", "text": think_out, "model": litellm_model}

                        # Phase 2: stream or buffer post-think response text.
                        # <think> is stripped so iteration_text only contains real text.
                        # Check the first non-whitespace char — if it's `{` keep buffering
                        # (likely a JSON tool call). Otherwise unlock streaming immediately.
                        if text_out:
                            iteration_text += text_out
                            if _streaming_active:
                                yield {
                                    "type": "token",
                                    "text": text_out,
                                    "model": litellm_model,
                                    "streaming": True,
                                }
                            else:
                                text_token_buffer.append(text_out)
                                stripped = iteration_text.lstrip()
                                if stripped and not stripped.startswith("{"):
                                    # Confirmed normal text — unlock streaming and flush buffer
                                    _streaming_active = True
                                    for tok in text_token_buffer:
                                        yield {
                                            "type": "token",
                                            "text": tok,
                                            "model": litellm_model,
                                            "streaming": True,
                                        }
                                    text_token_buffer.clear()

                    # ── Thinking via dedicated reasoning_content field ───────
                    # (Anthropic, some OpenAI-compatible providers use this)
                    thinking_text = getattr(delta, "reasoning_content", None)
                    if thinking_text:
                        if _think_started_at is None:
                            import time as _time
                            _think_started_at = _time.monotonic()
                        yield {"type": "thinking", "text": thinking_text, "model": litellm_model}

                    # ── Structured tool-call chunks ──────────────────────────
                    if delta.tool_calls:
                        for tc_chunk in delta.tool_calls:
                            idx = tc_chunk.index
                            if idx not in tool_call_buffers:
                                tool_call_buffers[idx] = {"id": "", "name": "", "args": ""}
                            buf = tool_call_buffers[idx]
                            if tc_chunk.id:
                                buf["id"] = tc_chunk.id
                            if tc_chunk.function:
                                if tc_chunk.function.name:
                                    buf["name"] += tc_chunk.function.name
                                if tc_chunk.function.arguments:
                                    buf["args"] += tc_chunk.function.arguments

                # ── Post-stream: resolve structured tool calls ────────────
                # Build the OpenAI-format tool_calls list so we can include it
                # in the AIMessage. This is REQUIRED by the spec: every
                # role:tool message must be preceded by an assistant message
                # that declares the corresponding tool call.
                structured_tool_calls_meta = []
                for idx in sorted(tool_call_buffers):
                    buf = tool_call_buffers[idx]
                    try:
                        args = json.loads(buf["args"]) if buf["args"] else {}
                    except json.JSONDecodeError:
                        args = {}
                    call_id = buf["id"] or f"call_{idx}_{iteration}"
                    pending_tool_calls.append({"name": buf["name"], "args": args, "id": call_id})
                    structured_tool_calls_meta.append({
                        "id": call_id,
                        "type": "function",
                        "function": {"name": buf["name"], "arguments": json.dumps(args)},
                    })
                    yield {"type": "tool_call", "name": buf["name"], "args": args, "id": call_id}

                # ── Text-encoded tool call detection ─────────────────────
                # Some models (e.g. local Ollama-hosted LLMs) emit tool calls
                # as plain JSON text in delta.content instead of delta.tool_calls.
                # Example: {"name": "search_notes", "arguments": {}}
                # If no structured tool_calls arrived but the buffered text
                # parses as a tool call, redirect it into the ReAct loop and
                # suppress the raw JSON from the client stream.
                # NOTE: text_token_buffer is already flushed+cleared if streaming_active
                # became True mid-stream, so we gate on iteration_text instead.
                if not tool_call_buffers and iteration_text.strip() and self.tools_dict:
                    parsed_tc = _try_parse_text_tool_call(iteration_text)
                    if parsed_tc and parsed_tc["name"] in self.tools_dict:
                        tc_args = parsed_tc["args"]

                        # ── Empty-args fallback ──────────────────────────
                        # When Ollama emits {"arguments": {}}, infer a
                        # sensible default: use the user's original message
                        # as the "query" parameter (covers search tools).
                        if not tc_args:
                            tool_schema = self.tools_dict[parsed_tc["name"]]
                            tool_params = getattr(tool_schema, "parameters", {}) or {}
                            required_params = tool_params.get("required", [])
                            if "query" in required_params:
                                tc_args = {"query": input}  # use user's original message
                            self.logger.warning(
                                "text_tc_empty_args_fallback",
                                tool=parsed_tc["name"],
                                inferred_args=tc_args,
                            )

                        self.logger.info(
                            "text_encoded_tool_call_detected",
                            tool=parsed_tc["name"],
                            iteration=iteration + 1,
                        )
                        # Post-think text was never streamed to the client, so no
                        # retraction needed — just clear the buffer and execute the tool.
                        text_token_buffer.clear()
                        call_id = f"call_text_{iteration}"
                        parsed_tc["args"] = tc_args
                        parsed_tc["id"] = call_id
                        pending_tool_calls.append(parsed_tc)
                        # Build the tool_calls metadata so the AIMessage is spec-compliant
                        structured_tool_calls_meta.append({
                            "id": call_id,
                            "type": "function",
                            "function": {"name": parsed_tc["name"], "arguments": json.dumps(tc_args)},
                        })
                        yield {"type": "tool_call", "name": parsed_tc["name"], "args": tc_args, "id": call_id}
                        # Clear iteration_text so raw JSON is not saved as content
                        iteration_text = ""

                # ── Flush buffered text tokens to the client ──────────────
                # Only reached if this was real text content (not a tool call).
                for token_text in text_token_buffer:
                    yield {
                        "type": "token",
                        "text": token_text,
                        "model": litellm_model,
                        "streaming": True,
                    }

                # ── Add assistant message to state ────────────────────────
                # AIMessages with tool_calls MUST declare the call before the
                # corresponding ToolMessage appears (OpenAI spec requirement).
                if structured_tool_calls_meta:
                    state.add_message(
                        AIMessage(content=iteration_text or "", tool_calls=structured_tool_calls_meta)
                    )
                elif iteration_text:
                    state.add_message(AIMessage(content=iteration_text))

                # If no tool calls, we're done
                if not pending_tool_calls:
                    break

                # Execute pending tool calls
                for tool_call in pending_tool_calls:
                    tool_name = tool_call["name"]
                    tool_args = tool_call["args"]
                    call_id = tool_call.get("id", f"call_{len(state.tool_calls)}")

                    if tool_name not in self.tools_dict:
                        self.logger.warning("unknown_tool_called", tool=tool_name)
                        continue

                    # Execute tool
                    tool_result, elapsed_ms = await self._execute_tool(tool_name, tool_args, user_id)

                    # Track and yield tool result
                    result_type = self._infer_result_type(tool_name)
                    state.add_tool_call(tool_name, tool_args, tool_result)
                    yield {
                        "type": "tool_result",
                        "name": tool_name,
                        "result": tool_result,
                        "id": call_id,
                        "result_type": result_type,
                    }

                    # Add ToolMessage to state — tool_call_id MUST match the
                    # id declared in the preceding AIMessage.tool_calls entry.
                    state.add_message(
                        ToolMessage(
                            content=str(tool_result),
                            tool_call_id=call_id,
                            tool_name=tool_name,
                            execution_ms=elapsed_ms,
                            result_type=result_type,
                        )
                    )

            # ================================================================
            # POST-EXECUTION MIDDLEWARE (e.g., citation tracking)
            # ================================================================
            # Expose accumulated output for after_execution() analysis
            state.output = iteration_text
            await self._run_middleware_stage("post", state, context, user_id)

            # Extract grounding sources from middleware metadata
            grounding_sources = state.metadata.get("grounding_sources")

            # Final completion message
            # Use the runtime-resolved alias (litellm_model) not self.config.model,
            # which is a deprecated placeholder that is almost always empty.
            # Also wrap grounding_sources as {"sources": [...]} so ai_stream.py
            # can correctly call .get("sources") during DB persistence.
            _grounding_payload = (
                {"sources": grounding_sources}
                if isinstance(grounding_sources, list)
                else grounding_sources
            )
            yield {
                "type": "complete",
                "success": True,
                "iterations": state.iterations,
                "tool_calls": state.tool_calls,
                "total_tokens": self._count_tokens(state.messages),
                "execution_time_ms": state.get_execution_time_ms(),
                "model": litellm_model,
                "grounding_sources": _grounding_payload,
            }

            self.logger.info(
                "agent_stream_completed",
                user_id=user_id,
                iterations=state.iterations,
                tool_calls=len(state.tool_calls),
                grounded=grounding_sources is not None,
            )

        except Exception as e:
            self.logger.error("agent_stream_failed", user_id=user_id, error=str(e))
            yield {"type": "error", "message": str(e)}

    # ============================================================================
    # ReAct Loop Implementation
    # ============================================================================

    async def _react_loop(self, state: AgentState, context: Dict[str, Any], user_id: int) -> str:
        """
        Execute ReAct (Reasoning + Acting) loop — non-streaming path.

        Uses LiteLLM for standardized tool calling across providers.
        """
        litellm_model = self._resolve_litellm_model(context)
        litellm_tools = self._format_tools_for_litellm() or None

        for iteration in range(self.config.max_iterations):
            state.iterations = iteration + 1

            self.logger.debug(
                "react_iteration",
                iteration=iteration + 1,
                max_iterations=self.config.max_iterations,
                litellm_model=litellm_model,
            )

            try:
                from app.core.ai.providers.litellm_router import get_llm_router
                response = await get_llm_router().acompletion(
                    model=litellm_model,
                    messages=self._format_messages_for_litellm(state.messages),
                    tools=litellm_tools,
                    temperature=self.config.temperature,
                    timeout=float(self.config.timeout_seconds),
                )

                message = response.choices[0].message
                text = message.content or ""
                state.add_message(AIMessage(content=text))

                tool_calls = message.tool_calls or []

                if not tool_calls:
                    return text

                # Execute each tool call
                for tc in tool_calls:
                    tool_name = tc.function.name
                    try:
                        tool_args = json.loads(tc.function.arguments) if tc.function.arguments else {}
                    except json.JSONDecodeError:
                        tool_args = {}

                    if tool_name not in self.tools_dict:
                        self.logger.warning("unknown_tool_called", tool=tool_name)
                        continue

                    tool_result, elapsed_ms = await self._execute_tool(tool_name, tool_args, user_id)
                    state.add_tool_call(tool_name, tool_args, tool_result)
                    state.add_message(
                        ToolMessage(
                            content=str(tool_result),
                            tool_call_id=tc.id or "",
                            tool_name=tool_name,
                            execution_ms=elapsed_ms,
                            result_type=self._infer_result_type(tool_name),
                        )
                    )

            except Exception as e:
                self.logger.error("react_iteration_failed", iteration=iteration + 1, error=str(e))
                if iteration < self.config.retry_attempts:
                    await asyncio.sleep(1)
                    continue
                else:
                    raise

        self.logger.warning("max_iterations_reached", iterations=self.config.max_iterations)
        return "I apologize, but I couldn't complete the task within the iteration limit."

    # ============================================================================
    # Tool Execution
    # ============================================================================

    async def _execute_tool(
        self, tool_name: str, args: Dict[str, Any], user_id: int
    ) -> tuple[Any, int]:
        """Execute a Synapse BaseTool with error handling.

        Returns:
            Tuple of (result, elapsed_ms) so callers can stamp ToolMessage.
        """
        tool = self.tools_dict[tool_name]

        self.logger.debug("tool_execution_started", tool=tool_name, args=args)
        start_time = time.time()

        try:
            result = await tool(user_id=user_id, validate=True, retry=True, **args)
            elapsed_ms = int((time.time() - start_time) * 1000)
            self.logger.debug(
                "tool_execution_completed",
                tool=tool_name,
                execution_time_ms=elapsed_ms,
            )
            return result, elapsed_ms

        except Exception as e:
            elapsed_ms = int((time.time() - start_time) * 1000)
            self.logger.error("tool_execution_failed", tool=tool_name, error=str(e))
            return f"Error executing {tool_name}: {str(e)}", elapsed_ms

    # ============================================================================
    # Middleware Pipeline
    # ============================================================================

    async def _run_middleware_stage(
        self, stage: str, state: AgentState, context: Dict[str, Any], user_id: int
    ) -> None:
        """
        Run middleware at specified stage

        Args:
            stage: "pre" or "post"
            state: Agent state
            context: Execution context
            user_id: User ID
        """
        for middleware in self.config.middleware:
            try:
                if stage == "pre":
                    await middleware.before_execution(
                        agent=self, state=state, context=context, user_id=user_id
                    )
                elif stage == "post":
                    await middleware.after_execution(
                        agent=self, state=state, context=context, user_id=user_id
                    )
            except Exception as e:
                self.logger.error(
                    "middleware_failed",
                    stage=stage,
                    middleware=middleware.__class__.__name__,
                    error=str(e),
                )
                # Continue with other middleware

    # ============================================================================
    # Helper Methods
    # ============================================================================

    def _format_messages(self, messages: List[Any]) -> str:
        """Format messages for prompt"""
        parts = []
        for msg in messages:
            if isinstance(msg, SystemMessage):
                parts.append(f"System: {msg.content}")
            elif isinstance(msg, HumanMessage):
                parts.append(f"Human: {msg.content}")
            elif isinstance(msg, AIMessage):
                parts.append(f"Assistant: {msg.content}")
            elif isinstance(msg, ToolMessage):
                parts.append(f"Tool Result: {msg.content}")
        return "\n\n".join(parts)

    def _format_tools_for_litellm(self) -> List[Dict]:
        """
        Format tools as OpenAI function-calling schema for LiteLLM.

        Includes all tools from config.tools PLUS any tools that were
        dynamically injected into self.tools_dict at runtime (e.g.
        ProposeCardPlanTool for card-designer sessions). Dynamic tools
        take precedence: if a name exists in both, the tools_dict version wins.
        """
        config_names = {t.name for t in self.config.tools}
        result = [
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.parameters,
                },
            }
            for tool in self.config.tools
        ]
        # Append dynamically-injected tools not already in config
        for name, tool in self.tools_dict.items():
            if name not in config_names:
                result.append(
                    {
                        "type": "function",
                        "function": {
                            "name": tool.name,
                            "description": tool.description,
                            "parameters": tool.parameters,
                        },
                    }
                )
        return result

    def _format_messages_for_litellm(self, messages: List[AgentMessage]) -> List[Dict]:
        """
        Serialize AgentMessage objects to OpenAI-format dicts for LiteLLM.

        Delegates to each message's ``to_litellm()`` method so serialization
        logic lives on the model, not scattered across the agent.
        """
        return [msg.to_litellm() for msg in messages]

    @staticmethod
    def _infer_result_type(tool_name: str) -> str:
        """Map tool names to semantic result types for frontend rendering."""
        _TYPE_MAP = {
            "search_notes": "notes",
            "search_flashcards": "flashcards",
            "analyze_document": "documents",
            "search_documents": "documents",
            "create_flashcard": "flashcard_created",
            "create_note": "note_created",
            "create_quiz": "quiz_created",
            "get_user_context": "context",
            "get_study_recommendations": "recommendations",
            "get_related_content": "links",
        }
        return _TYPE_MAP.get(tool_name, "text")

    def _count_tokens(self, messages: List[Any]) -> int:
        """Rough token count (1 token ≈ 4 chars)"""
        total_chars = sum(len(str(m.content)) for m in messages)
        return total_chars // 4

    # ============================================================================
    # Public Properties
    # ============================================================================

    @property
    def name(self) -> str:
        return self.config.name

    @property
    def display_name(self) -> str:
        return self.config.display_name

    @property
    def description(self) -> str:
        return self.config.description

    @property
    def capabilities(self) -> List[AgentCapability]:
        return self.config.capabilities

    def get_info(self) -> Dict[str, Any]:
        """Get agent information"""
        return {
            "name": self.name,
            "display_name": self.display_name,
            "description": self.description,
            "capabilities": [c.value for c in self.capabilities],
            "model": self.config.model,
            "tools": [tool.name for tool in self.config.tools],
            "middleware": [m.__class__.__name__ for m in self.config.middleware],
        }
