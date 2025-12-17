# Redis Setup for SYNAPSE RAG

## Quick Start

### 1. Install Redis

**Ubuntu/Debian**:

```bash
sudo apt update
sudo apt install redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

**Arch Linux** (your system):

```bash
sudo pacman -S redis
sudo systemctl enable redis
sudo systemctl start redis
```

**macOS**:

```bash
brew install redis
brew services start redis
```

**Verify Installation**:

```bash
redis-cli ping
# Should return: PONG
```

---

## 2. Configure Redis for RAG

### Production Settings

Edit `/etc/redis/redis.conf`:

```conf
# Memory
maxmemory 2gb
maxmemory-policy allkeys-lru  # Evict least recently used keys

# Persistence (optional, for cache durability)
save 900 1      # Save if 1 key changed in 15 min
save 300 10     # Save if 10 keys changed in 5 min
save 60 10000   # Save if 10k keys changed in 1 min

# Performance
tcp-backlog 511
timeout 0
tcp-keepalive 300

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
```

**Restart after changes**:

```bash
sudo systemctl restart redis
```

---

## 3. Python Client Setup

### Install Dependencies

```bash
pip install redis==5.0.1
```

### Test Connection

```python
import redis

# Connect
r = redis.Redis(host='localhost', port=6379, db=0)

# Test
print(r.ping())  # Should print: True

# Set/Get test
r.set('test_key', 'hello')
print(r.get('test_key'))  # Should print: b'hello'

# Clean up
r.delete('test_key')
```

---

## 4. RAG Cache Configuration

### Environment Variables

Create `.env` file:

```bash
# Redis Connection
SYNAPSE_REDIS_HOST=localhost
SYNAPSE_REDIS_PORT=6379
SYNAPSE_REDIS_DB=0
SYNAPSE_REDIS_PASSWORD=  # Leave empty for local dev

# Cache TTLs (seconds)
SYNAPSE_REDIS_EMBEDDING_TTL=86400    # 24 hours
SYNAPSE_REDIS_QUERY_CACHE_TTL=3600   # 1 hour
SYNAPSE_REDIS_RETRIEVAL_CACHE_TTL=1800  # 30 minutes
```

---

## 5. Monitoring Redis

### CLI Monitoring

```bash
# Monitor all commands in real-time
redis-cli monitor

# Get cache statistics
redis-cli INFO stats

# Count keys by pattern
redis-cli KEYS "synapse:rag:emb:*" | wc -l
redis-cli KEYS "synapse:rag:query:*" | wc -l

# Check memory usage
redis-cli INFO memory
```

### Python Monitoring

```python
from app.core.ai.rag.caching.redis_manager import get_cache_manager

cache_manager = get_cache_manager()

# Get stats
stats = cache_manager.get_stats()
print(f"Total keys: {stats['total_keys']}")
print(f"Embedding keys: {stats['embedding_keys']}")
print(f"Hit rate: {stats['hit_rate']:.2%}")

# Health check
print(f"Redis healthy: {cache_manager.health_check()}")
```

---

## 6. Cache Management

### Clear Caches

```python
from app.core.ai.rag.caching.redis_manager import get_cache_manager

cache_manager = get_cache_manager()

# Clear specific user's cache
cache_manager.invalidate_user_cache(user_id=123)

# Clear all RAG caches (use with caution!)
cache_manager.clear_all_caches()
```

### CLI Cache Management

```bash
# Clear all embedding caches
redis-cli KEYS "synapse:rag:emb:*" | xargs redis-cli DEL

# Clear specific user's query cache
redis-cli KEYS "synapse:rag:query:*:123" | xargs redis-cli DEL

# Flush entire database (DANGER!)
redis-cli FLUSHDB
```

---

## 7. Performance Tuning

### Optimal Settings for RAG

```conf
# /etc/redis/redis.conf

# Memory - allocate 25-50% of system RAM
maxmemory 2gb

# Eviction - LRU is best for cache workloads
maxmemory-policy allkeys-lru

# Disable persistence for pure cache (faster)
save ""
appendonly no

# Or enable AOF for durability (slower but safer)
appendonly yes
appendfsync everysec
```

### Connection Pooling

Already configured in `redis_manager.py`:

```python
pool = redis.ConnectionPool(
    host=config.host,
    port=config.port,
    max_connections=50,  # Tune based on concurrency
    socket_timeout=5
)
```

---

## 8. Troubleshooting

### Issue: Connection Refused

```bash
# Check if Redis is running
sudo systemctl status redis

# Check port
sudo netstat -tulpn | grep 6379

# Check logs
sudo tail -f /var/log/redis/redis-server.log
```

### Issue: Memory Full

```bash
# Check memory usage
redis-cli INFO memory

# Clear old keys
redis-cli --scan --pattern "synapse:rag:*" | xargs redis-cli DEL

# Or increase maxmemory in redis.conf
```

### Issue: Slow Performance

```bash
# Check slow queries
redis-cli SLOWLOG GET 10

# Monitor latency
redis-cli --latency

# Reduce TTLs to decrease memory pressure
```

---

## 9. Security (Production)

### Enable Password Authentication

```conf
# /etc/redis/redis.conf
requirepass your_strong_password_here
```

### Bind to Localhost Only

```conf
bind 127.0.0.1 ::1
```

### Disable Dangerous Commands

```conf
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""
```

---

## 10. Docker Setup (Optional)

```bash
# Run Redis in Docker
docker run -d \
  --name synapse-redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:7-alpine \
  redis-server --appendonly yes --maxmemory 2gb --maxmemory-policy allkeys-lru

# Test connection
docker exec -it synapse-redis redis-cli ping
```

---

## Quick Reference

### Common Commands

```bash
# Start/Stop
sudo systemctl start redis
sudo systemctl stop redis
sudo systemctl restart redis

# Status
redis-cli INFO server
redis-cli INFO stats
redis-cli INFO memory

# Keys
redis-cli KEYS "*"
redis-cli SCAN 0 MATCH "synapse:*"
redis-cli DBSIZE

# Performance
redis-cli --latency
redis-cli --bigkeys
```

### Python Quick Start

```python
from app.core.ai.rag.caching.redis_manager import get_cache_manager

cache = get_cache_manager()

# Cache embedding
cache.set_embedding("some text", embedding_array)
cached_emb = cache.get_embedding("some text")

# Cache query result
cache.set_query_result("query", user_id=123, result=data)
cached_result = cache.get_query_result("query", user_id=123)

# Get stats
print(cache.get_stats())
```

---

**Status**: ✅ Ready for Integration  
**Next**: Update `embeddings/manager.py` to use Redis cache
