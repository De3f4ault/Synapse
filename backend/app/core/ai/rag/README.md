# 🧠 Synapse RAG v4 — Production Retrieval System

> **Status**: ✅ Live · **Last Updated**: 2026-04-06 · **Collection**: `synapse_v4_user_{id}_documents`

## Overview

Synapse RAG is a **hybrid retrieval-augmented generation** pipeline built for personalized learning. It combines dense semantic search (Nomic embeddings) with sparse keyword search (BM25) in Qdrant, then applies cross-encoder reranking and learning-aware personalization to surface the most relevant content.

### What Makes It Different

- **Hybrid Search**: Dense (768d Nomic) + Sparse (BM25) with Reciprocal Rank Fusion
- **Adaptive Intelligence**: Query type drives strategy — factual queries skip expensive LLM rewrites; conceptual queries use HyDE
- **Learning-Aware**: Boosts results on topics where the user struggles
- **PostgreSQL Cache**: 519x speedup on repeat queries (0.004s vs 2.22s)
- **7 Entry Points**: Every search surface routes through the same optimized pipeline

---

## Architecture

```
User Query
  │
  ├─ Cache Hit? ──→ Return cached (0.004s) ──→ Done
  │
  ▼
Query Analyzer
  │ classifies: factual | conceptual | comparative | procedural
  │
  ▼
LLM Enhancement (adaptive)
  │ factual     → skip (save 2-4s)
  │ conceptual  → HyDE (hypothetical document embedding)
  │ comparative → multi_query expansion
  │ other       → standard rewrite
  │
  ▼
Hybrid Retrieval (Qdrant)
  │ Dense:  Nomic nomic-embed-text-v1.5 (768d, cosine)
  │ Sparse: BM25 sparse vectors
  │ Fusion: Reciprocal Rank Fusion (k=60)
  │ Limit:  top 15 candidates
  │
  ▼
Cross-Encoder Reranking
  │ Model: ms-marco-MiniLM-L-6-v2
  │ Input: 15 candidates → Output: top 5
  │
  ▼
Learning-Aware Reranking
  │ Boost weak areas: +50% score
  │ Boost recent topics: +20% score
  │ Source: ContextEngine → user mastery data
  │
  ▼
Cache Store → Return Results
```

---

## Technology Stack

| Component | Technology | Details |
|-----------|-----------|---------|
| **Embeddings** | `nomic-embed-text-v1.5` | 768d, Matryoshka, `search_document:` / `search_query:` prefixes |
| **Sparse** | BM25 via `rank_bm25` | Sparse vectors stored in Qdrant named vectors |
| **Vector Store** | Qdrant (local) | Named vectors (dense + sparse), HNSW, payload multitenancy |
| **Reranker** | `ms-marco-MiniLM-L-6-v2` | Cross-encoder, CPU-optimized |
| **Cache** | PostgreSQL (`kv_store` UNLOGGED) | Exact-match query cache, 30min TTL |
| **LLM** | Gemini | Query rewriting, HyDE generation |
| **Chunking** | LlamaIndex `SemanticSplitterNodeParser` | Embedding-based boundary detection |
| **Framework** | LlamaIndex (selective) | Used for chunking and node format; pipeline is custom |

---

## Directory Structure

```
app/core/ai/rag/
├── pipeline/
│   └── rag_pipeline.py              # Main orchestrator (ingest + query)
│
├── config/
│   ├── rag_config.py                # retrieval_top_k, enable_caching, etc.
│   ├── model_config.py              # Embedding model selection
│   ├── vector_store_config.py       # Qdrant host, collection prefix
│   └── llamaindex_config.py         # LlamaIndex service context
│
├── embeddings/
│   ├── models/
│   │   ├── nomic_embedder.py        # Primary: nomic-embed-text-v1.5 (768d)
│   │   ├── all_minilm.py           # Legacy: all-MiniLM-L6-v2 (384d)
│   │   ├── gemini_embedder.py       # Cloud: Gemini embeddings
│   │   └── base_embedder.py         # Abstract interface
│   └── sparse_embedder.py           # BM25 sparse vector generation
│
├── vector_store/
│   ├── qdrant/
│   │   ├── client.py                # Qdrant client wrapper (singleton)
│   │   ├── collection_manager.py    # Create/manage user collections
│   │   ├── schema.py                # Dual-vector schema (dense + sparse)
│   │   └── batch_upserter.py        # Batch operations
│   └── operations/
│       ├── search.py                # Hybrid search + RRF fusion
│       └── upsert.py                # Dual-vector point construction
│
├── retrieval/
│   └── retrievers/
│       └── llamaindex_vector_retriever.py  # Hybrid retriever (dense + sparse)
│
├── reranking/
│   ├── llamaindex_reranker.py       # Cross-encoder wrapper (ms-marco)
│   └── models/
│       └── cross_encoder.py         # Model loading + inference
│
├── query_enhancement/
│   ├── query_analyzer.py            # Classify: factual/conceptual/comparative
│   ├── llm_expander.py              # Gemini rewrite, HyDE, multi_query
│   └── weak_area_expander.py        # Expand queries with user weak topics
│
├── synapse_integration/
│   ├── learning_aware_reranker.py   # Boost weak areas + recent topics
│   ├── context_bridge.py            # Bridge to ContextEngine
│   └── real_context_engine.py       # Fetch user mastery from DB
│
├── caching/
│   └── cache_manager.py             # PgRagCacheManager (PostgreSQL-backed)
│
├── chunking/
│   └── strategies/
│       └── advanced_semantic_chunker.py  # LlamaIndex semantic splitter
│
├── ingestion/
│   └── parsers/
│       ├── base_parser.py           # Abstract parser interface
│       └── pdf_parser.py            # PyMuPDF text extraction
│
├── llama_index/
│   └── query_engine.py              # Notes service adapter (wraps RAGPipeline)
│
├── metadata/                        # Reserved for future LLM-based tagging
│   └── __init__.py
│
├── utils/
│   └── rrf.py                       # Reciprocal Rank Fusion utility
│
└── tests/
    └── integration/
        ├── test_basic_pipeline.py
        └── test_pipeline_quality.py
```

