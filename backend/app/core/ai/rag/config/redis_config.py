"""Redis configuration for SYNAPSE RAG caching."""

from pydantic_settings import BaseSettings
from typing import Optional


class RedisConfig(BaseSettings):
    """Redis configuration for RAG caching system"""
    
    # Connection
    host: str = "localhost"
    port: int = 6379
    db: int = 0
    password: Optional[str] = None
    
    # Connection Pool
    max_connections: int = 50
    socket_timeout: int = 5
    socket_connect_timeout: int = 5
    
    # Cache TTLs (in seconds)
    embedding_ttl: int = 86400  # 24 hours
    query_cache_ttl: int = 3600  # 1 hour
    retrieval_cache_ttl: int = 1800  # 30 minutes
    
    # Key Prefixes
    embedding_prefix: str = "synapse:rag:emb:"
    query_prefix: str = "synapse:rag:query:"
    retrieval_prefix: str = "synapse:rag:retrieval:"
    
    # Performance
    decode_responses: bool = False  # We'll handle pickling manually
    
    class Config:
        env_prefix = "SYNAPSE_REDIS_"


def get_redis_url(config: RedisConfig) -> str:
    """Generate Redis connection URL"""
    if config.password:
        return f"redis://:{config.password}@{config.host}:{config.port}/{config.db}"
    return f"redis://{config.host}:{config.port}/{config.db}"
