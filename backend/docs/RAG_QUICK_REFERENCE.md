# SYNAPSE RAG 2.0 - Quick Reference

## 🎯 TL;DR

We're rebuilding the RAG system from scratch with:

- **Two-stage retrieval** (bi-encoder → cross-encoder)
- **Qdrant** vector store (replacing LanceDB)
- **CPU-optimized** models (all-MiniLM + ms-marco)
- **Deep SYNAPSE integration** (learning-aware reranking)
- **Redis-only caching** (embeddings + queries + retrieval)
- **No monitoring yet** (structured logging sufficient for Phase 0)
- **Fresh start** (delete old RAG, rebuild from scratch)

**Timeline**: 17 days total, 3 days for Phase 0 (working MVP)

---

## 📊 System At-a-Glance

### Performance Targets

- **Query Latency**: < 500ms (cold), < 50ms (cached)
- **Ingestion Speed**: < 10s per 10-page PDF
- **Memory Usage**: < 500MB
- **Retrieval Precision**: > 60% (Phase 0), > 75% (Phase 2)

### Technology Stack

```
Embedder:     all-MiniLM-L6-v2 (384-dim, CPU-optimized)
Reranker:     ms-marco-MiniLM-L-6-v2 (cross-encoder)
Vector Store: Qdrant (local, HNSW indexing)
Chunking:     Semantic (topic-aware boundaries)
Caching:      Redis (embeddings + queries + retrieval)
```

---

## 🗂️ Directory Structure (Simplified)

```
rag/
├── config/          # All configurations
├── embeddings/      # all-MiniLM + caching
├── vector_store/    # Qdrant integration
├── chunking/        # Semantic chunking
├── retrieval/       # Dense + Sparse + Hybrid
├── reranking/       # Cross-encoder + SYNAPSE boost
├── personalization/ # SYNAPSE integration
├── pipeline/        # Main orchestrator
└── tests/           # Integration + performance tests
```

---

## 🔄 Data Flow

### Ingestion

```
PDF → Parse → Clean → Semantic Chunk → Embed (batch) → Qdrant
```

### Query

```
Query → Context Engine → [Dense + BM25] → RRF Fusion → 
Cross-Encoder → SYNAPSE Boost → Context → LLM
```

---

## 📅 Implementation Phases

### Phase 0: Foundation (3 days) ← **START HERE**

**Goal**: Working ingestion + retrieval

- Config layer
- Embedding (all-MiniLM) + cache
- Qdrant client
- Semantic chunker
- Vector retriever
- Main pipeline

**Validation**: Ingest PDF → query → get results in <500ms

---

### Phase 1: Core RAG (4 days)

**Goal**: Two-stage retrieval + hybrid

- Cross-encoder reranker
- BM25 retriever
- Hybrid fusion (RRF)
- Query cache

**Validation**: Reranking improves precision 20%+

---

### Phase 2: SYNAPSE (3 days)

**Goal**: Learning-aware retrieval

- Enhanced synapse_bridge.py
- Weak area boosting
- Difficulty filtering

**Validation**: Weak topics boosted +30%

---

### Phase 3: Optimization (4 days)

**Goal**: Production performance

- Batch optimization
- Multi-level caching
- Code-aware chunking

**Validation**: P95 < 500ms, cache hit > 40%

---

### Phase 4: Polish (3 days)

**Goal**: Production-ready

- Access control
- Retrieval metrics
- Citation tracking

**Validation**: NDCG@5 > 0.75

---

## 🔑 Key Files to Create (Phase 0)

1. `config/rag_config.py` - Main configuration
2. `embeddings/models/all_minilm.py` - Embedding model
3. `embeddings/cache/memory_cache.py` - LRU cache
4. `vector_store/qdrant/client.py` - Qdrant wrapper
5. `chunking/strategies/semantic_chunker.py` - Semantic chunking
6. `retrieval/retrievers/vector_retriever.py` - Dense retrieval
7. `pipeline/rag_pipeline.py` - Main orchestrator

---

