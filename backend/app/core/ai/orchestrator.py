"""
Agent Orchestrator - Central routing and coordination for AI requests.

This is the "brain" that decides which agent or workflow should handle
each user request. It provides:

1. Intent-based routing to specialized agents
2. Workflow execution for complex multi-agent tasks
3. Unified interface for chat.py to call

Based on custom agent orchestration with typed state.
"""

from typing import Dict, Any, Optional, List
from dataclasses import dataclass
import structlog

from app.core.ai.routing import IntentRouter, IntentType
from app.core.ai.agents.base_agent import AgentResult

logger = structlog.get_logger(__name__)


@dataclass
class OrchestrationResult:
    """Result from orchestrator execution."""

    success: bool
    output: str
    agent_used: str
    confidence: float
    tokens_used: int = 0
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class AgentOrchestrator:
    """
    Central orchestrator for all AI agent requests.

    Responsibilities:
    - Classify user intent
    - Route to appropriate agent or workflow
    - Manage agent execution
    - Handle fallbacks and errors

    Usage:
        orchestrator = get_orchestrator()
        result = await orchestrator.handle_message(
            message="Help me understand quantum physics",
            user_id=1,
            session_id=23,
            context={"weak_areas": ["physics"]},
            chat_history=[...]
        )
    """

    def __init__(self):
        self.router = IntentRouter(use_llm_fallback=True)
        self.logger = logger.bind(component="orchestrator")
        self._initialized = False

    async def initialize(self):
        """Initialize orchestrator (called at app startup)."""
        if self._initialized:
            return

        self.logger.info("orchestrator_initializing")

        # Register RAG tools first (they use the RAGPipeline)
        try:
            from app.core.ai.tools.rag_tools import register_rag_tools

            register_rag_tools()
            self.logger.info("rag_tools_registered")
        except Exception as e:
            self.logger.warning("rag_tools_registration_failed", error=str(e))

        # Ensure agents are registered
        await self._ensure_agents_registered()

        self._initialized = True
        self.logger.info("orchestrator_initialized")

    async def _ensure_agents_registered(self):
        """Ensure all agents are registered in the registry."""
        from app.core.ai.agents.factory import get_agent_factory
        from app.core.ai.agents.registry import AgentRegistry
        from app.core.ai.agents.implementations.tutor_agent import TutorAgent
        from app.core.ai.agents.implementations.document_agent import DocumentAgent
        from app.core.ai.agents.implementations.quiz_agent import QuizAgent
        from app.core.ai.agents.implementations.dashboard_agent import DashboardAgent
        from app.core.ai.agents.implementations.general_assistant_agent import GeneralAssistantAgent

        factory = get_agent_factory()
        registry = AgentRegistry()

        # Register agent classes if not already done
        agent_classes = {
            "tutor": TutorAgent,
            "document": DocumentAgent,
            "quiz": QuizAgent,
            "dashboard": DashboardAgent,
            "general": GeneralAssistantAgent,
        }

        for name, agent_class in agent_classes.items():
            if name not in factory._agent_classes:
                factory.register_agent_class(name, agent_class)

        # Create and register agent instances if not present
        for name in agent_classes:
            if not registry.exists(name):
                try:
                    agent = await factory.create(name)
                    registry.register(agent)
                    self.logger.info("agent_registered", agent=name)
                except Exception as e:
                    self.logger.warning("agent_registration_failed", agent=name, error=str(e))

    async def handle_message(
        self,
        message: str,
        user_id: int,
        session_id: int,
        context: Optional[Dict[str, Any]] = None,
        chat_history: Optional[List[Dict[str, Any]]] = None,
    ) -> OrchestrationResult:
        """
        Handle incoming user message with intelligent routing.

        Args:
            message: User's message
            user_id: User ID for context
            session_id: Chat session ID
            context: Learning context (weak areas, preferences, etc.)
            chat_history: Previous conversation messages

        Returns:
            OrchestrationResult with agent response
        """
        context = context or {}
        chat_history = chat_history or []

        self.logger.info(
            "orchestrator_handling_message",
            user_id=user_id,
            session_id=session_id,
            message_length=len(message),
            history_length=len(chat_history),
        )

        try:
            # 1. Ensure initialized
            await self.initialize()

            # 2. Classify intent
            classification = await self.router.classify(message, context)

            self.logger.info(
                "intent_classified",
                intent=classification.intent,
                confidence=classification.confidence,
                reasoning=classification.reasoning,
            )

            # 3. Route based on intent
            # Note: classification.intent is a string because IntentClassification uses use_enum_values=True
            intent_value = classification.intent
            if isinstance(intent_value, IntentType):
                intent_value = intent_value.value

            if intent_value == "workflow":
                return await self._execute_workflow(
                    message=message,
                    user_id=user_id,
                    session_id=session_id,
                    context=context,
                    chat_history=chat_history,
                )
            else:
                return await self._execute_agent(
                    agent_name=intent_value,  # Already a string like "tutor"
                    message=message,
                    user_id=user_id,
                    context=context,
                    chat_history=chat_history,
                    confidence=classification.confidence,
                )

        except Exception as e:
            self.logger.error("orchestrator_error", error=str(e), user_id=user_id)

            # Fallback to tutor agent on error
            return await self._fallback_to_tutor(
                message=message,
                user_id=user_id,
                context=context,
                chat_history=chat_history,
                error=str(e),
            )

    async def handle_message_stream(
        self,
        message: str,
        user_id: int,
        session_id: int,
        context: Optional[Dict[str, Any]] = None,
        chat_history: Optional[List[Dict[str, Any]]] = None,
        mode_id: str = "socratic",
        tier_override: Optional[str] = None,
        model_override: Optional[str] = None,
        image_bytes: Optional[List[bytes]] = None,
    ):
        """
        Handle incoming user message with streaming response.

        Yields chunks as they arrive from the agent.

        Args:
            message: User's message
            user_id: User ID for context
            session_id: Chat session ID
            context: Learning context (weak areas, preferences, etc.)
            chat_history: Previous conversation messages
            mode_id: AI mode (socratic, direct, deep_dive, creative)
            tier_override: Optional tier override (speed, balanced, reasoning, thinking)
            model_override: Optional direct model key

        Yields:
            {type: "token", text: "..."} - Streamed text tokens
            {type: "thinking", text: "..."} - Thinking process
            {type: "tool_call", name: "...", args: {...}} - Tool calls
            {type: "tool_result", name: "...", result: {...}} - Tool results
            {type: "complete", metadata: {...}} - Completion signal
            {type: "error", message: "..."} - Error signal
        """
        context = context or {}
        chat_history = chat_history or []

        self.logger.info(
            "orchestrator_handling_message_stream",
            user_id=user_id,
            session_id=session_id,
            message_length=len(message),
            history_length=len(chat_history),
            mode_id=mode_id,
            tier_override=tier_override,
        )

        try:
            # 1. Ensure initialized
            await self.initialize()

            # 2. Resolve capability alias using Mode → Alias mapping.
            # The LiteLLM Router owns all provider/model selection from here.
            from app.core.ai.providers.litellm_router import (
                mode_to_alias,
                REGISTRY_KEY_TO_ALIAS,
            )
            from app.core.ai.modes import get_mode

            # model_override is a MODEL_REGISTRY key sent by the frontend picker
            # (e.g. "deepseek_v3_2", "qwen3_next").  Translate it to the correct
            # LiteLLM alias; if the key is unknown, treat it as a raw alias (backward
            # compat) or fall back to the mode-derived alias.
            if model_override:
                litellm_alias = REGISTRY_KEY_TO_ALIAS.get(
                    model_override,
                    model_override,  # pass-through if it's already a valid alias
                )
            else:
                litellm_alias = mode_to_alias(mode_id)

            mode = get_mode(mode_id)

            self.logger.info(
                "mode_resolved",
                mode=mode_id,
                tier_override=tier_override,
                model_override=model_override,
                resolved_alias=litellm_alias,
            )

            # 2.5. Multimodal intercept — auto-upgrade to vision alias when needed
            if image_bytes:
                VISION_ALIAS = "synapse-vision"
                # Text-only models that cannot handle images
                _TEXT_ONLY_ALIASES = {"synapse-reasoning", "synapse-deepseek-explicit", "synapse-chat", "synapse-coding"}

                if litellm_alias in _TEXT_ONLY_ALIASES:
                    # User picked a text-only model (or default reasoning) but sent an image.
                    # Override silently to vision alias + emit a warning so the UI can display
                    # "Switched to vision model for image analysis".
                    self.logger.info(
                        "multimodal_auto_upgrade",
                        original_alias=litellm_alias,
                        upgraded_to=VISION_ALIAS,
                        reason="Image detected — text-only alias overridden to vision",
                    )
                    yield {
                        "type": "model_upgraded",
                        "original_model": litellm_alias,
                        "upgraded_to": VISION_ALIAS,
                        "reason": (
                            f"'{litellm_alias}' doesn't support images — "
                            f"switched to Qwen3-VL for visual understanding."
                        ),
                    }
                    litellm_alias = VISION_ALIAS

                # else: already a vision-capable alias (synapse-vision) — proceed

            # else: no images — RULE 3, proceed with resolved alias unchanged


            # 3. Route to agent - conditionally use intent classification
            # If mode has explicit agent_name, use it directly (skip classifier)
            # If mode uses "__classify__", run intent classification
            from app.core.ai.agents.registry import AgentRegistry

            registry = AgentRegistry()

            if mode.agent_name == "__classify__":
                # Auto mode: use intent classification
                classification = await self.router.classify(message, context)
                intent_value = classification.intent
                if isinstance(intent_value, IntentType):
                    intent_value = intent_value.value

                self.logger.info(
                    "intent_classified_streaming",
                    intent=classification.intent,
                    confidence=classification.confidence,
                )

                agent_name = intent_value if intent_value != "workflow" else "tutor"
                confidence = classification.confidence
            else:
                # Explicit mode: use mode's agent directly (skip classifier)
                agent_name = mode.agent_name
                confidence = 1.0  # User explicitly chose this mode

                self.logger.info(
                    "mode_explicit_routing",
                    mode=mode_id,
                    agent=agent_name,
                    message="Skipping intent classification for explicit mode",
                )

            # 4. Get agent instance (fallback to tutor if not found)
            try:
                agent = registry.get(agent_name)
            except ValueError:
                self.logger.warning(
                    "agent_not_found_fallback",
                    requested_agent=agent_name,
                    fallback="tutor",
                )
                agent_name = "tutor"
                agent = registry.get("tutor")

            self.logger.info("routing_to_agent_stream", agent=agent_name, user_id=user_id)

            # 5. Yield metadata about routing and model
            yield {
                "type": "routing",
                "agent": agent_name,
                "mode": mode_id,
                "confidence": confidence,
                "model": litellm_alias,
                "thinking_ui": mode.thinking_ui.value,
            }

            # 7. Enhance context with mode and model info
            # Load comprehensive mode prompt from dedicated prompt file
            from app.core.ai.agents.prompts import get_mode_prompt

            mode_prompt = ""
            if mode.prompt_module:
                mode_prompt = get_mode_prompt(mode.prompt_module, context)

            enhanced_context = {
                **context,
                "mode_id": mode_id,
                "litellm_alias": litellm_alias,
                "mode_system_prompt": mode_prompt,
            }

            # Inject image bytes into context for vision models
            if image_bytes:
                enhanced_context["image_bytes"] = image_bytes
                self.logger.info(
                    "orchestrator_image_inject",
                    image_count=len(image_bytes),
                    image_sizes=[len(b) for b in image_bytes],
                    litellm_alias=litellm_alias,
                )

            # 8. Stream from agent.
            # The LiteLLM Router inside the agent handles all failover and
            # cooldown logic transparently — no manual retry needed here.
            async for chunk in agent.execute_stream(
                user_id=user_id,
                input=message,
                context=enhanced_context,
                chat_history=chat_history,
            ):
                yield chunk

            # 9. Update metrics
            registry.update_metrics(
                agent_name=agent_name,
                success=True,
                execution_time_ms=0,  # Will be in chunk metadata
            )

        except Exception as e:
            self.logger.error(
                "orchestrator_stream_error", error=str(e), user_id=user_id, exc_info=True
            )
            yield {"type": "error", "message": str(e)}

    async def _execute_agent(
        self,
        agent_name: str,
        message: str,
        user_id: int,
        context: Dict[str, Any],
        chat_history: List[Dict[str, Any]],
        confidence: float,
    ) -> OrchestrationResult:
        """Execute a single agent."""
        from app.core.ai.agents.registry import AgentRegistry

        registry = AgentRegistry()

        try:
            agent = registry.get(agent_name)
        except ValueError:
            # Agent not registered, fall back to tutor
            self.logger.warning("agent_not_found_falling_back", requested=agent_name)
            agent_name = "tutor"
            agent = registry.get("tutor")

        # Execute agent
        result: AgentResult = await agent.execute(
            user_id=user_id, input=message, context=context, chat_history=chat_history
        )

        # Update registry metrics
        registry.update_metrics(
            agent_name=agent_name,
            success=result.success,
            execution_time_ms=result.execution_time_ms,
        )

        return OrchestrationResult(
            success=result.success,
            output=result.output if result.success else (result.error or "An error occurred"),
            agent_used=agent_name,
            confidence=confidence,
            tokens_used=result.total_tokens,
            metadata={
                "iterations": result.iterations,
                "tool_calls": len(result.tool_calls),
                "execution_time_ms": result.execution_time_ms,
            },
        )

    async def _execute_workflow(
        self,
        message: str,
        user_id: int,
        session_id: int,
        context: Dict[str, Any],
        chat_history: List[Dict[str, Any]],
    ) -> OrchestrationResult:
        """Execute multi-agent workflow."""
        from app.core.ai.workflows.multi_agent_collab import execute_multi_agent_workflow

        try:
            document_id = context.get("document_id")

            result = await execute_multi_agent_workflow(
                user_id=user_id, document_id=document_id, task=message
            )

            # Extract output from workflow result
            if result.get("error"):
                output = f"Workflow encountered an issue: {result['error']}"
                success = False
            else:
                # Combine outputs from all steps
                outputs = []
                if result.get("analysis", {}).get("summary"):
                    outputs.append(f"**Analysis:** {result['analysis']['summary']}")
                if result.get("quiz", {}).get("result"):
                    outputs.append(f"**Quiz:** {result['quiz']['result']}")
                if result.get("study_plan", {}).get("result"):
                    outputs.append(f"**Study Plan:** {result['study_plan']['result']}")

                output = "\n\n".join(outputs) if outputs else "Workflow completed successfully."
                success = True

            return OrchestrationResult(
                success=success,
                output=output,
                agent_used="workflow",
                confidence=0.8,
                metadata={
                    "steps_completed": len(result.get("messages", [])),
                    "workflow_type": "multi_agent_collab",
                },
            )

        except Exception as e:
            self.logger.error("workflow_execution_failed", error=str(e))
            return OrchestrationResult(
                success=False,
                output=f"Workflow failed: {str(e)}",
                agent_used="workflow",
                confidence=0.0,
            )

    async def _fallback_to_tutor(
        self,
        message: str,
        user_id: int,
        context: Dict[str, Any],
        chat_history: List[Dict[str, Any]],
        error: str,
    ) -> OrchestrationResult:
        """Fallback to tutor agent when other routing fails."""
        self.logger.info("falling_back_to_tutor", original_error=error)

        return await self._execute_agent(
            agent_name="tutor",
            message=message,
            user_id=user_id,
            context=context,
            chat_history=chat_history,
            confidence=0.5,  # Lower confidence since this is a fallback
        )

    def get_available_agents(self) -> List[str]:
        """Get list of available agent names."""
        from app.core.ai.agents.registry import AgentRegistry

        return AgentRegistry().list_agents()

    def get_agent_info(self, agent_name: str) -> Dict[str, Any]:
        """Get information about a specific agent."""
        from app.core.ai.agents.registry import AgentRegistry

        return AgentRegistry().get_agent_info(agent_name)


# Global orchestrator instance
_orchestrator: Optional[AgentOrchestrator] = None


def get_orchestrator() -> AgentOrchestrator:
    """Get global orchestrator instance."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = AgentOrchestrator()
    return _orchestrator


async def handle_message(
    message: str,
    user_id: int,
    session_id: int,
    context: Optional[Dict[str, Any]] = None,
    chat_history: Optional[List[Dict[str, Any]]] = None,
) -> OrchestrationResult:
    """Convenience function for handling messages."""
    orchestrator = get_orchestrator()
    return await orchestrator.handle_message(
        message=message,
        user_id=user_id,
        session_id=session_id,
        context=context,
        chat_history=chat_history,
    )
