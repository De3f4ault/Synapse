# Celery Worker Deployment Guide

## Quick Start

### 1. Start Redis (with persistence)

```bash
# Option A: Use configuration file (recommended for production)
redis-server config/redis-optimized.conf

# Option B: Quick start with persistence flags
redis-server --appendonly yes --appendfsync everysec --maxmemory 2gb

# Option C: Default Redis (development only)
redis-server
```

### 2. Start Celery Worker

```bash
# Navigate to backend directory
cd backend

# Start optimized worker (auto-detects CPU cores)
./scripts/start-celery-worker.sh

# Or with custom options:
./scripts/start-celery-worker.sh --queues=rag,documents --loglevel=info

# Or with autoscaling (recommended):
./scripts/start-celery-worker.sh --autoscale=8,2
```

### 3. Start Flower Monitoring (optional but recommended)

```bash
# In a separate terminal
./scripts/start-celery-flower.sh

# Access dashboard at: http://localhost:5555
```

---

## Worker Configuration Options

### Auto-detected Concurrency (Recommended)

The script automatically detects your physical CPU cores and sets concurrency accordingly:

```bash
./scripts/start-celery-worker.sh
```

**What it does:**

- Detects physical cores (not hyperthreaded)
- Sets `--concurrency` to match physical cores
- Prevents CPU oversubscription

### Manual Concurrency

Override auto-detection if needed:

```bash
# Fixed 4 workers
./scripts/start-celery-worker.sh --concurrency=4
```

### Autoscaling (Best for Variable Load)

Dynamically scale workers based on workload:

```bash
# Scale between 2 (min) and 8 (max) workers
./scripts/start-celery-worker.sh --autoscale=8,2
```

**Benefits:**

- Saves CPU during low activity
- Scales up during high load
- Prevents CPU maxing

### Queue Selection

Choose which queues this worker processes:

```bash
# RAG and document processing only
./scripts/start-celery-worker.sh --queues=rag,documents

# Emails only (can use gevent pool for I/O tasks)
celery -A app.services.background.celery_app worker \
    --pool=gevent \
    --concurrency=100 \
    --queues=emails
```

---

## Multiple Workers Strategy

For production, run separate workers for different task types:

### Setup 1: CPU-bound Worker

```bash
# Terminal 1: RAG + Documents (CPU-intensive)
./scripts/start-celery-worker.sh \
    --queues=rag,documents \
    --concurrency=4 \
    --loglevel=info
```

### Setup 2: I/O-bound Worker

```bash
# Terminal 2: Emails (I/O-intensive)
celery -A app.services.background.celery_app worker \
    --pool=gevent \
    --concurrency=100 \
    --queues=emails \
    --loglevel=info
```

### Setup 3: Reports Worker (Autoscaling)

```bash
# Terminal 3: Reports (variable load)
./scripts/start-celery-worker.sh \
    --queues=reports \
    --autoscale=4,1 \
    --loglevel=info
```

---

## Optimizations Explained

### 1. Prefetch Multiplier = 1

**What it does:**

- Workers fetch only 1 task at a time

**Why it matters:**

- Prevents task hogging
- Ensures fair distribution
- Critical for long-running tasks

**Before:**

```python
worker_prefetch_multiplier=4  # Worker could grab 16 tasks (4 workers × 4 prefetch)
```

**After:**

```python
worker_prefetch_multiplier=1  # Worker grabs tasks one at a time
```

### 2. Max Tasks Per Child = 50

**What it does:**

- Worker process is recycled after 50 tasks

**Why it matters:**

- Prevents memory leaks (common in document processing)
- Frees up accumulated memory
- More frequent than default (1000)

**Impact:**

- Worker memory stays stable
- Slight overhead from process recycling (negligible)

### 3. Max Memory Per Child = 500MB

**What it does:**

- Kills worker if it exceeds 500MB

**Why it matters:**

- Prevents runaway memory usage
- Protects system from memory exhaustion
- Forces graceful restart

### 4. Broker Visibility Timeout = 900s

**What it does:**

- Tasks are re-queued after 15 minutes if not acknowledged

**Why it matters:**

- Faster recovery from worker crashes
- Your longest task is ~10 minutes (safe)
- Previously 1 hour (too long)

---

## Monitoring with Flower

### Install Flower

```bash
pip install flower
```

### Start Flower

```bash
./scripts/start-celery-flower.sh
```

### Access Dashboard

Open: <http://localhost:5555>

**What you can monitor:**

- Active/idle workers
- Task execution times
- Queue lengths
- CPU and memory usage per worker
- Failed tasks
- Task history

### Useful Flower Features

- **Tasks Tab**: See all running/completed tasks
- **Workers Tab**: Monitor worker health and resource usage
- **Broker Tab**: Check Redis connection and queue status
- **Monitor Tab**: Real-time graphs

