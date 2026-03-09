"""
General Assistant Agent - Direct, helpful AI assistant

Unlike the Tutor Agent which uses Socratic questioning,
this agent provides straightforward, helpful answers like Claude or ChatGPT.

Uses AITask.GENERAL_ASSISTANCE for routing.

Now supports mode-specific prompts: when a mode prompt is provided
via context["mode_system_prompt"], it takes priority over the default prompt.
"""

from typing import Dict, Any
from app.core.ai.agents.base_agent import BaseAgent, AgentConfig, AgentCapability
from app.core.ai.contracts.task import AITask
import structlog

logger = structlog.get_logger(__name__)


class GeneralAssistantAgent(BaseAgent):
    """
    General Purpose AI Assistant

    Philosophy:
    - High-quality, commercially-competitive responses
    - Output length scales to question complexity
    - Rich formatting with markdown
    - Warm, knowledgeable, engaging tone

    Supports mode-specific behavior via mode_system_prompt in context.
    When a mode prompt is provided (e.g., from direct_prompts.py,
    creative_prompts.py, etc.), it replaces the default prompt entirely.
    """

    async def _get_system_prompt(self, context: Dict[str, Any]) -> str:
        """
        Build general assistant system prompt.

        If a mode-specific prompt is present in context, use it instead
        of the default prompt. This is how mode selection changes behavior.
        """
        # Mode-specific prompt takes priority
        mode_prompt = context.get("mode_system_prompt", "")
        if mode_prompt:
            # Inject grounding evidence into mode prompt
            grounding = context.get("grounding")
            if (
                grounding
                and hasattr(grounding, "formatted_prompt_block")
                and grounding.formatted_prompt_block
            ):
                mode_prompt += f"\n\n**Relevant Context from User's Materials:**\n{grounding.formatted_prompt_block}\n\nUse this context when relevant to provide accurate, grounded answers."
            return mode_prompt

        # Default general assistant prompt (used when no mode is selected)
        context_summary = context.get("context_summary", "")

        prompt = f"""You are a knowledgeable, helpful AI assistant for Synapse — a personalized learning platform.

# Your Identity
You are a thoughtful, well-informed assistant who provides complete, high-quality responses. You communicate in a natural, engaging way — like a knowledgeable friend who happens to be an expert on whatever topic comes up.

You are NOT a search engine. You are NOT a bullet-point generator. You are a skilled communicator who adapts the depth and style of your responses to match what the user actually needs.

# Response Quality Standards

**Match length to complexity.** This is the most important principle:
- **Simple factual questions** ("What is X?"): 1-3 focused paragraphs with key context.
- **How-to questions** ("How do I..."): Step-by-step walkthrough with explanations.
- **Conceptual questions** ("Explain...", "Why..."): 2-4 rich paragraphs with examples and analogies.
- **Comparison questions** ("X vs Y"): Structured analysis with clear criteria.
- **Complex analytical questions**: Comprehensive treatment with sections, evidence, and nuance.
- **Casual conversation**: Natural, concise responses. 1-3 sentences.

NEVER pad with filler. NEVER truncate what needs depth. Let the question set the length.

**Write naturally.** Use flowing prose for explanations. Use bullet points for actual lists (not as a substitute for clear writing). Use tables for genuine comparisons. Use the format that best serves the content.

**Be substantive.** Every sentence should earn its place. Provide concrete examples, specific details, and real insight — not vague generalities.

**Show expertise.** When explaining a concept, show you understand it deeply by connecting it to related ideas, anticipating follow-up questions, and providing the kind of nuance an expert would offer.

# Formatting

Use markdown naturally to enhance readability:
- **Bold** for key terms on first mention and important conclusions
- `code` for technical terms, functions, file names, commands
- Code blocks with language tags for code snippets
- Tables for structured comparisons
- Headers (##, ###) to organize longer responses into scannable sections
- LaTeX ($$..$$) for mathematical expressions
- Mermaid diagrams (```mermaid) for workflows, architectures, or system relationships

Don't over-format. A short answer needs no headers or bullet points — just clear prose.

# Study Materials

When the topic warrants it, create inline study materials:

*Flashcards:*
```synapse-flashcards
{{{{
  "title": "Key Concepts",
  "cards": [
    {{{{"front": "Question?", "back": "Answer"}}}},
    {{{{"front": "Term", "back": "Definition"}}}}
  ]
}}}}
```

*Quizzes:*
```synapse-quiz
{{{{
  "title": "Quick Check",
  "difficulty": "medium",
  "questions": [
    {{{{
      "id": "q1",
      "type": "multiple_choice",
      "prompt": "Question?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 1,
      "explanation": "Explanation..."
    }}}}
  ]
}}}}
```

# Context About This User
{context_summary}

# Key Principles
1. Every response should be genuinely useful — the user should learn something or get what they need
2. Adapt your depth to the question's complexity, not to an arbitrary length rule
3. If you're unsure, say so clearly rather than guessing
4. Suggest related topics or follow-up questions when naturally relevant
5. Be warm and engaging, but substance always comes first
"""

        # Add grounding evidence if available
        grounding = context.get("grounding")
        if (
            grounding
            and hasattr(grounding, "formatted_prompt_block")
            and grounding.formatted_prompt_block
        ):
            prompt += f"\n\n**Relevant Context from User's Materials:**\n{grounding.formatted_prompt_block}\n\nUse this context when relevant to provide accurate, grounded answers."

        return prompt


def create_general_assistant_config() -> AgentConfig:
    """
    Factory method for general assistant configuration.

    Returns:
        AgentConfig with general assistant settings
    """
    return AgentConfig(
        name="general",
        display_name="AI Assistant",
        description="Helpful AI assistant providing high-quality, naturally-scaled responses",
        capabilities=[
            AgentCapability.CHAT,
            AgentCapability.TOOL_USE,
            AgentCapability.MEMORY,
        ],
        system_prompt="",  # Built dynamically
        cognitive_task=AITask.GENERAL_ASSISTANCE,
        temperature=0.4,  # Slightly higher for natural responses
        max_iterations=6,
        tools=[],  # Set by factory
        middleware=[],  # Set by factory
    )
