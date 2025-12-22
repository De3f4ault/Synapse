"""
OCR Configuration for Synapse.

Pydantic settings for OCR processing, based on paperless-ngx patterns.
All settings can be overridden via environment variables.
"""

from enum import Enum
from typing import Optional, Dict, Any
import os

from pydantic import Field
from pydantic_settings import BaseSettings


class OcrMode(str, Enum):
    """OCR processing modes (matches ocrmypdf options)."""

    SKIP = "skip"  # Skip pages with existing text (--skip-text)
    FORCE = "force"  # Rasterize and OCR everything (--force-ocr)
    REDO = "redo"  # Replace existing OCR layer (--redo-ocr)


class OcrCleanMode(str, Enum):
    """Image cleaning modes for OCR."""

    NONE = "none"  # No cleaning
    CLEAN = "clean"  # Clean during OCR (removes noise)
    CLEAN_FINAL = "clean-final"  # Clean only in final output


class OcrOutputType(str, Enum):
    """PDF output types."""

    PDF = "pdf"  # Standard PDF
    PDFA = "pdfa"  # PDF/A for archiving
    PDFA_1 = "pdfa-1"  # PDF/A-1
    PDFA_2 = "pdfa-2"  # PDF/A-2
    PDFA_3 = "pdfa-3"  # PDF/A-3


class OcrConfig(BaseSettings):
    """
    OCR configuration settings.

    Based on paperless-ngx OcrConfig, adapted for Synapse's stack.
    All settings use SYNAPSE_OCR_ prefix for environment variables.
    """

    # Language settings
    language: str = Field(
        default="eng", description="Tesseract language(s), e.g., 'eng', 'deu+eng' for multiple"
    )

    # Processing mode
    mode: OcrMode = Field(
        default=OcrMode.SKIP,
        description="OCR mode: skip (skip text pages), force (OCR everything), redo (replace OCR)",
    )

    # Image settings
    image_dpi: int = Field(
        default=300,
        ge=70,
        le=1200,
        description="Default DPI for images without DPI info (min 300 recommended)",
    )

    # Image preprocessing
    deskew: bool = Field(default=True, description="Straighten tilted scans")

    rotate_pages: bool = Field(
        default=True, description="Auto-rotate pages based on detected text orientation"
    )

    rotate_threshold: float = Field(
        default=12.0, ge=0.0, le=45.0, description="Threshold for page rotation detection (degrees)"
    )

    clean: OcrCleanMode = Field(
        default=OcrCleanMode.CLEAN, description="Image cleaning mode for better OCR"
    )

    # Output settings
    output_type: OcrOutputType = Field(
        default=OcrOutputType.PDF,
        description="Output PDF type (pdf or pdfa variants for archiving)",
    )

    # Performance settings
    max_image_pixels: Optional[int] = Field(
        default=None,
        description="Maximum image size in pixels (None = no limit, 0 = disable limit)",
    )

    # Minimum text threshold
    min_text_length: int = Field(
        default=50, description="Minimum text length to consider a page as having text"
    )

    # Timeout settings
    timeout_per_page: int = Field(default=120, description="Tesseract timeout per page in seconds")

    # Extra arguments for ocrmypdf (JSON format)
    user_args: Optional[Dict[str, Any]] = Field(
        default=None, description="Additional ocrmypdf arguments as dict"
    )

    # Enable/disable OCR
    enabled: bool = Field(default=True, description="Enable OCR processing")

    class Config:
        env_prefix = "SYNAPSE_OCR_"
        env_file = ".env"
        extra = "ignore"


# Singleton instance
ocr_config = OcrConfig()
