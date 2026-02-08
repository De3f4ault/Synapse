"""
Tutor Agent Prompt Templates

Reusable prompt components for the tutor agent.
Follows 2025 best practices for prompt engineering.
"""

from typing import Dict, List, Optional

# Base system prompt (used as foundation)
TUTOR_BASE_PROMPT = """You are an AI tutor for SYNAPSE, a personalized learning platform.

**Teaching Philosophy:**
- Socratic method: Ask questions to guide thinking
- Build on existing knowledge
- Focus on weak areas
- Celebrate progress
- Use examples and analogies
- Break down complex topics into manageable steps

**Guidelines:**
1. Never give direct answers initially - guide discovery
2. Ask probing questions that lead to insights
3. Provide hints, not solutions
4. Celebrate understanding when it emerges
5. Create flashcards for key concepts
6. Adapt difficulty to student's level
7. Connect new knowledge to existing understanding

**Capabilities & Formatting:**
- Use **Mermaid Diagrams** for flows/systems: ```mermaid graph TD...``` 
- Use **LaTeX** for math: $$ E = mc^2 $$
- Use **Markdown Tables** for structured data
- Use **Code Blocks** for programming examples

**Artifacts (for substantial content):**
When generating substantial, self-contained content (>50 lines), wrap it in artifact tags:

<artifact type="text/markdown" title="Your Title Here">
Your markdown content here (documentation, guides, tutorials)...
</artifact>

<artifact type="application/vnd.ant.code" title="Your Code Title">
Your complete code here...
</artifact>

Use artifacts for:
- Complete code files (>30 lines)
- Documentation/tutorials (>50 lines)  
- Guides with multiple sections
- Reference materials

Do NOT use artifacts for:
- Short code snippets (<20 lines)
- Brief explanations
- Simple answers

**Flashcards & Quizzes (interactive study blocks):**
When creating flashcards, ALWAYS use the synapse-flashcards code fence format:

```synapse-flashcards
{
  "title": "Topic Name",
  "cards": [
    { "front": "Question text here?", "back": "Answer text here." },
    { "front": "Another question?", "back": "Another answer." }
  ]
}
```

This will render as interactive, flippable flashcard cards that users can:
- Flip to reveal answers
- Navigate through with arrows
- Save to their flashcard decks
- Study in the dedicated Flashcards module

IMPORTANT: Always use the ```synapse-flashcards code fence, never raw JSON.
"""

# Socratic questioning patterns
SOCRATIC_QUESTION_PATTERNS = {
    "clarification": [
        "What do you mean by...?",
        "Can you give me an example?",
        "Could you explain that differently?",
    ],
    "assumptions": [
        "What are you assuming here?",
        "How could we verify that assumption?",
        "What if we assumed the opposite?",
    ],
    "evidence": [
        "What evidence supports that?",
        "How do we know this is true?",
        "What would disprove this?",
    ],
    "perspectives": [
        "What would someone else say?",
        "How does this look from another angle?",
        "What are the alternatives?",
    ],
    "implications": [
        "What follows from this?",
        "What are the consequences?",
        "How does this connect to...?",
    ],
}

# Teaching strategies by student level
LEVEL_BASED_STRATEGIES = {
    "beginner": """
**Beginner Level Strategy:**
- Use simple, concrete examples
- Break concepts into smallest possible steps
- Provide more scaffolding and hints
- Check understanding frequently
- Celebrate every small win
- Use familiar analogies
""",
    "intermediate": """
**Intermediate Level Strategy:**
- Challenge with "why" and "how" questions
- Introduce edge cases and exceptions
- Connect concepts across topics
- Encourage independent problem-solving
- Provide less scaffolding
- Use more abstract thinking
""",
    "advanced": """
**Advanced Level Strategy:**
- Ask deep, analytical questions
- Explore implications and applications
- Challenge with novel scenarios
- Encourage critical thinking
- Focus on synthesis and creation
- Minimal guidance, maximum discovery
""",
}

# Response templates for common scenarios
RESPONSE_TEMPLATES = {
    "encouraging_mistake": [
        "That's an interesting approach! Let's think about what happens when...",
        "I can see why you'd think that. What if we consider...",
        "Close! You're on the right track. Think about...",
    ],
    "celebrating_insight": [
        "Excellent! You've discovered that...",
        "That's exactly right! Notice how...",
        "Perfect! Now you understand that...",
    ],
    "redirecting": [
        "Let's focus on... for now. We can come back to...",
        "That's an interesting question. Before we go there, let's make sure we understand...",
        "Good thinking! Let's first build the foundation with...",
    ],
}


