"""
Encryption service for webhook secrets using Fernet.

Provides symmetric authenticated encryption for sensitive data storage.
Fernet guarantees:
- Confidentiality (encrypted data cannot be read)
- Integrity (encrypted data cannot be tampered with)
- Authentication (encrypted data is verifiably from the encryptor)
"""

import secrets
import os
from typing import Optional
from cryptography.fernet import Fernet, MultiFernet, InvalidToken
import structlog

logger = structlog.get_logger(__name__)


class EncryptionService:
    """
    Manages encryption/decryption of sensitive data using Fernet.
    
    Supports key rotation via MultiFernet for gradual key migration.
    """
    
    def __init__(self, primary_key: bytes, rotation_keys: Optional[list[bytes]] = None):
        """
        Initialize encryption service.
        
        Args:
            primary_key: Primary encryption key (used for new encryptions)
            rotation_keys: Optional list of old keys for decrypting legacy data
        """
        self.primary_fernet = Fernet(primary_key)
        
        # Support key rotation with MultiFernet
        if rotation_keys:
            all_fernets = [self.primary_fernet] + [Fernet(key) for key in rotation_keys]
            self.multi_fernet = MultiFernet(all_fernets)
            logger.info("encryption_service_initialized", rotation_keys_count=len(rotation_keys))
        else:
            self.multi_fernet = None
            logger.info("encryption_service_initialized", rotation_keys_count=0)
    
    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt plaintext string.
        
        Args:
            plaintext: String to encrypt
            
        Returns:
            URL-safe base64-encoded encrypted token
        """
        plaintext_bytes = plaintext.encode('utf-8')
        encrypted_bytes = self.primary_fernet.encrypt(plaintext_bytes)
        return encrypted_bytes.decode('utf-8')
    
    def decrypt(self, encrypted_token: str) -> str:
        """
        Decrypt encrypted token.
        
        Attempts decryption with rotation keys if primary key fails.
        
        Args:
            encrypted_token: URL-safe base64-encoded encrypted token
            
        Returns:
            Decrypted plaintext string
            
        Raises:
            InvalidToken: If decryption fails with all available keys
        """
        encrypted_bytes = encrypted_token.encode('utf-8')
        
        try:
            # Try with rotation keys first (if available)
            if self.multi_fernet:
                decrypted_bytes = self.multi_fernet.decrypt(encrypted_bytes)
            else:
                decrypted_bytes = self.primary_fernet.decrypt(encrypted_bytes)
            
            return decrypted_bytes.decode('utf-8')
        
        except InvalidToken:
            logger.error("decryption_failed", error="Invalid token or wrong key")
            raise


# Global encryption service instance
_encryption_service: Optional[EncryptionService] = None


def get_encryption_service() -> EncryptionService:
    """
    Get or create the global encryption service instance.
    
    Loads encryption key from WEBHOOK_ENCRYPTION_KEY environment variable.
    Supports rotation keys from WEBHOOK_ENCRYPTION_ROTATION_KEYS (comma-separated).
    
    Returns:
        Initialized EncryptionService
        
    Raises:
        ValueError: If WEBHOOK_ENCRYPTION_KEY is not set
    """
    global _encryption_service
    
    if _encryption_service is None:
        # Load primary key from environment
        primary_key_str = os.environ.get("WEBHOOK_ENCRYPTION_KEY")
        
        if not primary_key_str:
            raise ValueError(
                "WEBHOOK_ENCRYPTION_KEY environment variable is required. "
                "Generate one with: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
            )
        
        primary_key = primary_key_str.encode('utf-8')
        
        # Load optional rotation keys
        rotation_keys_str = os.environ.get("WEBHOOK_ENCRYPTION_ROTATION_KEYS", "")
        rotation_keys = None
        
        if rotation_keys_str:
            rotation_keys = [key.strip().encode('utf-8') for key in rotation_keys_str.split(',')]
            logger.info("loaded_rotation_keys", count=len(rotation_keys))
        
        _encryption_service = EncryptionService(primary_key, rotation_keys)
    
    return _encryption_service


def encrypt_webhook_secret(secret: str) -> str:
    """
    Encrypt a webhook secret for storage.
    
    Args:
        secret: Plaintext webhook secret
        
    Returns:
        Encrypted token suitable for database storage
    """
    service = get_encryption_service()
    return service.encrypt(secret)


def decrypt_webhook_secret(encrypted_token: str) -> str:
    """
    Decrypt a webhook secret from storage.
    
    Args:
        encrypted_token: Encrypted token from database
        
    Returns:
        Decrypted plaintext secret
        
    Raises:
        InvalidToken: If decryption fails
    """
    service = get_encryption_service()
    return service.decrypt(encrypted_token)


def generate_webhook_secret() -> str:
    """
    Generate a cryptographically secure random webhook secret.
    
    Uses Python's secrets module for secure random generation.
    Suitable for HMAC signature verification.
    
    Returns:
        URL-safe 256-bit random token (43 characters)
    """
    return secrets.token_urlsafe(32)  # 32 bytes = 256 bits


def generate_encryption_key() -> str:
    """
    Generate a new Fernet encryption key.
    
    Use this during initial setup or key rotation.
    Store the result in WEBHOOK_ENCRYPTION_KEY environment variable.
    
    Returns:
        Base64-encoded Fernet key
    """
    return Fernet.generate_key().decode('utf-8')
