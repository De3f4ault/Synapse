# LlamaIndex Integration Guide - SYNAPSE RAG 2.0

## 🎯 Key Insight from Research

**LlamaIndex is NOT a black box** - it's a **composable framework** where we can:
1. ✅ Use **global Settings** to configure our custom models
2. ✅ Create **custom retrievers** by inheriting `BaseRetriever`
3. ✅ Use **node postprocessors** for reranking
4. ✅ Leverage **QueryPipeline** or **Workflow** for orchestration
5. ✅ Keep **full control** over Qdrant, embeddings, and chunking

---

## 🏗️ Optimal Architecture

### LlamaIndex Components We WILL Use

| Component | Purpose | Our Implementation |
|-----------|---------|-------------------|
| **Settings** | Global config | Configure our all-MiniLM embedder |
| **BaseRetriever** | Custom retrieval | Inherit for Qdrant + BM25 retrievers |
| **NodePostprocessor** | Reranking | Cross-encoder + SYNAPSE boost |
| **QueryPipeline** | Orchestration | Connect retrieval → reranking → synthesis |
| **VectorStoreIndex** | Index abstraction | Wrap Qdrant collections |
| **Response Synthesizer** | LLM integration | Format context → LLM |

### LlamaIndex Components We WON'T Use

| Component | Why Not |
|-----------|---------|
| ~~ServiceContext~~ | Deprecated in v0.10+ (use Settings) |
| ~~SimpleDirectoryReader~~ | Too basic, we have custom parsers |
| ~~Default chunking~~ | We use semantic chunking |
| ~~LlamaCloud~~ | Local-first approach |

---

## 📚 Updated Architecture

### 1. Global Settings Configuration

**File**: `config/llamaindex_config.py`

```python
from llama_index.core import Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.llms.litellm import LiteLLM

# Configure global LlamaIndex settings
def configure_llamaindex():
    """Configure LlamaIndex global settings"""
    
    # Embedding model (all-MiniLM-L6-v2)
    Settings.embed_model = HuggingFaceEmbedding(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        cache_folder=".model_cache",
        device="cpu"
    )
    
    # LLM (using existing LiteLLM setup)
    Settings.llm = LiteLLM(model="gpt-4")
    
    # Chunk settings (used by default parsers)
    Settings.chunk_size = 512
    Settings.chunk_overlap = 128
    
    # Number of results to retrieve
    Settings.num_output = 5
    
    print("✅ LlamaIndex Settings configured")
```

**Benefits**:
- Lazy instantiation (loads only when needed)
- Shared across all LlamaIndex components
- Can override per-component if needed

---

### 2. Custom Qdrant Retriever

**File**: `retrieval/retrievers/llamaindex_vector_retriever.py`

```python
from llama_index.core.retrievers import BaseRetriever
from llama_index.core.schema import NodeWithScore, QueryBundle
from typing import List
import structlog

logger = structlog.get_logger(__name__)

class QdrantVectorRetriever(BaseRetriever):
    """
    Custom LlamaIndex retriever backed by Qdrant.
    
    Inherits from BaseRetriever to integrate with LlamaIndex
    query engine and pipelines.
    """
    
    def __init__(
        self,
        qdrant_client,
        collection_manager,
        embedding_manager,
        top_k: int = 50,
        **kwargs
    ):
        super().__init__(**kwargs)
        self.qdrant_client = qdrant_client
        self.collections = collection_manager
        self.embedder = embedding_manager
        self.top_k = top_k
    
    def _retrieve(self, query_bundle: QueryBundle) -> List[NodeWithScore]:
        """
        Retrieve nodes from Qdrant.
        
        Args:
            query_bundle: Contains query string and optional metadata
        
        Returns:
            List of NodeWithScore objects (LlamaIndex format)
        """
        query = query_bundle.query_str
        logger.info("qdrant_retrieval_start", query=query[:50])
        
        # 1. Embed query (uses Settings.embed_model automatically)
        from llama_index.core import Settings
        query_embedding = Settings.embed_model.get_query_embedding(query)
        
        # 2. Search Qdrant
        user_id = query_bundle.custom_embedding_strs.get("user_id")  # Pass via metadata
        collection_name = self.collections._get_collection_name(
            user_id,
            "documents"
        )
        
        results = self.qdrant_client.search(
            collection_name=collection_name,
            query_vector=query_embedding,
            limit=self.top_k
        )
        
        # 3. Convert to LlamaIndex NodeWithScore format
        nodes_with_scores = []
        for result in results:
            from llama_index.core.schema import TextNode
            
            node = TextNode(
                text=result.payload.get("text", ""),
                metadata={
                    "source_id": result.payload.get("source_id"),
                    "source_type": result.payload.get("source_type"),
                    "title": result.payload.get("title"),
                    "chunk_index": result.payload.get("chunk_index")
                },
                id_=result.id
            )
            
            nodes_with_scores.append(
                NodeWithScore(node=node, score=result.score)
            )
        
        logger.info("qdrant_retrieval_complete", results=len(nodes_with_scores))
        return nodes_with_scores
```

