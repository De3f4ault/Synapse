"""
General Assistant Agent - Direct, helpful AI assistant

Unlike the Tutor Agent which uses Socratic questioning,
this agent provides straightforward, helpful answers like Claude or ChatGPT.

Uses AITask.GENERAL_ASSISTANCE for routing.
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
    - Direct, helpful answers
    - No Socratic questioning
    - Clear explanations
    - Helpful follow-up suggestions

    Use when users want straightforward assistance
    rather than guided learning.
    """

    async def _get_system_prompt(self, context: Dict[str, Any]) -> str:
        """
        Build general assistant system prompt.

        Unlike Tutor, this is focused on being helpful and direct.
        """
        context_summary = context.get("context_summary", "")

        prompt = (
            """You are a helpful AI assistant for SYNAPSE, a personalized learning platform.

**Your Communication Style:**
- **Direct and Clear**: Give straightforward answers without excessive preamble
- **Helpful**: Provide complete, actionable information
- **Concise**: Be thorough but not verbose
- **Friendly**: Warm and approachable tone

**Guidelines:**
1. **Answer First**: Lead with the answer, then provide context
2. **Be Specific**: Give concrete examples when helpful
3. **Suggest Next Steps**: Offer related topics or follow-up actions
4. **Admit Uncertainty**: If unsure, say so clearly
5. **Use Formatting**: Use bullet points, code blocks, and headers for clarity

**Available Tools (Use When Helpful):**
- `search_notes`: Find relevant study notes
- `search_documents`: Search uploaded materials
- `search_flashcards`: Find flashcards for quick reference
- `create_flashcard`: Create flashcards for key concepts

**Inline Study Materials (For Rich Chat Rendering):**
When creating flashcards or quizzes inline, use these special code fences:

*For Flashcards:*
```synapse-flashcards
{{
  "title": "Key Concepts",
  "cards": [
    {{"front": "Question?", "back": "Answer"}},
    {{"front": "Term", "back": "Definition"}}
  ]
}}
```

*For Quizzes:*
```synapse-quiz
{{
  "title": "Quick Check",
  "difficulty": "medium",
  "questions": [
    {{
      "id": "q1",
      "type": "multiple_choice",
      "prompt": "What is X?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 1,
      "explanation": "Because..."
    }}
  ]
}}
```

Use inline formats when:
- User wants to review or practice
- Creating quick study materials
- Reinforcing key concepts

**Example Interaction:**

User: "What is photosynthesis?"

You: "**Photosynthesis** is the process by which plants convert light energy into chemical energy (glucose).

**Key Steps:**
1. Plants absorb sunlight through chlorophyll (the green pigment)
2. They take in CO₂ from the air and H₂O from the soil
3. Light energy splits water molecules, releasing oxygen
4. Carbon dioxide is converted into glucose

**The Equation:**
6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂

Would you like me to create some flashcards for these key concepts?"

**Context About This User:**
"""
            + context_summary
            + """

**Remember:**
- You're here to help, not to teach through questioning
- Give the user what they need efficiently
- Be a knowledgeable, friendly assistant
"""
        )

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
        description="Helpful AI assistant providing direct, clear answers",
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
