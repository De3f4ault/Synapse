# Celery Optimization - Quick Start Guide

## 🚀 What Was Changed

### 1. Configuration Optimizations (`celery_app.py`)

| Setting | Before | After | Impact |
|---------|--------|-------|--------|
| `worker_prefetch_multiplier` | 4 | **1** | ⭐ Prevents CPU maxing |
| `worker_max_tasks_per_child` | 1000 | **50** | Prevents memory leaks |
| `worker_max_memory_per_child` | None | **500MB** | Kills runaway workers |
| `broker_visibility_timeout` | 3600s | **900s** | Faster recovery |
| `broker_pool_limit` | None | **10** | Optimized connections |

### 2. New Scripts

- ✅ `scripts/start-celery-worker.sh` - Optimized worker startup
- ✅ `scripts/start-celery-flower.sh` - Monitoring dashboard
- ✅ `config/redis-optimized.conf` - Redis persistence config

### 3. Documentation

- ✅ `CELERY_DEPLOYMENT.md` - Complete deployment guide

---

## 💡 How to Use (3 Steps)

### Step 1: Start Redis (with persistence)

```bash
# Option A: Optimized config (recommended)
redis-server config/redis-optimized.conf

# Option B: Quick start with persistence
redis-server --appendonly yes

# Option C: Default (dev only)
redis-server
```

### Step 2: Start Celery Worker

```bash
cd backend

# Auto-detects your CPU cores and starts optimized worker
./scripts/start-celery-worker.sh
```

**What it does automatically:**

- Detects physical CPU cores (not hyperthreaded)
- Sets concurrency = physical cores
- Applies all optimizations from research

### Step 3: Start Monitoring (Optional)

```bash
# In another terminal
./scripts/start-celery-flower.sh

# Open browser: http://localhost:5555
```

---

## 📋 Testing the Optimization

### Before vs After

**Before (CPU Maxing Issue):**

```bash
# All CPU cores at 100%
# Tasks hogging workers
# Memory continuously growing
```

**After (Optimized):**

```bash
# CPU usage <80%
# Fair task distribution
# Stable memory (recycling works)
```

### Test It

```bash
# 1. Start worker
./scripts/start-celery-worker.sh

# 2. Monitor CPU
htop  # or top

# 3. Queue 100 tasks (in another terminal)
python -c "
from app.services.background.tasks import process_document_task
for i in range(100):
    process_document_task.delay(document_id=i)
print('Queued 100 tasks - check htop')
"

# Expected: CPU should NOT max out
```

---

## 🎯 Key Optimizations Explained

### 1. Prefetch = 1 (The Critical Fix)

**Problem:** Workers were grabbing 4 tasks at once, hogging the queue
**Solution:** Workers now grab 1 task at a time
**Result:** Fair distribution, no CPU maxing

### 2. Max Tasks = 50

**Problem:** Workers ran 1000 tasks before recycling, memory leaks accumulated
**Solution:** Recycle after 50 tasks
**Result:** Stable memory usage

### 3. Memory Limit = 500MB

**Problem:** No limit on worker memory
**Solution:** Kill worker if >500MB
**Result:** System protected from runaway workers

### 4. Physical CPU Cores Only

**Problem:** Celery counted hyperthreaded cores (8 instead of 4)
**Solution:** Script detects physical cores only
**Result:** No CPU oversubscription

---

## 🔧 Advanced Usage

### Autoscaling (Recommended for Variable Load)

```bash
# Scale between 2-8 workers based on load
./scripts/start-celery-worker.sh --autoscale=8,2
```

### Multiple Workers (Separate Task Types)

```bash
# Terminal 1: CPU-bound tasks (RAG, documents)
./scripts/start-celery-worker.sh --queues=rag,documents

# Terminal 2: I/O-bound tasks (emails)
celery -A app.services.background.celery_app worker \
    --pool=gevent --concurrency=100 --queues=emails
```

### Custom Concurrency

```bash
# Override auto-detection
./scripts/start-celery-worker.sh --concurrency=4
```

---

## 📊 Monitoring with Flower

### Quick Start

```bash
./scripts/start-celery-flower.sh
```

### Access

Open: <http://localhost:5555>

### What to Monitor

- **Tasks tab**: Running/completed tasks
- **Workers tab**: CPU/memory per worker
- **Monitor tab**: Real-time graphs
- **Broker**: Queue lengths

### Key Metrics

- **CPU usage per worker**: Should be <80%
- **Memory usage**: Should plateau (not grow continuously)
- **Task execution time**: Monitor for bottlenecks
- **Queue length**: Should process quickly

---

## ⚠️ Troubleshooting

### Still Seeing High CPU?

**Check Script:**

```bash
# Make scripts executable
chmod +x scripts/start-celery-worker.sh
chmod +x scripts/start-celery-flower.sh

# Run script
./scripts/start-celery-worker.sh
```

**Manual Start:**

```bash
# Determine physical cores
python3 -c "import psutil; print(psutil.cpu_count(logical=False))"

# Start with that number (e.g., 4)
celery -A app.services.background.celery_app worker \
    --concurrency=4 \
    --prefetch-multiplier=1 \
    --max-tasks-per-child=50 \
    --without-heartbeat --without-gossip --without-mingle
```

### Memory Still Growing?

Lower the memory limit:

```python
# In celery_app.py, change:
worker_max_memory_per_child=300000  # 300MB instead of 500MB
```

### Tasks Not Processing?

1. **Check Redis:**

   ```bash
   redis-cli ping  # Should return PONG
   ```

2. **Check Worker:**

   ```bash
   celery -A app.services.background.celery_app inspect active
   ```

3. **Check Logs:**

   ```bash
   ./scripts/start-celery-worker.sh --loglevel=debug
   ```

---

## 📚 Full Documentation

For complete details, see: [`CELERY_DEPLOYMENT.md`](file:///home/de3f4ault/Desktop/Projects/synapse/backend/CELERY_DEPLOYMENT.md)

---

## ✅ Summary

**What Changed:**

- ✅ Fixed CPU maxing issue (prefetch_multiplier: 4 → 1)
- ✅ Added worker recycling (max_tasks: 1000 → 50)
- ✅ Added memory limits (500MB per worker)
- ✅ Optimized Redis connection pooling
- ✅ Created auto-detecting startup scripts
- ✅ Added Redis persistence configuration
- ✅ Comprehensive documentation

**Quick Start:**

```bash
# 1. Redis
redis-server config/redis-optimized.conf

# 2. Worker
./scripts/start-celery-worker.sh

# 3. Monitor
./scripts/start-celery-flower.sh
```

**Expected Results:**

- CPU usage under control (<80%)
- Memory stable
- Tasks process efficiently
- Easy to deploy and monitor

---

**Need help?** Check [`CELERY_DEPLOYMENT.md`](file:///home/de3f4ault/Desktop/Projects/synapse/backend/CELERY_DEPLOYMENT.md) for troubleshooting!
