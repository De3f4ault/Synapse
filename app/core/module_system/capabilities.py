"""
Module capability definitions.
Defines what operations each module supports.
"""
from enum import Enum


class ModuleCapability(str, Enum):
    """
    Capabilities that a learning module can support.
    """

    # CRUD operations
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"

    # Search and discovery
    SEARCH = "search"

    # Study operations
    STUDY = "study"

    # AI operations
    AI_GENERATE = "ai_generate"

    # Analytics
    ANALYTICS = "analytics"

    # Import/Export
    EXPORT = "export"
    IMPORT = "import"

    # Collaboration
    SHARE = "share"
    COLLABORATE = "collaborate"

    # Version control
    VERSION = "version"
