"""
Agent Implementations

All concrete agent implementations for SYNAPSE.
"""

from app.core.ai.agents.implementations.tutor_agent import TutorAgent, create_tutor_agent_config
from app.core.ai.agents.implementations.document_agent import (
    DocumentAgent,
    create_document_agent_config,
)
from app.core.ai.agents.implementations.quiz_agent import QuizAgent, create_quiz_agent_config
from app.core.ai.agents.implementations.general_assistant_agent import (
    GeneralAssistantAgent,
    create_general_assistant_config,
)
from app.core.ai.agents.implementations.dashboard_agent import (
    DashboardAgent,
    create_dashboard_agent_config,
)

__all__ = [
    # Agent classes
    "TutorAgent",
    "DocumentAgent",
    "QuizAgent",
    "GeneralAssistantAgent",
    "DashboardAgent",
    # Factory functions
    "create_tutor_agent_config",
    "create_document_agent_config",
    "create_quiz_agent_config",
    "create_general_assistant_config",
    "create_dashboard_agent_config",
]
