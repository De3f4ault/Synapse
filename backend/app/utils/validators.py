"""
Validation utilities for common data types.

Provides validation functions for:
- Email addresses
- Passwords
- File uploads
- Text content
"""

import re
from pathlib import Path
from typing import List, Optional, Tuple


def validate_email(email: str) -> Tuple[bool, Optional[str]]:
    """
    Validate email address format.

    Args:
        email: Email address to validate

    Returns:
        Tuple of (is_valid, error_message)

    Usage:
        is_valid, error = validate_email("user@example.com")
        if not is_valid:
            raise ValueError(error)
    """
    if not email:
        return False, "Email is required"

    if len(email) > 255:
        return False, "Email is too long (max 255 characters)"

    # RFC 5322 simplified regex
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

    if not re.match(pattern, email):
        return False, "Invalid email format"

    return True, None


def validate_password(password: str, min_length: int = 8) -> Tuple[bool, Optional[str]]:
    """
    Validate password strength.

    Requirements:
    - Minimum length (default: 8)
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit

    Args:
        password: Password to validate
        min_length: Minimum password length (default: 8)

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not password:
        return False, "Password is required"

    if len(password) < min_length:
        return False, f"Password must be at least {min_length} characters"

    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"

    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"

    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"

    return True, None


def validate_file_type(
    filename: str,
    allowed_extensions: List[str],
) -> Tuple[bool, Optional[str]]:
    """
    Validate file type by extension.

    Args:
        filename: Name of file
        allowed_extensions: List of allowed extensions (e.g., ['.pdf', '.docx'])

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not filename:
        return False, "Filename is required"

    file_ext = Path(filename).suffix.lower()

    if not file_ext:
        return False, "File must have an extension"

    if file_ext not in allowed_extensions:
        return False, f"File type {file_ext} not allowed. Allowed: {', '.join(allowed_extensions)}"

    return True, None


def validate_file_size(
    file_size: int,
    max_size: int,
) -> Tuple[bool, Optional[str]]:
    """
    Validate file size.

    Args:
        file_size: Size of file in bytes
        max_size: Maximum allowed size in bytes

    Returns:
        Tuple of (is_valid, error_message)
    """
    if file_size <= 0:
        return False, "File is empty"

    if file_size > max_size:
        max_mb = max_size / (1024 * 1024)
        actual_mb = file_size / (1024 * 1024)
        return False, f"File too large ({actual_mb:.1f}MB). Maximum: {max_mb:.1f}MB"

    return True, None


def sanitize_html(text: str) -> str:
    """
    Basic HTML sanitization (removes script tags).

    Note: For production use, consider a library like bleach.

    Args:
        text: Text that may contain HTML

    Returns:
        Sanitized text
    """
    if not text:
        return text

    # Remove script tags
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)

    # Remove event handlers
    text = re.sub(r'\s*on\w+\s*=\s*["\'][^"\']*["\']', '', text, flags=re.IGNORECASE)

    return text


def validate_text_length(
    text: str,
    min_length: int = 0,
    max_length: int = 10000,
    field_name: str = "Text",
) -> Tuple[bool, Optional[str]]:
    """
    Validate text length.

    Args:
        text: Text to validate
        min_length: Minimum length (default: 0)
        max_length: Maximum length (default: 10000)
        field_name: Name of field for error messages

    Returns:
        Tuple of (is_valid, error_message)
    """
    if text is None:
        return False, f"{field_name} is required"

    text_length = len(text)

    if text_length < min_length:
        return False, f"{field_name} must be at least {min_length} characters"

    if text_length > max_length:
        return False, f"{field_name} must be at most {max_length} characters"

    return True, None
