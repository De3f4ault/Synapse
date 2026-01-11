"""
Base Agent Class - Foundation for all SYNAPSE agents

Implements:
- ReAct pattern (Reasoning + Acting)
- Middleware pipeline (LangChain 1.0 style)
- Tool execution framework
- Memory management
- Error handling and retries

Based on LangChain 1.0 and DeepAgents best practices.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
import asyncio
import time
import structlog

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import BaseTool

logger = structlog.get_logger(__name__)


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
    model: str = "gemini-2.5-flash"  # Default to Flash for speed
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
    """Maintains agent state across execution"""

    def __init__(self):
        self.messages: List[Any] = []
        self.iterations: int = 0
        self.tool_calls: List[Dict] = []
        self.metadata: Dict[str, Any] = {}
        self.start_time: float = time.time()

    def add_message(self, message: Any) -> None:
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

    def _validate_config(self) -> None:
        """Validate agent configuration"""
        if not self.config.name:
            raise ValueError("Agent must have a name")
        if self.config.system_prompt is None:
            raise ValueError("Agent must have a system prompt")
        if self.config.max_iterations < 1:
            raise ValueError("max_iterations must be >= 1")

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
            output = await self._react_loop(state, context)

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
        from app.core.ai.providers.gemini import GeminiProvider

        state = AgentState()
        context = context or {}

        try:
            self.logger.info("agent_stream_started", user_id=user_id, input_length=len(input))

            # Build system prompt
            system_prompt = await self._get_system_prompt(context)
            state.add_message(SystemMessage(content=system_prompt))

            # Inject chat history
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

            # Initialize LLM provider
            llm = GeminiProvider()

            # Streaming ReAct loop
            for iteration in range(self.config.max_iterations):
                state.iterations = iteration + 1

                # Format prompt
                prompt = self._format_messages(state.messages)
                tools = self._format_tools_for_gemini()

                # Accumulate text for this iteration
                iteration_text = ""
                pending_tool_calls = []

                # Stream from LLM
                async for chunk in llm.stream_with_tools(
                    prompt=prompt,
                    tools=tools,
                    model=self.config.model,
                    temperature=self.config.temperature,
                ):
                    chunk_type = chunk.get("type")

                    if chunk_type == "text":
                        text = chunk.get("content", "")
                        iteration_text += text
                        yield {
                            "type": "token",
                            "text": text,
                            "model": self.config.model,
                            "streaming": True,
                        }

                    elif chunk_type == "tool_call":
                        # Queue tool call for execution after streaming
                        pending_tool_calls.append(
                            {"name": chunk.get("name"), "args": chunk.get("args", {})}
                        )
                        yield {
                            "type": "tool_call",
                            "name": chunk.get("name"),
                            "args": chunk.get("args", {}),
                        }

                    elif chunk_type == "complete":
                        # End of streaming for this iteration
                        pass

                    elif chunk_type == "error":
                        yield {"type": "error", "message": chunk.get("message", "Unknown error")}
                        return

                # Add AI response to state
                if iteration_text:
                    state.add_message(AIMessage(content=iteration_text))

                # If no tool calls, we're done
                if not pending_tool_calls:
                    break

                # Execute pending tool calls
                for tool_call in pending_tool_calls:
                    tool_name = tool_call["name"]
                    tool_args = tool_call["args"]

                    if tool_name not in self.tools_dict:
                        self.logger.warning("unknown_tool_called", tool=tool_name)
                        continue

                    # Execute tool
                    tool_result = await self._execute_tool(tool_name, tool_args)

                    # Track and yield tool result
                    state.add_tool_call(tool_name, tool_args, tool_result)
                    yield {"type": "tool_result", "name": tool_name, "result": tool_result}

                    # Add to messages for next iteration
                    state.add_message(
                        ToolMessage(
                            content=str(tool_result), tool_call_id=f"call_{len(state.tool_calls)}"
                        )
                    )

            # Final completion message
            yield {
                "type": "complete",
                "success": True,
                "iterations": state.iterations,
                "tool_calls": state.tool_calls,
                "total_tokens": self._count_tokens(state.messages),
                "execution_time_ms": state.get_execution_time_ms(),
                "model": self.config.model,
            }

            self.logger.info(
                "agent_stream_completed",
                user_id=user_id,
                iterations=state.iterations,
                tool_calls=len(state.tool_calls),
            )

        except Exception as e:
            self.logger.error("agent_stream_failed", user_id=user_id, error=str(e))
            yield {"type": "error", "message": str(e)}

    # ============================================================================
    # ReAct Loop Implementation
    # ============================================================================

    async def _react_loop(self, state: AgentState, context: Dict[str, Any]) -> str:
        """
        Execute ReAct (Reasoning + Acting) loop

        Pattern:
        1. Thought: Agent reasons about what to do
        2. Action: Agent calls tool or provides answer
        3. Observation: Agent processes tool result
        4. Repeat until done or max iterations

        Args:
            state: Current agent state
            context: Execution context

        Returns:
            Final answer from agent
        """
        from app.core.ai.providers.gemini import GeminiProvider

        llm = GeminiProvider()

        for iteration in range(self.config.max_iterations):
            state.iterations = iteration + 1

            self.logger.debug(
                "react_iteration",
                iteration=iteration + 1,
                max_iterations=self.config.max_iterations,
            )

            # ============================================================
            # CALL LLM (with tools)
            # ============================================================
            try:
                response = await llm.generate_with_tools(
                    prompt=self._format_messages(state.messages),
                    tools=self._format_tools_for_gemini(),
                    model=self.config.model,
                    temperature=self.config.temperature,
                )

                # Add AI message to state
                state.add_message(AIMessage(content=response.get("text", "")))

                # ========================================================
                # CHECK: Tool calls or final answer?
                # ========================================================
                tool_calls = response.get("tool_calls", [])

                if not tool_calls:
                    # No tool calls - agent provided final answer
                    return response.get("text", "")

                # ========================================================
                # EXECUTE TOOLS
                # ========================================================
                for tool_call in tool_calls:
                    tool_name = tool_call["name"]
                    tool_args = tool_call["args"]

                    if tool_name not in self.tools_dict:
                        self.logger.warning("unknown_tool_called", tool=tool_name)
                        continue

                    # Execute tool
                    tool_result = await self._execute_tool(tool_name, tool_args)

                    # Track tool usage
                    state.add_tool_call(tool_name, tool_args, tool_result)

                    # Add tool result to messages
                    state.add_message(
                        ToolMessage(content=str(tool_result), tool_call_id=tool_call.get("id", ""))
                    )

                # Continue loop to let agent process tool results

            except Exception as e:
                self.logger.error("react_iteration_failed", iteration=iteration + 1, error=str(e))

                # Retry or fail
                if iteration < self.config.retry_attempts:
                    await asyncio.sleep(1)  # Brief delay before retry
                    continue
                else:
                    raise

        # Max iterations reached
        self.logger.warning("max_iterations_reached", iterations=self.config.max_iterations)
        return "I apologize, but I couldn't complete the task within the iteration limit."

    # ============================================================================
    # Tool Execution
    # ============================================================================

    async def _execute_tool(self, tool_name: str, args: Dict[str, Any]) -> Any:
        """Execute tool with error handling"""
        tool = self.tools_dict[tool_name]

        self.logger.debug("tool_execution_started", tool=tool_name, args=args)

        start_time = time.time()

        try:
            # Execute tool (sync or async)
            if asyncio.iscoroutinefunction(tool.func):
                result = await tool.func(**args)
            else:
                result = tool.func(**args)

            execution_time = (time.time() - start_time) * 1000

            self.logger.debug(
                "tool_execution_completed", tool=tool_name, execution_time_ms=int(execution_time)
            )

            return result

        except Exception as e:
            self.logger.error("tool_execution_failed", tool=tool_name, error=str(e))
            return f"Error executing {tool_name}: {str(e)}"

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

    def _format_tools_for_gemini(self) -> List[Dict]:
        """Convert BaseTool to Gemini function declarations"""
        declarations = []
        for tool in self.config.tools:
            declarations.append(
                {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.args_schema.schema() if hasattr(tool, "args_schema") else {},
                }
            )
        return declarations

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