---

## Troubleshooting

### Worker CPU at 100%

**Symptoms:**

- All CPU cores maxed out
- System sluggish
- Tasks slow to process

**Solutions:**

1. **Check concurrency:**

   ```bash
   # Reduce concurrency to physical cores
   ./scripts/start-celery-worker.sh --concurrency=4
   ```

2. **Enable autoscaling:**

   ```bash
   ./scripts/start-celery-worker.sh --autoscale=8,2
   ```

3. **Monitor with Flower:**
   - Check if workers are hogging tasks
   - Look for long-running tasks

### Worker Memory Growing

**Symptoms:**

- Worker memory continuously increasing
- System running out of RAM

**Solutions:**

1. **Check max_tasks_per_child:**
   - Should be 50 (already set in config)
   - Workers recycle automatically

2. **Lower max_memory_per_child:**

   ```python
   # In celery_app.py
   worker_max_memory_per_child=300000  # 300MB instead of 500MB
   ```

3. **Monitor with Flower:**
   - Watch memory usage over time
   - Identify memory-hungry tasks

### Tasks Not Processing

**Symptoms:**

- Tasks stuck in queue
- Workers idle

**Solutions:**

1. **Check Redis connection:**

   ```bash
   redis-cli ping
   ```

2. **Verify worker is running:**

   ```bash
   celery -A app.services.background.celery_app inspect active
   ```

3. **Check queue routing:**

   ```bash
   celery -A app.services.background.celery_app inspect active_queues
   ```

4. **Check logs:**

   ```bash
   # Worker logs show errors
   ./scripts/start-celery-worker.sh --loglevel=debug
   ```

### Tasks Executing Twice

**Symptoms:**

- Same document processed multiple times
- Duplicate embeddings

**Cause:**

- Task execution time > visibility timeout

**Solutions:**

1. **Increase visibility timeout:**

   ```python
   # In celery_app.py
   broker_visibility_timeout=1800  # 30 minutes
   ```

2. **Optimize slow tasks:**
   - Check Flower for execution times
   - Identify bottlenecks

---

## Redis Optimization

### Local Development

For development, default Redis is fine:

```bash
redis-server
```

### Production Setup

Use optimized configuration:

```bash
redis-server config/redis-optimized.conf
```

**What it enables:**

- AOF persistence (every second)
- 2GB memory limit
- No eviction policy (guaranteed delivery)
- Optimized for Celery operations

### Verify Redis Persistence

```bash
# Check AOF is enabled
redis-cli CONFIG GET appendonly
# Should return: appendonly yes

# Check AOF sync mode
redis-cli CONFIG GET appendfsync
# Should return: appendfsync everysec
```

### Monitor Redis

```bash
# Check memory usage
redis-cli INFO memory

# Check connected clients
redis-cli INFO clients

# Check slow operations
redis-cli SLOWLOG GET 10
```

---

## Performance Testing

### Test CPU Usage

```bash
# Terminal 1: Start worker
./scripts/start-celery-worker.sh

# Terminal 2: Monitor CPU
htop
# or
top -H -p $(pgrep -f "celery worker")

# Terminal 3: Queue tasks
python -c "
from app.services.background.tasks import process_document_task
for i in range(100):
    process_document_task.delay(document_id=i)
print('Queued 100 tasks')
"
```

**Expected Results:**

- CPU usage: <80% (not maxed out)
- Workers processing sequentially (prefetch=1)
- Memory stable (recycling every 50 tasks)

### Test Memory Stability

```bash
# Start worker with Flower
./scripts/start-celery-worker.sh
./scripts/start-celery-flower.sh

# Queue many tasks
python -c "
from app.services.background.tasks import process_document_task
for i in range(500):
    process_document_task.delay(document_id=i)
"

# Monitor in Flower:
# - Worker memory should plateau
# - Check "Tasks per worker" - should recycle at 50
```

---

## Summary

**Key Changes:**

- ✅ Prefetch multiplier: 4 → 1
- ✅ Max tasks per child: 1000 → 50
- ✅ Added memory limit: 500MB
- ✅ Reduced visibility timeout: 3600s → 900s
- ✅ Auto-detect physical CPU cores
- ✅ Redis persistence enabled

**Quick Start Commands:**

```bash
# 1. Start Redis
redis-server config/redis-optimized.conf

# 2. Start worker
./scripts/start-celery-worker.sh

# 3. Start monitoring
./scripts/start-celery-flower.sh
```

**Expected Improvements:**

- CPU usage under control (<80%)
- Stable memory usage
- Fair task distribution
- Faster task recovery on failures

**Next Steps:**

1. Test in development environment
2. Monitor metrics with Flower
3. Adjust concurrency if needed
4. Deploy to production when ready
