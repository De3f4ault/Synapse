"""
Ingestion pipeline module.

Provides the PipelineRunner and all standard plugins for
document ingestion in Synapse.

Usage:
    from app.services.ingestion import create_pipeline, IngestDocument

    pipeline = create_pipeline()
    doc = IngestDocument(
        source_path="/tmp/upload.pdf",
        original_filename="invoice.pdf",
        user_id=1,
    )
    result = await pipeline.run(doc)
"""

from .pipeline import PipelineRunner, IngestDocument, ConsumerStatusCode


def create_pipeline() -> PipelineRunner:
    """
    Create a standard ingestion pipeline with all 4 plugins.

    Plugin order: preflight → parse → store → index
    """
    from .plugins.preflight import PreflightPlugin
    from .plugins.parser_plugin import ParserPlugin
    from .plugins.store_plugin import StorePlugin
    from .plugins.index_plugin import IndexPlugin

    runner = PipelineRunner()
    runner.add_plugin(PreflightPlugin())
    runner.add_plugin(ParserPlugin())
    runner.add_plugin(StorePlugin())
    runner.add_plugin(IndexPlugin())
    return runner


__all__ = [
    "PipelineRunner",
    "IngestDocument",
    "ConsumerStatusCode",
    "create_pipeline",
]