**Benefits**:
- Works seamlessly with LlamaIndex QueryEngine
- Can combine with other LlamaIndex retrievers
- Preserves our Qdrant optimizations

---

### 3. Custom BM25 Retriever

**File**: `retrieval/retrievers/llamaindex_bm25_retriever.py`

```python
from llama_index.core.retrievers import BaseRetriever
from llama_index.core.schema import NodeWithScore, QueryBundle, TextNode
from rank_bm25 import BM25Okapi
from typing import List
import structlog

logger = structlog.get_logger(__name__)

class BM25Retriever(BaseRetriever):
    """
    BM25 keyword-based retriever for hybrid search.
    
    Complements dense retrieval with keyword matching.
    """
    
    def __init__(
        self,
        corpus_nodes: List[TextNode],  # Pre-loaded document nodes
        top_k: int = 50,
        **kwargs
    ):
        super().__init__(**kwargs)
        self.corpus_nodes = corpus_nodes
        self.top_k = top_k
        
        # Build BM25 index
        tokenized_corpus = [
            node.get_content().lower().split()
            for node in corpus_nodes
        ]
        self.bm25 = BM25Okapi(tokenized_corpus)
        logger.info("bm25_index_built", corpus_size=len(corpus_nodes))
    
    def _retrieve(self, query_bundle: QueryBundle) -> List[NodeWithScore]:
        """Retrieve using BM25 keyword matching"""
        query = query_bundle.query_str
        tokenized_query = query.lower().split()
        
        # Get BM25 scores
        scores = self.bm25.get_scores(tokenized_query)
        
        # Get top-k indices
        top_indices = sorted(
            range(len(scores)),
            key=lambda i: scores[i],
            reverse=True
        )[:self.top_k]
        
        # Build NodeWithScore list
        nodes_with_scores = [
            NodeWithScore(
                node=self.corpus_nodes[i],
                score=float(scores[i])
            )
            for i in top_indices
        ]
        
        logger.info("bm25_retrieval_complete", results=len(nodes_with_scores))
        return nodes_with_scores
```

---

### 4. Hybrid Retriever (RRF Fusion)

**File**: `retrieval/retrievers/llamaindex_hybrid_retriever.py`

```python
from llama_index.core.retrievers import BaseRetriever
from llama_index.core.schema import NodeWithScore, QueryBundle
from typing import List
import structlog

logger = structlog.get_logger(__name__)

class HybridRetriever(BaseRetriever):
    """
    Hybrid retriever using Reciprocal Rank Fusion.
    
    Combines dense (Qdrant) + sparse (BM25) retrieval.
    """
    
    def __init__(
        self,
        vector_retriever: QdrantVectorRetriever,
        bm25_retriever: BM25Retriever,
        alpha: float = 0.5,  # Weight for vector vs BM25
        **kwargs
    ):
        super().__init__(**kwargs)
        self.vector_retriever = vector_retriever
        self.bm25_retriever = bm25_retriever
        self.alpha = alpha
    
    def _retrieve(self, query_bundle: QueryBundle) -> List[NodeWithScore]:
        """Fuse dense + sparse results using RRF"""
        
        # Get results from both retrievers
        vector_results = self.vector_retriever.retrieve(query_bundle)
        bm25_results = self.bm25_retriever.retrieve(query_bundle)
        
        # RRF formula: score = 1 / (k + rank)
        k = 60  # RRF constant
        
        # Build score map
        node_scores = {}
        
        # Add vector scores
        for rank, node_with_score in enumerate(vector_results):
            node_id = node_with_score.node.id_
            rrf_score = 1.0 / (k + rank + 1)
            node_scores[node_id] = {
                "node": node_with_score.node,
                "score": self.alpha * rrf_score
            }
        
        # Add BM25 scores
        for rank, node_with_score in enumerate(bm25_results):
            node_id = node_with_score.node.id_
            rrf_score = 1.0 / (k + rank + 1)
            
            if node_id in node_scores:
                node_scores[node_id]["score"] += (1 - self.alpha) * rrf_score
            else:
                node_scores[node_id] = {
                    "node": node_with_score.node,
                    "score": (1 - self.alpha) * rrf_score
                }
        
        # Sort by fused score
        fused_results = sorted(
            [
                NodeWithScore(node=data["node"], score=data["score"])
                for data in node_scores.values()
            ],
            key=lambda x: x.score,
            reverse=True
        )
        
        logger.info(
            "hybrid_fusion_complete",
            vector_results=len(vector_results),
            bm25_results=len(bm25_results),
            fused_results=len(fused_results)
        )
        
        return fused_results[:self.vector_retriever.top_k]
```