## 🔗 SYNAPSE Integration Points

### Context Engine

```python
user_context = await context_engine.get_user_context(user_id)
# → {weak_topics: [...], mastery_scores: {...}, learning_style: "..."}
```

### Weak Area Boosting

```python
for chunk in chunks:
    if any(topic in chunk.text for topic in weak_topics):
        chunk.score *= 1.3  # 30% boost
```

### Existing Code Preserved

- `synapse_bridge.py` interface
- `context_builder.py` function signature
- `build_rag_context()` format

---

## 🎯 Success Criteria (Phase 0)

- [ ] Qdrant health check passes
- [ ] Redis connected and pingable
- [ ] Ingest PDF → chunks stored
- [ ] Query retrieves relevant results
- [ ] Latency < 500ms
- [ ] Redis cache working (hit rate > 0%)
- [ ] Integration test passes
- [ ] Memory usage < 500MB

---

## 📚 Documentation

- **Architecture Guide**: `rag/README.md`
- **Implementation Plan**: `implementation_plan.md`
- **Walkthrough**: `walkthrough.md`
- **This Guide**: `QUICK_REFERENCE.md`

---

## 🚀 Getting Started

1. **Read** `README.md` (comprehensive overview)
2. **Review** `implementation_plan.md` (Phase 0 details)
3. **Set up Redis**: See `REDIS_SETUP.md`
4. **Verify** Qdrant running: `curl http://localhost:6333/health`
5. **Verify** Redis running: `redis-cli ping`
6. **Install** dependencies: `pip install qdrant-client sentence-transformers redis llama-index-core`
7. **Create** Phase 0 files (7 core components)
8. **Test** with `tests/integration/test_basic_pipeline.py`

---

## ⚙️ Configuration Example

```python
# config/rag_config.py
class RAGConfig(BaseSettings):
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    retrieval_top_k: int = 50
    reranking_top_k: int = 5
    chunking_strategy: str = "semantic"
    embedding_model: str = "all-MiniLM-L6-v2"
    enable_learning_aware: bool = True

# config/redis_config.py
class RedisConfig(BaseSettings):
    host: str = "localhost"
    port: int = 6379
    embedding_ttl: int = 86400  # 24 hours
    query_cache_ttl: int = 3600  # 1 hour
```

---

## 🔍 Debugging Commands

```bash
# Check Qdrant health
curl http://localhost:6333/health

# Check Redis health
redis-cli ping

# View Qdrant collections
curl http://localhost:6333/collections

# View Redis keys
redis-cli KEYS "synapse:rag:*"

# Monitor Redis cache hits
redis-cli INFO stats | grep keyspace

# Query collection
curl -X POST http://localhost:6333/collections/synapse_v2_user_123_documents/points/search \
  -H 'Content-Type: application/json' \
  -d '{"vector": [...], "limit": 5}'

# View dashboard
open http://localhost:6333/dashboard
```

---

## 📊 Monitoring (Phase 4)

```python
# Cache stats
from app.core.ai.rag.caching.redis_manager import get_cache_manager

cache = get_cache_manager()
print(cache.get_stats())
# → {hits: 42, misses: 10, hit_rate: 0.81, ...}

# Pipeline metrics
print(pipeline.get_metrics())
# → {avg_latency_ms: 234, p95_latency_ms: 456}
```

---

## ❓ FAQ

**Q: Why rebuild from scratch?**
A: LanceDB → Qdrant migration, cleaner architecture, full control over pipeline

**Q: Why Redis instead of in-memory cache?**
A: Production-ready, persistent across restarts, scalable, better monitoring

**Q: Can we reuse existing documents?**
A: No, need to re-index through new pipeline (one-time cost)

**Q: What about GPU?**
A: Not needed! Models optimized for CPU with batching

**Q: How much faster is two-stage vs single-stage?**
A: Cross-encoder alone: ~5s. Two-stage: ~250ms (20x faster)

---

**Last Updated**: 2025-12-15  
**Status**: ✅ Ready for Implementation