def get_tutor_prompt_with_context(
    user_context: Dict, topic: Optional[str] = None, student_level: str = "intermediate"
) -> str:
    """
    Build tutor prompt with user-specific context

    Args:
        user_context: Learning context from SYNAPSE
        topic: Current topic being studied
        student_level: beginner/intermediate/advanced

    Returns:
        Complete personalized prompt
    """
    weak_areas = user_context.get("analytics", {}).get("weak_topics", [])
    mastery_scores = user_context.get("mastery_scores", {})
    recent_activity = user_context.get("recent_activity", [])

    prompt = TUTOR_BASE_PROMPT + "\n\n"

    # Add level-specific strategy
    prompt += LEVEL_BASED_STRATEGIES.get(student_level, LEVEL_BASED_STRATEGIES["intermediate"])
    prompt += "\n\n"

    # Add weak areas focus
    if weak_areas:
        prompt += "**Student's Current Weak Areas:**\n"
        for area in weak_areas[:3]:
            topic_name = area.get("topic", "Unknown")
            accuracy = area.get("accuracy", 0)
            prompt += f"- {topic_name}: {accuracy:.1%} accuracy (needs attention)\n"
        prompt += "\n**Priority**: Gently guide toward these topics when relevant.\n\n"

    # Add mastery context
    if mastery_scores:
        prompt += "**Mastery Levels:**\n"
        for topic_name, score in list(mastery_scores.items())[:3]:
            level = "Beginner" if score < 0.3 else "Intermediate" if score < 0.7 else "Advanced"
            prompt += f"- {topic_name}: {level} ({score:.1%})\n"
        prompt += "\n"

    # Add current topic focus
    if topic:
        prompt += f"**Current Focus Topic:** {topic}\n"
        prompt += "Tailor your teaching to this specific area.\n\n"

    # Add recent activity context
    if recent_activity:
        prompt += "**Recent Study Activity:**\n"
        for activity in recent_activity[:3]:
            prompt += f"- {activity.get('description', 'Study session')}\n"
        prompt += "Build on recent work when appropriate.\n\n"

    return prompt


def get_socratic_question(category: str, context: Optional[str] = None) -> str:
    """
    Get a Socratic question pattern

    Args:
        category: Type of question (clarification, assumptions, etc.)
        context: Optional context to incorporate

    Returns:
        Question prompt
    """
    patterns = SOCRATIC_QUESTION_PATTERNS.get(category, SOCRATIC_QUESTION_PATTERNS["clarification"])

    # Return first pattern (could randomize in production)
    base_question = patterns[0]

    if context:
        return f"{base_question} ({context})"

    return base_question


def get_response_template(scenario: str) -> str:
    """
    Get response template for common teaching scenarios

    Args:
        scenario: Scenario type

    Returns:
        Response template
    """
    templates = RESPONSE_TEMPLATES.get(scenario, [""])
    return templates[0] if templates else ""


def build_explanation_prompt(
    concept: str, student_level: str = "intermediate", use_analogy: bool = True
) -> str:
    """
    Build prompt for explaining a concept

    Args:
        concept: Concept to explain
        student_level: Student's level
        use_analogy: Whether to use analogies

    Returns:
        Explanation prompt
    """
    prompt = f"Explain {concept} "

    if student_level == "beginner":
        prompt += "in simple terms, as if teaching a complete beginner"
    elif student_level == "advanced":
        prompt += "with depth and nuance, for an advanced learner"
    else:
        prompt += "clearly and thoroughly"

    if use_analogy:
        prompt += ". Use a helpful analogy to make it concrete"

    prompt += "."

    return prompt


# Prompt fragments for specific scenarios
PROMPT_FRAGMENTS = {
    "start_assessment": """
Before we begin, I'd like to understand what you already know about this topic.
""",
    "offer_flashcards": """
I notice this is an important concept. Would you like me to create flashcards to help you remember it?
""",
    "check_understanding": """
Let me check your understanding: [ask specific question]
""",
    "provide_hint": """
Here's a hint that might help: [provide minimal hint]
""",
    "connect_concepts": """
Notice how this connects to [related concept] that we discussed earlier.
""",
    "encourage_struggle": """
I can see you're thinking hard about this - that's exactly how learning happens! Let's break it down.
""",
}
