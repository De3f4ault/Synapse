"""
OCR Services Package.

Provides OCR capabilities for Synapse using Tesseract/OCRmyPDF.
Based on paperless-ngx implementation patterns.
"""

from .config import OcrConfig, OcrMode, OcrCleanMode, OcrOutputType, ocr_config
from .processor import OcrProcessor

__all__ = [
    "OcrConfig",
    "OcrMode",
    "OcrCleanMode",
    "OcrOutputType",
    "ocr_config",
    "OcrProcessor",
]
