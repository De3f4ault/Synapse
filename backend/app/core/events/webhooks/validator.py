"""
HMAC Signature Validator

Validates HMAC signatures on incoming webhook requests.
"""

import hmac
import hashlib
import structlog

logger = structlog.get_logger(__name__)


def validate_signature(
    payload: bytes,
    signature: str,
    secret: str
) -> bool:
    """
    Validate HMAC-SHA256 signature for webhook payload

    Args:
        payload: Raw payload bytes received
        signature: Signature from X-Webhook-Signature header
        secret: Secret key for HMAC validation

    Returns:
        True if signature is valid, False otherwise
    """
    # Remove 'sha256=' prefix if present
    if signature.startswith('sha256='):
        signature = signature[7:]

    # Calculate expected signature
    expected = calculate_expected_signature(payload, secret)

    # Use constant-time comparison to prevent timing attacks
    is_valid = hmac.compare_digest(expected, signature)

    if is_valid:
        logger.debug("webhook_signature_valid")
    else:
        logger.warning(
            "webhook_signature_invalid",
            expected_prefix=expected[:10],
            received_prefix=signature[:10]
        )

    return is_valid


def calculate_expected_signature(payload: bytes, secret: str) -> str:
    """
    Calculate expected HMAC signature

    Args:
        payload: Payload bytes
        secret: Secret key

    Returns:
        Hex-encoded signature
    """
    secret_bytes = secret.encode('utf-8')

    signature = hmac.new(
        secret_bytes,
        payload,
        hashlib.sha256
    ).hexdigest()

    return signature


def extract_signature_from_header(header_value: str) -> str:
    """
    Extract signature from X-Webhook-Signature header

    Args:
        header_value: Value of X-Webhook-Signature header

    Returns:
        Signature string (without algorithm prefix)
    """
    # Handle both formats:
    # 1. "sha256=abc123..." (with algorithm prefix)
    # 2. "abc123..." (without prefix)

    if header_value.startswith('sha256='):
        return header_value[7:]

    return header_value


def validate_webhook_request(
    payload: bytes,
    signature_header: str,
    secret: str
) -> bool:
    """
    Validate a complete webhook request

    Convenience function that handles header extraction.

    Args:
        payload: Raw request body
        signature_header: Value of X-Webhook-Signature header
        secret: Webhook secret

    Returns:
        True if request is valid
    """
    if not signature_header:
        logger.warning("webhook_missing_signature_header")
        return False

    if not secret:
        logger.error("webhook_secret_not_configured")
        return False

    signature = extract_signature_from_header(signature_header)

    return validate_signature(payload, signature, secret)
