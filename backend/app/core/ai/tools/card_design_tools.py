"""
Card Design Tools

A single tool used exclusively by the AI Card Designer session.
`propose_card_plan` is a "signal tool" — the model calls it to hand
the structured plan JSON to the frontend right-panel renderer.

It performs no database work. The `execute()` method simply echoes the
validated plan back so the base_agent ReAct loop records a tool_result
event in the SSE stream, which the Vercel AI SDK surfaces as a
`tool-invocation` part in the message — exactly what
`useCardDesignChat.extractPlanFromMessages` (Pass 1) is listening for.
"""

from typing import Any, Dict

from .base import BaseTool, ToolExecutionError


class ProposeCardPlanTool(BaseTool):
    """
    Signal tool: propose a structured flashcard design plan.

    Call this when you have gathered sufficient context from the user
    (typically after 2-5 exchanges) to present a learning plan. The
    frontend will render the plan in the right-hand proposal panel.

    Do NOT call this tool more than once per plan version. If the user
    asks for changes, call it again with the updated plan — the latest
    invocation always wins.
    """

    @property
    def name(self) -> str:
        return "propose_card_plan"

    @property
    def description(self) -> str:
        return (
            "Propose a structured flashcard design plan to the user. "
            "Call this once you have gathered enough context about what "
            "the user wants to learn, their current level, and their available "
            "study time. The plan will be displayed in the design panel. "
            "If the user requests changes, call this tool again with the updated plan."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "deck_name": {
                    "type": "string",
                    "description": "Name for the deck to create or add cards to.",
                },
                "deck_id": {
                    "type": ["integer", "null"],
                    "description": "Existing deck ID to add to, or null to create a new deck.",
                },
                "subtopics": {
                    "type": "array",
                    "description": "List of subtopics that make up the plan.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "topic": {
                                "type": "string",
                                "description": "Subtopic name.",
                            },
                            "count": {
                                "type": "integer",
                                "description": "Number of cards for this subtopic.",
                            },
                            "style": {
                                "type": "string",
                                "enum": ["basic", "cloze", "socratic", "scenario"],
                                "description": "Card style best suited for this subtopic.",
                            },
                            "difficulty_note": {
                                "type": "string",
                                "description": "Brief rationale for the chosen style and count.",
                            },
                        },
                        "required": ["topic", "count", "style", "difficulty_note"],
                    },
                },
                "total_cards": {
                    "type": "integer",
                    "description": "Total number of cards across all subtopics.",
                },
                "learning_objective": {
                    "type": "string",
                    "enum": ["exam_recall", "conversational", "conceptual", "procedural"],
                    "description": "Primary learning goal driving the plan design.",
                },
                "source_material": {
                    "type": ["string", "null"],
                    "description": "Source material provided by the user, or null.",
                },
                "rationale": {
                    "type": "string",
                    "description": (
                        "A concise paragraph explaining your design decisions: "
                        "why these subtopics, why these styles, why this card count."
                    ),
                },
            },
            "required": [
                "deck_name",
                "deck_id",
                "subtopics",
                "total_cards",
                "learning_objective",
                "source_material",
                "rationale",
            ],
        }

    async def validate_input(self, **kwargs: Any) -> bool:
        """
        Override base validation to handle JSON Schema union types.

        The base BaseTool.validate_input() uses a simple Python-type dict and
        does NOT understand union schemas like ``["integer", "null"]``. When
        the model passes deck_id=null (Python None), NoneType is not in the
        type_map and the call fails with ToolValidationError on every attempt,
        causing the ReAct loop to spin up to max_iterations.

        This override:
          - Accepts None for any field whose schema type includes "null"
          - Skips deep type-checking for union-typed fields (trusts the model)
          - Still enforces required-field presence
        """
        props = self.parameters.get("properties", {})
        required = self.parameters.get("required", [])

        # Enforce required fields are present
        for field in required:
            if field not in kwargs:
                from app.core.ai.tools.base import ToolValidationError
                raise ToolValidationError(f"Missing required parameter: {field}")

        # Type-check with union-type awareness
        for field, value in kwargs.items():
            if field not in props:
                continue
            expected = props[field].get("type")
            if expected is None:
                continue  # no type constraint declared

            if isinstance(expected, list):
                # Union type (e.g. ["integer", "null"]): accept None if "null" in list
                if value is None and "null" in expected:
                    continue
                if value is not None:
                    continue  # non-None union values: trust the model
                from app.core.ai.tools.base import ToolValidationError
                raise ToolValidationError(
                    f"Null not allowed for {field}: expected one of {expected}"
                )

            # Scalar type: gracefully allow None (model sent null for optional field)
            if value is None:
                continue

        return True

    async def execute(self, user_id: int, **kwargs: Any) -> Dict[str, Any]:
        """
        Echo the plan back as a success result.

        The base_agent will stream a `tool_result` event containing this
        data. The frontend hook detects `tool-invocation` parts in the
        Vercel AI SDK message and populates the right panel.
        """
        try:
            return {
                "success": True,
                "data": kwargs,  # The full plan — echoed back verbatim
                "message": "Plan proposed. Awaiting user confirmation.",
            }
        except Exception as exc:
            raise ToolExecutionError(f"propose_card_plan failed: {exc}") from exc