---

## Entry Points

Every search surface in Synapse routes through `RAGPipeline`:

| # | Entry Point | File | How |
|---|------------|------|-----|
| 1 | `POST /api/rag/query` | `api/rest/rag.py` | `RAGService → RAGPipeline.query()` |
| 2 | `POST /api/rag/documents/ingest` | `api/rest/rag.py` | `RAGService → RAGPipeline.ingest_document()` |
| 3 | `POST /api/search/unified` | `api/rest/search.py` | `UnifiedSearchService → RAGPipeline` |
| 4 | `GET /api/search?type=semantic` | `api/rest/search.py` | `RAGService.query()` |
| 5 | Agent tools (SearchNotes, SearchDocs) | `ai/tools/rag_tools.py` | `RAGService.query()` |
| 6 | Notes vector search | `modules/notes/service.py` | `QueryEngine → RAGPipeline` |
| 7 | Celery background tasks | `services/background/rag_tasks.py` | `RAGService` |

### Grounding Flow (Chat)

The chat agent uses evidence-grounded responses via:

```
User Message → GroundingService.ground()
  → UnifiedSearchService.search(intent=RETRIEVE_CONTEXT)
  → RAGPipeline.query()
  → select_evidence() → format_evidence_for_prompt()
  → <EVIDENCE>...</EVIDENCE> injected into LLM prompt
```

---

## Configuration

### Environment Variables

```bash
EMBEDDING_PROVIDER=local          # local (Nomic) | gemini (cloud)
EMBEDDING_MODEL=nomic-embed-text-v1.5
QDRANT_HOST=localhost
QDRANT_PORT=6333
```

### RAGConfig (`config/rag_config.py`)

| Setting | Value | Rationale |
|---------|-------|-----------|
| `retrieval_top_k` | 15 | Nomic quality allows fewer candidates (was 20) |
| `reranking_top_k` | 5 | Cross-encoder precision stage |
| `enable_caching` | True | PostgreSQL exact-match cache |
| `cache_ttl_minutes` | 30 | Balance freshness vs speed |
| `enable_hybrid` | True | Dense + sparse fusion |

---

## Data Flow

### Ingestion

```
Document Text
  → Semantic Chunking (embedding-based boundaries)
  → Dense Embeddings (Nomic 768d, with "[Source: title]" context prepended)
  → Sparse Embeddings (BM25, on original text — no title to avoid term inflation)
  → Qdrant Upsert (named vectors: "dense" + "sparse", payload: text, metadata)
  → Cache Invalidation (clear user's query cache)
```

### Query

```
Query String
  → Cache Check (exact match on user_id + query + source_type)
  → Query Analysis (type classification)
  → Adaptive LLM Enhancement (HyDE / multi_query / rewrite / skip)
  → Hybrid Retrieval (dense cosine + sparse BM25 → RRF fusion)
  → Cross-Encoder Reranking (15 → 5)
  → Learning-Aware Boosting (weak areas +50%, recent +20%)
  → Cache Store → Return
```

---

## Performance

### Measured Latencies (CPU — AMD Ryzen / Intel i5)

| Operation | Cold | Cached |
|-----------|------|--------|
| Full pipeline (conceptual, HyDE) | ~2.2s | 0.004s |
| Full pipeline (factual, no LLM) | ~0.8s | 0.004s |
| Cache speedup | — | **519x** |

### Key Metrics

| Metric | Value |
|--------|-------|
| Collection size | 27,442 chunks |
| Embedding model | Nomic v1.5 (768d) |
| Cross-encoder | ms-marco-MiniLM-L-6-v2 |
| Cache backend | PostgreSQL UNLOGGED table |
| Cache TTL | 30 minutes |

---

## Migration History

| Version | Embedding | Vectors | Collection |
|---------|-----------|---------|------------|
| v2 | MiniLM (384d) | Dense only | `synapse_v2_*` (LanceDB — removed) |
| v3 | MiniLM (384d) | Dense only | `synapse_v3_*` (Qdrant) |
| **v4** | **Nomic (768d)** | **Dense + Sparse** | **`synapse_v4_*` (Qdrant)** |

The v4 migration re-embedded all 27,442 chunks with contextual headers (`[Source: title]`) and added BM25 sparse vectors for hybrid retrieval.

---

## Future Enhancements

- **Feedback Loops**: Wire frontend clicks to `RAGPipeline.process_feedback()` (infrastructure ready)
- **Semantic Caching**: Cosine-similarity cache for near-miss queries
- **LLM-Based Tagging**: Replace rule-based topic/difficulty with Gemini classification
- **Section-Level Context**: Add chapter headings to chunk context for better disambiguation
