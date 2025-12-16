"""Basic RAG pipeline integration test."""

import pytest
import asyncio
from app.core.ai.rag.pipeline.rag_pipeline import RAGPipeline
from app.core.ai.rag.config.llamaindex_config import configure_llamaindex

# Sample document for testing
SAMPLE_DOCUMENT = """
Photosynthesis is the process by which plants convert light energy into chemical energy.
It occurs in the chloroplasts of plant cells, which contain the pigment chlorophyll.
The process requires three main inputs: carbon dioxide, water, and sunlight.
Through a series of chemical reactions, plants produce glucose as their main energy source.
Oxygen is released as a byproduct of photosynthesis.
This oxygen is essential for most life on Earth, as it is used in cellular respiration.
"""

@pytest.fixture
async def rag_pipeline():
    """Initialize RAG pipeline for testing"""
    # Configure LlamaIndex
    configure_llamaindex()
    
    # Create pipeline
    pipeline = RAGPipeline()
    
    yield pipeline


@pytest.mark.asyncio
async def test_document_ingestion(rag_pipeline):
    """Test document ingestion flow"""
    
    # Ingest document
    result = await rag_pipeline.ingest_document(
        user_id=999,  # Test user
        document_text=SAMPLE_DOCUMENT,
        document_id="test_doc_photosynthesis",
        document_title="Photosynthesis Overview"
    )
    
    # Verify ingestion
    assert result["status"] == "indexed"
    assert result["chunks"] > 0
    assert "collection" in result
    
    print(f"✅ Ingestion successful: {result['chunks']} chunks indexed")


@pytest.mark.asyncio
async def test_query_retrieval(rag_pipeline):
    """Test query retrieval flow"""
    
    # First, ingest document
    await rag_pipeline.ingest_document(
        user_id=999,
        document_text=SAMPLE_DOCUMENT,
        document_id="test_doc_photosynthesis_query",
        document_title="Photosynthesis Overview"
    )
    
    # Query
    result = await rag_pipeline.query(
        user_id=999,
        query="How do plants make food?",
        top_k=3
    )
    
    # Verify results
    assert len(result["chunks"]) > 0
    assert result["count"] > 0
    
    # Check relevance
    top_chunk = result["chunks"][0]
    assert "photosynthesis" in top_chunk["text"].lower() or "glucose" in top_chunk["text"].lower()
    assert top_chunk["score"] > 0.3  # Minimum similarity
    
    print(f"✅ Query successful: {result['count']} results, top score: {top_chunk['score']:.3f}")


@pytest.mark.asyncio
async def test_end_to_end_pipeline(rag_pipeline):
    """Test complete end-to-end RAG flow"""
    
    test_user_id = 999
    test_doc_id = "test_doc_e2e"
    
    # 1. Ingest
    print("\n📥 Testing ingestion...")
    ingest_result = await rag_pipeline.ingest_document(
        user_id=test_user_id,
        document_text=SAMPLE_DOCUMENT,
        document_id=test_doc_id,
        document_title="E2E Test Document"
    )
    
    assert ingest_result["status"] == "indexed"
    print(f"   ✅ Ingested {ingest_result['chunks']} chunks")
    
    # 2. Query multiple times (test caching)
    print("\n🔍 Testing queries...")
    
    queries = [
        "What is photosynthesis?",
        "What do plants produce?",
        "What is released during photosynthesis?"
    ]
    
    for query in queries:
        result = await rag_pipeline.query(
            user_id=test_user_id,
            query=query,
            top_k=2
        )
        
        assert len(result["chunks"]) > 0
        print(f"   ✅ '{query}' → {result['count']} results")
    
    # 3. Check cache stats
    print("\n📊 Cache statistics...")
    cache_stats = rag_pipeline.embedder.get_cache_stats()
    print(f"   Cache hits: {cache_stats['hits']}")
    print(f"   Cache misses: {cache_stats['misses']}")
    print(f"   Hit rate: {cache_stats['hit_rate']:.1%}")
    
    assert cache_stats['total_requests'] > 0
    
    print("\n✅ End-to-end test complete!")


if __name__ == "__main__":
    # Run tests
    asyncio.run(test_end_to_end_pipeline(None))
