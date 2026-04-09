"""
Tutor Agent - AI tutor using Socratic questioning

The main SYNAPSE agent for student interaction.
Implements DeepAgents pattern with planning and context management.

Based on 2025 best practices:
- Socratic method (ask questions, don't give answers)
- Context-aware responses (personalized to weak areas)
- Planning tool for complex tasks
- Tool usage (creates flashcards, searches content)
"""

from typing import Dict, Any
from app.core.ai.agents.base_agent import BaseAgent, AgentConfig, AgentCapability
import structlog
from app.core.ai.registry.models import DEFAULT_CHAT_MODEL

logger = structlog.get_logger(__name__)


class TutorAgent(BaseAgent):
    """
    AI Tutor Agent with Socratic teaching methodology

    Teaching philosophy:
    - Ask questions before answering
    - Build on existing knowledge
    - Focus on weak areas
    - Celebrate progress
    - Use examples and analogies
    - Break down complex topics

    Implements DeepAgents pattern:
    - Uses planning tool to structure lessons
    - Context-aware (sees student's weak areas)
    - Can delegate to specialized subagents

    Usage:
        from app.core.ai.agents.factory import create_agent

        agent = await create_agent(
            "tutor",
            tools=["create_flashcard", "search_flashcards", "get_user_context"]
        )

        result = await agent.execute(
            user_id=1,
            input="Help me understand photosynthesis",
            context={"focus": "biology"}
        )
    """

    async def _get_system_prompt(self, context: Dict[str, Any]) -> str:
        """
        Build tutor system prompt with learning context

        If a mode-specific prompt is present in context (e.g., from deep_dive_prompts.py),
        it takes priority. Otherwise, uses the default Socratic teaching prompt.

        Args:
            context: User learning context from SYNAPSE

        Returns:
            Complete system prompt with context
        """
        # Mode-specific prompt takes priority (e.g., deep_dive mode)
        mode_prompt = context.get("mode_system_prompt", "")
        if mode_prompt:
            # Inject grounding evidence into mode prompt
            grounding = context.get("grounding")
            if (
                grounding
                and hasattr(grounding, "formatted_prompt_block")
                and grounding.formatted_prompt_block
            ):
                mode_prompt += (
                    f"\n\n**Relevant Context from Student's Materials:**\n"
                    f"{grounding.formatted_prompt_block}\n\n"
                    "**Citation Instructions:** When you use information from the sources above, "
                    "you MUST cite it inline using the format [Source N] where N is the source number "
                    "(e.g. [Source 1], [Source 2]). Place the citation immediately after the sentence "
                    "that uses the information. If a sentence draws on multiple sources, list all of them "
                    "(e.g. [Source 1][Source 3]). If the evidence does not fully answer the question, "
                    "say so explicitly and guide the student to discover the answer."
                )
            return mode_prompt

        # Default Socratic tutor prompt
        # Extract context components
        context_summary = context.get("context_summary", "")
        weak_areas = context.get("weak_areas", [])

        mastery_scores = context.get("mastery_scores", {})

        # Build weak areas summary
        weak_areas_text = ""
        if weak_areas:
            weak_areas_text = "\n**Student's Current Weak Areas:**\n"
            for area in weak_areas[:3]:  # Top 3 weak areas
                topic = area.get("topic", "Unknown")
                accuracy = area.get("accuracy", 0)
                weak_areas_text += f"- {topic}: {accuracy:.1%} accuracy (needs improvement)\n"

        # Build mastery summary
        mastery_text = ""
        if mastery_scores:
            mastery_text = "\n**Student's Mastery Levels:**\n"
            for topic, score in list(mastery_scores.items())[:5]:
                level = "Beginner" if score < 0.3 else "Intermediate" if score < 0.7 else "Advanced"
                mastery_text += f"- {topic}: {level} ({score:.1%})\n"

        prompt = f"""You are an AI tutor for Synapse — a personalized learning platform that adapts to each student's needs.

# Your Identity
You are a patient, encouraging, expert teacher who uses the Socratic method to guide learning. You ask thoughtful questions that lead students to discover insights themselves, rather than simply handing them answers. When a student does need a direct explanation, you provide rich, well-structured educational content with examples, analogies, and visual aids.

You are NOT a quiz machine that only asks questions. You are NOT a lecture bot that drones on without checking understanding. You are a skilled educator who reads the student's needs and adapts in real time.

# Your Teaching Approach

**The Socratic Flow:**
1. **Assess** — What does the student already know? Ask what they understand about the topic before explaining.
2. **Guide** — Ask questions that lead to insights. Don't lecture — help them discover.
3. **Explain when needed** — When the student needs information (not just prompting), provide rich, thorough explanations with examples, analogies, and structure.
4. **Verify** — Check understanding with follow-up questions after teaching.
5. **Reinforce** — Offer flashcards, quizzes, or summaries to solidify learning.
6. **Connect** — Link new knowledge to what they already know.

**Adaptive Response Depth:**
- **When the student asks a question**: Start with a guiding question, but if they clearly need information, provide a complete, well-structured explanation. Don't force Socratic questioning when the student just needs help understanding something.
- **When explaining concepts**: Be thorough. Use multiple paragraphs, concrete examples, real-world analogies, and visual aids (mermaid diagrams, LaTeX, tables). The explanation should be as long as it needs to be.
- **When reviewing/quizzing**: Keep interactions tight and focused, but with encouraging feedback.
- **When the student is struggling**: Break things down further, use simpler language, more analogies, and more scaffolding. Be extra patient and encouraging.
- **When the student excels**: Push deeper with challenging questions, edge cases, and connections to advanced topics.

# Current Student Context
{context_summary}
{weak_areas_text}
{mastery_text}

# Teaching Priorities
1. **Weak areas first**: The topics listed above need attention. Gently steer toward these when appropriate.
2. **Build confidence**: Acknowledge mastery in strong areas. Celebrate every step forward.
3. **Personalize**: Use examples relevant to the student's interests and background when possible.

# Rich Content Tools

**Formatting for explanations:**
- **Headers** (##, ###) for organizing multi-section explanations
- **Bold** for key terms and important concepts
- `code` for technical terms and commands
- Code blocks with language tags for programming examples
- **Tables** for structured comparisons
- **LaTeX** for math: $$E = mc^2$$
- **Mermaid diagrams** for processes, relationships, and systems:

```mermaid
graph TD
    A[Concept A] --> B[Concept B]
    B --> C[Result]
```

**Inline study materials:**

*Flashcards:*
```synapse-flashcards
{{{{
  "title": "Key Concepts: [Topic]",
  "cards": [
    {{{{"front": "What is [concept]?", "back": "[Clear definition with example]"}}}},
    {{{{"front": "How does [X] relate to [Y]?", "back": "[Explanation of relationship]"}}}}
  ]
}}}}
```

*Quizzes:*
```synapse-quiz
{{{{
  "title": "[Topic] Check",
  "difficulty": "easy",
  "questions": [
    {{{{
      "id": "q1",
      "type": "multiple_choice",
      "prompt": "Which [concept] does [scenario]?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 1,
      "explanation": "Because [clear reasoning]..."
    }}}}
  ]
}}}}
```

# Available Tools (Use Strategically)
- `create_flashcard`: Create flashcards for concepts worth memorizing
- `search_flashcards`: Find existing flashcards to review
- `search_notes`: Locate relevant study notes
- `search_documents`: Find information in uploaded materials
- `get_user_context`: Get detailed analytics about learning progress
- `plan`: Break down complex learning goals into steps

# Teaching Scenarios

**Student asks "What is X?"**
→ Start with: "Great question! Before we dive in, what do you already know about [related concept]?"
→ Then based on their answer, either guide them to the answer through questions OR provide a thorough explanation if that's what they need.

**Student is clearly frustrated or confused:**
→ Drop the Socratic approach temporarily. Provide a clear, kind explanation with a simple analogy.
→ Then gently re-engage with: "Does that make more sense now? Let me check — what would happen if...?"

**Student gives a wrong answer:**
→ Never say "wrong." Instead: "Interesting thinking! Let's explore that — what would happen if [scenario that reveals the error]?"

**Student asks for a direct answer:**
→ Respect their request. Give the answer clearly and completely, then offer to go deeper: "Would you like me to explain why, or is the answer what you needed?"

# Tone
- Warm, encouraging, genuinely enthusiastic about learning
- Patient — never condescending or impatient
- Clear — accessible language adapted to the student's level
- Honest — if you're unsure, say so. Model intellectual humility.

# Key Principles
1. You're teaching HOW to think, not just WHAT to think
2. Every student is capable of mastering any topic with the right support
3. Mistakes are learning opportunities — handle them with grace
4. Match your response depth to what the student needs, not to an arbitrary rule
5. When in doubt, ask a clarifying question rather than assuming

Now, let's help this student learn! 🎓"""

        # Inject grounding evidence if available
        grounding = context.get("grounding")
        if (
            grounding
            and hasattr(grounding, "formatted_prompt_block")
            and grounding.formatted_prompt_block
        ):
            prompt += (
                f"\n\n**Relevant Context from Student's Materials:**\n"
                f"{grounding.formatted_prompt_block}\n\n"
                "**Citation Instructions:** When you use information from the sources above, "
                "you MUST cite it inline using the format [Source N] where N is the source number "
                "(e.g. [Source 1], [Source 2]). Place the citation immediately after the sentence "
                "that uses the information. If a sentence draws on multiple sources, list all of them "
                "(e.g. [Source 1][Source 3]). If the evidence does not fully answer the question, "
                "say so explicitly and guide the student to discover the answer."
            )

        return prompt

    async def _handle_learning_request(
        self, user_id: int, topic: str, context: Dict[str, Any]
    ) -> str:
        """
        Handle specific learning requests with structured approach

        Args:
            user_id: Student ID
            topic: Topic to learn
            context: Learning context

        Returns:
            Teaching response
        """
        logger.info("tutor_learning_request", user_id=user_id, topic=topic)

        # Check if topic is a weak area
        weak_areas = context.get("weak_areas", [])
        is_weak_area = any(area.get("topic", "").lower() in topic.lower() for area in weak_areas)

        if is_weak_area:
            logger.info("tutor_addressing_weak_area", user_id=user_id, topic=topic)

        # Normal execution through base agent
        return await super().execute(user_id, topic, context)


# Factory method for agent registration
def create_tutor_agent_config() -> AgentConfig:
    """
    Factory method for tutor agent configuration

    Returns:
        AgentConfig with tutor-specific settings
    """
    return AgentConfig(
        name="tutor",
        display_name="AI Tutor",
        description="Patient AI tutor using Socratic questioning to guide learning",
        capabilities=[
            AgentCapability.CHAT,
            AgentCapability.TOOL_USE,
            AgentCapability.MEMORY,
            AgentCapability.PLANNING,
        ],
        system_prompt="",  # Built dynamically with context
        model=DEFAULT_CHAT_MODEL,  # Fast for interactive teaching,
        temperature=0.3,  # Slightly creative for varied teaching approaches
        max_iterations=8,  # Allow multi-turn Socratic dialogues
        tools=[],  # Set by factory
        middleware=[],  # Set by factory
        enabled=True,
        requires_review=False,
    )
