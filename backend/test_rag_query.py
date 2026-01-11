#!/usr/bin/env python
"""Benchmark RAG retrieval latency: Qdrant."""

import time
from qdrant_client import QdrantClient


def main():
    # Pre-load embedder
    print("Loading embedder...")
    t0 = time.perf_counter()
    from app.core.ai.rag.embeddings.models.all_minilm import AllMiniLMEmbedder

    embedder = AllMiniLMEmbedder()
    load_time = time.perf_counter() - t0
    print(f"  Embedder load: {load_time:.2f}s\n")

    query = "What is a hash table and how does it work?"
    print(f"Query: {query}")
    print("=" * 70)

    # Generate embedding
    t1 = time.perf_counter()
    query_embedding = embedder.encode([query], normalize=True)[0].tolist()
    embed_time = time.perf_counter() - t1
    print(f"\n1. Embedding generation: {embed_time * 1000:.1f} ms")

    # --- Qdrant Search ---
    print("\n--- QDRANT (Documents - ~1,097 chunks) ---")
    client = QdrantClient(host="localhost", port=6333)

    # Run multiple queries to get average
    times = []
    for i in range(5):
        t2 = time.perf_counter()
        results = client.query_points(
            collection_name="synapse_v2_user_1_documents",
            query=query_embedding,
            limit=5,
            with_payload=True,
        ).points
        elapsed = time.perf_counter() - t2
        times.append(elapsed)

    avg_time = sum(times) / len(times)
    min_time = min(times)
    max_time = max(times)

    print(f"  Avg search time: {avg_time * 1000:.1f} ms")
    print(f"  Min: {min_time * 1000:.1f} ms, Max: {max_time * 1000:.1f} ms")
    print(f"  Results: {len(results)} (top score: {results[0].score:.4f})")

    # Show top result
    print(f"\n  Top result preview:")
    print(f"  {results[0].payload.get('text', '')[:150]}...")

    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"  Embedding generation:   {embed_time * 1000:.1f} ms")
    print(f"  Qdrant search (avg):    {avg_time * 1000:.1f} ms")
    print(f"  TOTAL query time:       {(embed_time + avg_time) * 1000:.1f} ms")


if __name__ == "__main__":
    main()
