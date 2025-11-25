"""
Date and time utility functions.

Provides helpers for:
- Timezone conversions
- Date formatting
- Time calculations
- Timestamp parsing
"""

from datetime import datetime, timedelta, timezone
from typing import Optional


def utc_now() -> datetime:
    """
    Get current UTC time with timezone info.

    Returns:
        Current UTC datetime with timezone
    """
    return datetime.now(timezone.utc)


def to_utc(dt: datetime) -> datetime:
    """
    Convert datetime to UTC.

    Args:
        dt: Datetime to convert

    Returns:
        Datetime in UTC timezone
    """
    if dt.tzinfo is None:
        # Assume naive datetime is UTC
        return dt.replace(tzinfo=timezone.utc)

    return dt.astimezone(timezone.utc)


def from_timestamp(timestamp: float) -> datetime:
    """
    Convert Unix timestamp to UTC datetime.

    Args:
        timestamp: Unix timestamp (seconds since epoch)

    Returns:
        UTC datetime
    """
    return datetime.fromtimestamp(timestamp, tz=timezone.utc)


def to_timestamp(dt: datetime) -> float:
    """
    Convert datetime to Unix timestamp.

    Args:
        dt: Datetime to convert

    Returns:
        Unix timestamp (seconds since epoch)
    """
    return dt.timestamp()


def format_iso(dt: datetime) -> str:
    """
    Format datetime as ISO 8601 string.

    Args:
        dt: Datetime to format

    Returns:
        ISO 8601 formatted string
    """
    return dt.isoformat()


def parse_iso(date_string: str) -> datetime:
    """
    Parse ISO 8601 date string.

    Args:
        date_string: ISO 8601 formatted string

    Returns:
        Parsed datetime
    """
    return datetime.fromisoformat(date_string)


def days_ago(days: int) -> datetime:
    """
    Get datetime N days ago from now.

    Args:
        days: Number of days

    Returns:
        UTC datetime N days ago
    """
    return utc_now() - timedelta(days=days)


def days_from_now(days: int) -> datetime:
    """
    Get datetime N days from now.

    Args:
        days: Number of days

    Returns:
        UTC datetime N days from now
    """
    return utc_now() + timedelta(days=days)


def is_expired(dt: datetime, ttl_seconds: int) -> bool:
    """
    Check if datetime has expired based on TTL.

    Args:
        dt: Datetime to check
        ttl_seconds: Time to live in seconds

    Returns:
        True if expired, False otherwise
    """
    expiry = dt + timedelta(seconds=ttl_seconds)
    return utc_now() > expiry


def time_until(dt: datetime) -> timedelta:
    """
    Calculate time until a future datetime.

    Args:
        dt: Future datetime

    Returns:
        Timedelta until datetime (negative if in past)
    """
    return dt - utc_now()


def time_since(dt: datetime) -> timedelta:
    """
    Calculate time since a past datetime.

    Args:
        dt: Past datetime

    Returns:
        Timedelta since datetime (negative if in future)
    """
    return utc_now() - dt


def human_readable_duration(seconds: float) -> str:
    """
    Convert seconds to human-readable duration.

    Args:
        seconds: Number of seconds

    Returns:
        Human-readable string (e.g., "2h 30m", "45s")
    """
    if seconds < 60:
        return f"{int(seconds)}s"

    if seconds < 3600:
        minutes = int(seconds / 60)
        secs = int(seconds % 60)
        return f"{minutes}m {secs}s" if secs > 0 else f"{minutes}m"

    if seconds < 86400:
        hours = int(seconds / 3600)
        minutes = int((seconds % 3600) / 60)
        return f"{hours}h {minutes}m" if minutes > 0 else f"{hours}h"

    days = int(seconds / 86400)
    hours = int((seconds % 86400) / 3600)
    return f"{days}d {hours}h" if hours > 0 else f"{days}d"


def format_date(dt: datetime, format_string: str = "%Y-%m-%d") -> str:
    """
    Format datetime with custom format string.

    Args:
        dt: Datetime to format
        format_string: strftime format string (default: "%Y-%m-%d")

    Returns:
        Formatted date string
    """
    return dt.strftime(format_string)


def start_of_day(dt: Optional[datetime] = None) -> datetime:
    """
    Get start of day (midnight) for given datetime.

    Args:
        dt: Datetime (default: now)

    Returns:
        Datetime at start of day (00:00:00)
    """
    if dt is None:
        dt = utc_now()

    return dt.replace(hour=0, minute=0, second=0, microsecond=0)


def end_of_day(dt: Optional[datetime] = None) -> datetime:
    """
    Get end of day (23:59:59) for given datetime.

    Args:
        dt: Datetime (default: now)

    Returns:
        Datetime at end of day (23:59:59.999999)
    """
    if dt is None:
        dt = utc_now()

    return dt.replace(hour=23, minute=59, second=59, microsecond=999999)
