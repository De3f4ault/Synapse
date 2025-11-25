"""
Event System Module

Event-driven architecture for SYNAPSE.
Supports webhooks, internal handlers, and pub/sub patterns.
"""

from .dispatcher import EventDispatcher
from .triggers import Event, EventType
from .handlers import register_all_handlers

__all__ = [
    "EventDispatcher",
    "Event",
    "EventType",
    "register_all_handlers",
]