---

### 5. Cross-Encoder Reranker (Node Postprocessor)

**File**: `reranking/llamaindex_cross_encoder_reranker.py`

```python
from llama_index.core.postprocessor import BaseNodePostprocessor
from llama_index.core.schema import NodeWithScore, QueryBundle
from sentence_transformers import CrossEncoder
from typing import List, Optional
import structlog

logger = structlog.get_logger(__name__)

class CrossEncoderReranker(BaseNodePostprocessor):
    """
    Cross-encoder reranker as LlamaIndex node postprocessor.
    
    Reranks initial retrieval results using ms-marco cross-encoder.
    """
    
    def __init__(
        self,
        model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
        top_k: int = 5,
        **kwargs
    ):
        super().__init__(**kwargs)
        self.model = CrossEncoder(model_name, device="cpu")
        self.top_k = top_k
        logger.info("cross_encoder_loaded", model=model_name)
    
    def _postprocess_nodes(
        self,
        nodes: List[NodeWithScore],
        query_bundle: Optional[QueryBundle] = None
    ) -> List[NodeWithScore]:
        """
        Rerank nodes using cross-encoder.
        
        Args:
            nodes: Retrieved nodes from retriever
            query_bundle: Original query
        
        Returns:
            Reranked nodes (top_k)
        """
        if not query_bundle:
            return nodes
        
        query = query_bundle.query_str
        logger.info("reranking_start", candidates=len(nodes))
        
        # Create query-document pairs
        pairs = [[query, node.node.get_content()] for node in nodes]
        
        # Score pairs (batch for efficiency)
        scores = self.model.predict(pairs, batch_size=10)
        
        # Update scores
        for node, score in zip(nodes, scores):
            node.score = float(score)
        
        # Sort by new scores
        reranked = sorted(nodes, key=lambda x: x.score, reverse=True)
        
        logger.info(
            "reranking_complete",
            original_top1_score=nodes[0].score,
            reranked_top1_score=reranked[0].score
        )
        
        return reranked[:self.top_k]
```

---

### 6. SYNAPSE-Aware Reranker (Node Postprocessor)

**File**: `personalization/llamaindex_synapse_reranker.py`

```python
from llama_index.core.postprocessor import BaseNodePostprocessor
from llama_index.core.schema import NodeWithScore, QueryBundle
from typing import List, Optional
import structlog

logger = structlog.get_logger(__name__)

class SynapseReranker(BaseNodePostprocessor):
    """
    Learning-aware reranker for SYNAPSE.
    
    Boosts chunks on user's weak topics.
    """
    
    def __init__(
        self,
        context_engine,
        boost_factor: float = 1.3,
        **kwargs
    ):
        super().__init__(**kwargs)
        self.context_engine = context_engine
        self.boost_factor = boost_factor
    
    async def _postprocess_nodes(
        self,
        nodes: List[NodeWithScore],
        query_bundle: Optional[QueryBundle] = None
    ) -> List[NodeWithScore]:
        """Boost nodes on weak topics"""
        
        if not query_bundle:
            return nodes
        
        # Get user ID from metadata
        user_id = query_bundle.custom_embedding_strs.get("user_id")
        if not user_id:
            return nodes
        
        # Get user context
        user_context = await self.context_engine.get_user_context(user_id)
        weak_topics = [
            topic["topic"]
            for topic in user_context.get("analytics", {}).get("weak_topics", [])
        ]
        
        if not weak_topics:
            return nodes
        
        logger.info("synapse_boost_start", weak_topics=weak_topics)
        
        # Boost nodes matching weak topics
        boosted_count = 0
        for node in nodes:
            text = node.node.get_content().lower()
            for topic in weak_topics:
                if topic.lower() in text:
                    node.score *= self.boost_factor
                    node.node.metadata["boosted_for"] = topic
                    boosted_count += 1
                    break
        
        # Re-sort
        nodes = sorted(nodes, key=lambda x: x.score, reverse=True)
        
        logger.info("synapse_boost_complete", boosted=boosted_count)
        return nodes
```

---

### 7. Query Pipeline (Orchestration)

**File**: `pipeline/llamaindex_query_pipeline.py`

