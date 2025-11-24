"""
Email service for sending notifications and reports.

Provides email sending capabilities with template support
for verification, notifications, and reports.
"""

from .sender import EmailSender

__all__ = ["EmailSender"]
