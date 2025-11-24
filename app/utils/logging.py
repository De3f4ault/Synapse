"""
Structured logging setup using structlog.

This module configures structured logging for the entire application,
providing JSON-formatted logs with context.
"""

import logging
import sys
from typing import Any, Dict

import structlog
from structlog.typing import EventDict, Processor


def add_app_context(
    logger: logging.Logger,
    method_name: str,
    event_dict: EventDict,
) -> EventDict:
    """
    Add application context to log entries.

    Args:
        logger: Logger instance
        method_name: Method name
        event_dict: Event dictionary

    Returns:
        Modified event dictionary
    """
    event_dict["app"] = "synapse"
    return event_dict


def configure_logging(log_level: str = "INFO", json_logs: bool = True) -> None:
    """
    Configure structured logging for the application.

    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        json_logs: Use JSON renderer for production (default: True)
    """
    # Define processors
    processors: list[Processor] = [
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        add_app_context,
    ]

    # Add renderer based on environment
    if json_logs:
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer())

    # Configure structlog
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Configure standard logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, log_level.upper()),
    )


def get_logger(name: str = None) -> structlog.stdlib.BoundLogger:
    """
    Get a structured logger instance.

    Args:
        name: Logger name (usually __name__)

    Returns:
        Configured structlog logger

    Usage:
        logger = get_logger(__name__)
        logger.info("user_created", user_id=123, email="user@example.com")
    """
    return structlog.get_logger(name)


# Initialize logging on module import
# This will be called once when the module is first imported
try:
    from app.core.config import settings

    configure_logging(
        log_level=settings.LOG_LEVEL,
        json_logs=settings.ENVIRONMENT == "production",
    )
except ImportError:
    # Fallback if settings not available
    configure_logging(log_level="INFO", json_logs=False)