```python
from llama_index.core.query_pipeline import QueryPipeline
from llama_index.core.response_synthesizers import get_response_synthesizer
from llama_index.core import Settings
import structlog

logger = structlog.get_logger(__name__)

def create_rag_pipeline(
    retriever: "BaseRetriever",
    reranker: "CrossEncoderReranker",
    synapse_reranker: "SynapseReranker"
):
    """
    Create LlamaIndex QueryPipeline for RAG.
    
    Pipeline stages:
    1. Retrieval (hybrid: Qdrant + BM25)
    2. Cross-encoder reranking
    3. SYNAPSE boosting
    4. Response synthesis
    """
    
    # Create response synthesizer (uses Settings.llm)
    response_synthesizer = get_response_synthesizer(
        response_mode="compact"  # Optimize context usage
    )
    
    # Build pipeline
    pipeline = QueryPipeline(verbose=True)
    
    # Add components
    pipeline.add_modules({
        "retriever": retriever,
        "reranker": reranker,
        "synapse_reranker": synapse_reranker,
        "synthesizer": response_synthesizer
    })
    
    # Define connections (DAG)
    pipeline.add_link("retriever", "reranker")
    pipeline.add_link("reranker", "synapse_reranker")
    pipeline.add_link("synapse_reranker", "synthesizer")
    
    logger.info("rag_pipeline_created")
    return pipeline

# Usage
async def query_rag(pipeline, query: str, user_id: int):
    """Query RAG pipeline"""
    from llama_index.core.schema import QueryBundle
    
    # Create query bundle with metadata
    query_bundle = QueryBundle(
        query_str=query,
        custom_embedding_strs={"user_id": user_id}
    )
    
    # Run pipeline
    response = await pipeline.arun(input=query_bundle)
    
    return {
        "answer": response.response,
        "sources": [
            {
                "text": node.node.get_content()[:200],
                "score": node.score,
                "metadata": node.node.metadata
            }
            for node in response.source_nodes
        ]
    }
```

---

## 📋 Updated Phase 0 Implementation

### New File Structure

```
rag/
├── config/
│   ├── rag_config.py                    # Our config
│   └── llamaindex_config.py             # LlamaIndex Settings ✨ NEW
│
├── retrieval/
│   └── retrievers/
│       ├── llamaindex_vector_retriever.py   # Qdrant (inherits BaseRetriever) ✨ NEW
│       ├── llamaindex_bm25_retriever.py     # BM25 (inherits BaseRetriever) ✨ NEW
│       └── llamaindex_hybrid_retriever.py   # RRF Fusion ✨ NEW
│
├── reranking/
│   └── llamaindex_cross_encoder_reranker.py # Cross-encoder (NodePostprocessor) ✨ NEW
│
├── personalization/
│   └── llamaindex_synapse_reranker.py       # SYNAPSE boost (NodePostprocessor) ✨ NEW
│
└── pipeline/
    └── llamaindex_query_pipeline.py         # QueryPipeline orchestration ✨ NEW
```

---

## 🎯 Benefits of This Approach

### 1. **Best of Both Worlds**
- ✅ LlamaIndex orchestration & abstractions
- ✅ Full control over Qdrant, embeddings, chunking
- ✅ Native LlamaIndex integrations (query engines, agents)

### 2. **Composable Architecture**
- ✅ Mix custom + LlamaIndex components
- ✅ Easy to swap retrievers (e.g., add ColBERT later)
- ✅ Reuse across different query types

### 3. **Production-Grade**
- ✅ LlamaIndex's battle-tested QueryPipeline
- ✅ Our CPU-optimized models
- ✅ SYNAPSE personalization

### 4. **Future-Proof**
- ✅ Easy to add LlamaIndex Workflows (event-driven)
- ✅ Can use LlamaIndex agents with our retrievers
- ✅ Compatible with LlamaIndex ecosystem (LlamaHub, etc.)

---

## 🔄 Migration from "Custom Pipeline"

**Before** (Pure custom):
```python
results = await rag_pipeline.query(query, user_id)
```

**After** (LlamaIndex-integrated):
```python
query_bundle = QueryBundle(query_str=query, custom_embedding_strs={"user_id": user_id})
response = await llamaindex_pipeline.arun(input=query_bundle)
```

**Interface stays similar**, but we gain:
- QueryEngine compatibility
- Agent integration
- Advanced query transformations (HyDE, etc.)

---

## 📦 Dependencies Update

```
# requirements.txt
llama-index-core==0.10.50
llama-index-embeddings-huggingface==0.1.5
llama-index-llms-litellm==0.1.3
llama-index-vector-stores-qdrant==0.2.0
qdrant-client==1.7.0
sentence-transformers==2.2.2
rank-bm25==0.2.2
```

---

## ✅ Updated Success Criteria

Phase 0 now includes:
- [ ] LlamaIndex Settings configured
- [ ] Custom QdrantVectorRetriever working
- [ ] BM25Retriever implemented
- [ ] HybridRetriever (RRF) functional
- [ ] CrossEncoderReranker as NodePostprocessor
- [ ] QueryPipeline orchestrating all stages
- [ ] End-to-end query < 500ms

---

**Status**: 🟢 Ready for Implementation  
**Complexity**: Medium (LlamaIndex abstractions simplify orchestration)  
**Estimated Time**: 3 days (Phase 0)
