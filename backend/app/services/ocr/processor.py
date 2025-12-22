"""
OCR Processor for Synapse.

Extracts text from scanned PDFs and images using Tesseract/OCRmyPDF.
Based on paperless-ngx RasterisedDocumentParser patterns.

Key features:
- Automatic DPI detection
- Skip-text mode for mixed documents
- Fallback strategy when OCR fails
- Thread management for Celery workers
- Sidecar text extraction
"""

import logging
import os
import re
import shutil
import tempfile
from pathlib import Path
from typing import Optional, Dict, Any

from .config import OcrConfig, OcrMode, OcrCleanMode, ocr_config

logger = logging.getLogger(__name__)


class OcrError(Exception):
    """Base exception for OCR errors."""

    pass


class NoTextFoundError(OcrError):
    """Raised when OCR fails to find any text."""

    pass


class EncryptedPdfError(OcrError):
    """Raised when PDF is encrypted and cannot be processed."""

    pass


class OcrProcessor:
    """
    OCR processor using Tesseract/OCRmyPDF.

    Usage:
        processor = OcrProcessor()
        result = processor.process_file("/path/to/document.pdf")
        print(result["text"])
    """

    # MIME types that can be processed
    SUPPORTED_IMAGE_TYPES = {
        "image/png",
        "image/jpeg",
        "image/tiff",
        "image/bmp",
        "image/gif",
        "image/webp",
    }

    SUPPORTED_PDF_TYPES = {
        "application/pdf",
    }

    # Minimum text length to consider a page as having text
    MIN_TEXT_LENGTH = 50

    def __init__(self, config: Optional[OcrConfig] = None):
        """
        Initialize OCR processor.

        Args:
            config: OCR configuration (uses global config if None)
        """
        self.config = config or ocr_config
        self._tempdir: Optional[str] = None

    @property
    def tempdir(self) -> str:
        """Get or create temporary directory."""
        if self._tempdir is None:
            self._tempdir = tempfile.mkdtemp(prefix="synapse_ocr_")
        return self._tempdir

    def cleanup(self) -> None:
        """Clean up temporary files."""
        if self._tempdir and os.path.exists(self._tempdir):
            shutil.rmtree(self._tempdir)
            self._tempdir = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.cleanup()
        return False

    def is_image(self, mime_type: str) -> bool:
        """Check if MIME type is a supported image."""
        return mime_type in self.SUPPORTED_IMAGE_TYPES

    def is_pdf(self, mime_type: str) -> bool:
        """Check if MIME type is a PDF."""
        return mime_type in self.SUPPORTED_PDF_TYPES

    def can_process(self, mime_type: str) -> bool:
        """Check if file type can be processed."""
        return self.is_image(mime_type) or self.is_pdf(mime_type)

    def get_dpi(self, image_path: str) -> Optional[int]:
        """
        Get DPI from image metadata.

        Args:
            image_path: Path to image file

        Returns:
            DPI value or None if not found
        """
        try:
            from PIL import Image

            with Image.open(image_path) as im:
                dpi = im.info.get("dpi")
                if dpi:
                    return round(dpi[0])
        except Exception as e:
            logger.warning(f"Error getting DPI from {image_path}: {e}")
        return None

    def calculate_a4_dpi(self, image_path: str) -> Optional[int]:
        """
        Estimate DPI based on A4 paper size assumption.

        Args:
            image_path: Path to image file

        Returns:
            Estimated DPI or None
        """
        try:
            from PIL import Image

            with Image.open(image_path) as im:
                width, _ = im.size
                # A4 width = 210mm = 8.27 inches
                dpi = int(width / 8.27)
                logger.debug(f"Estimated DPI {dpi} based on image width {width}")
                return dpi
        except Exception as e:
            logger.warning(f"Error calculating A4 DPI for {image_path}: {e}")
        return None

    def extract_text_from_pdf(self, pdf_path: str) -> Optional[str]:
        """
        Extract existing text from PDF using pdftotext.

        Args:
            pdf_path: Path to PDF file

        Returns:
            Extracted text or None
        """
        try:
            import subprocess

            result = subprocess.run(
                ["pdftotext", "-layout", "-enc", "UTF-8", pdf_path, "-"],
                capture_output=True,
                text=True,
                timeout=60,
            )

            if result.returncode == 0:
                text = self._post_process_text(result.stdout)
                return text
        except Exception as e:
            logger.warning(f"Error extracting text from PDF {pdf_path}: {e}")
        return None

    def _construct_ocrmypdf_args(
        self,
        input_file: str,
        output_file: str,
        sidecar_file: str,
        mime_type: str,
        *,
        force_ocr: bool = False,
    ) -> Dict[str, Any]:
        """
        Construct OCRmyPDF arguments based on config.

        Args:
            input_file: Input file path
            output_file: Output PDF path
            sidecar_file: Sidecar text file path
            mime_type: Input file MIME type
            force_ocr: Force OCR even on text pages

        Returns:
            Dict of ocrmypdf arguments
        """
        # Get thread count from environment (set by Celery)
        threads_per_worker = int(os.getenv("SYNAPSE_THREADS_PER_WORKER", 2))

        args = {
            "input_file": input_file,
            "output_file": output_file,
            "sidecar": sidecar_file,
            # Threading - critical for Celery workers
            "use_threads": True,
            "jobs": threads_per_worker,
            # Language
            "language": self.config.language,
            # Output type
            "output_type": self.config.output_type.value,
            # No progress bar in background tasks
            "progress_bar": False,
        }

        # OCR mode
        if force_ocr or self.config.mode == OcrMode.FORCE:
            args["force_ocr"] = True
        elif self.config.mode == OcrMode.SKIP:
            args["skip_text"] = True
        elif self.config.mode == OcrMode.REDO:
            args["redo_ocr"] = True

        # Image preprocessing
        if self.config.deskew and self.config.mode != OcrMode.REDO:
            args["deskew"] = True

        if self.config.rotate_pages:
            args["rotate_pages"] = True
            args["rotate_pages_threshold"] = self.config.rotate_threshold

        # Cleaning
        if self.config.clean == OcrCleanMode.CLEAN:
            args["clean"] = True
        elif self.config.clean == OcrCleanMode.CLEAN_FINAL:
            if self.config.mode == OcrMode.REDO:
                args["clean"] = True
            else:
                args["clean_final"] = True

        # Image DPI (for images without metadata)
        if self.is_image(mime_type):
            dpi = self.get_dpi(input_file) or self.calculate_a4_dpi(input_file)
            args["image_dpi"] = dpi or self.config.image_dpi

            if args["image_dpi"] < 70:
                logger.warning(f"Image DPI of {args['image_dpi']} is low, OCR may fail")

        # Max image pixels
        if self.config.max_image_pixels is not None:
            args["max_image_mpixels"] = self.config.max_image_pixels / 1_000_000.0

        # User-provided extra args
        if self.config.user_args:
            args.update(self.config.user_args)

        return args

    def _run_ocrmypdf(
        self,
        input_file: str,
        output_file: str,
        sidecar_file: str,
        mime_type: str,
        *,
        force_ocr: bool = False,
    ) -> str:
        """
        Run OCRmyPDF and extract text.

        Args:
            input_file: Input file path
            output_file: Output PDF path
            sidecar_file: Sidecar text file path
            mime_type: Input file MIME type
            force_ocr: Force OCR mode

        Returns:
            Extracted text

        Raises:
            OcrError: On OCR failure
        """
        import ocrmypdf
        from ocrmypdf.exceptions import EncryptedPdfError as OcrEncryptedError
        from ocrmypdf.exceptions import InputFileError

        args = self._construct_ocrmypdf_args(
            input_file,
            output_file,
            sidecar_file,
            mime_type,
            force_ocr=force_ocr,
        )

        logger.debug(f"Running OCRmyPDF with args: {args}")

        try:
            ocrmypdf.ocr(**args)

            # Read text from sidecar file
            if os.path.exists(sidecar_file):
                with open(sidecar_file, "r", encoding="utf-8", errors="replace") as f:
                    text = f.read()
                return self._post_process_text(text)

            # Fallback: extract from output PDF
            return self.extract_text_from_pdf(output_file) or ""

        except OcrEncryptedError as e:
            raise EncryptedPdfError(f"PDF is encrypted: {e}") from e
        except InputFileError as e:
            raise OcrError(f"Invalid input file: {e}") from e
        except Exception as e:
            raise OcrError(f"OCR failed: {e}") from e

    def _post_process_text(self, text: Optional[str]) -> str:
        """
        Clean and normalize extracted text.

        Args:
            text: Raw extracted text

        Returns:
            Cleaned text
        """
        if not text:
            return ""

        # Collapse multiple spaces
        text = re.sub(r"([^\S\r\n]+)", " ", text)
        # Remove leading whitespace on lines
        text = re.sub(r"([\n\r]+)([^\S\n\r]+)", r"\1", text)
        # Remove trailing whitespace
        text = re.sub(r"([^\S\n\r]+)$", "", text)
        # Remove null characters (can cause DB issues)
        text = text.replace("\0", " ")

        return text.strip()

    def process_file(
        self,
        file_path: str,
        mime_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Process a file and extract text using OCR.

        Args:
            file_path: Path to the file
            mime_type: Optional MIME type (auto-detected if None)

        Returns:
            Dict with:
                - text: Extracted text
                - page_count: Number of pages (for PDFs)
                - ocr_performed: Whether OCR was performed
                - method: Extraction method used

        Raises:
            OcrError: On processing failure
        """
        # Set thread limit for Tesseract (critical!)
        os.environ["OMP_THREAD_LIMIT"] = "1"

        if not self.config.enabled:
            return {
                "text": "",
                "page_count": None,
                "ocr_performed": False,
                "method": "disabled",
            }

        # Auto-detect MIME type if not provided
        if mime_type is None:
            import mimetypes

            mime_type, _ = mimetypes.guess_type(file_path)

        if not self.can_process(mime_type):
            raise OcrError(f"Unsupported file type: {mime_type}")

        # For PDFs, try to extract existing text first
        text_original = None
        original_has_text = False

        if self.is_pdf(mime_type):
            text_original = self.extract_text_from_pdf(file_path)
            original_has_text = (
                text_original is not None and len(text_original) > self.config.min_text_length
            )

            # If mode is SKIP and we have text, return it
            if self.config.mode == OcrMode.SKIP and original_has_text:
                logger.info("Document has text, skipping OCR")
                return {
                    "text": text_original,
                    "page_count": self._get_page_count(file_path),
                    "ocr_performed": False,
                    "method": "pdftotext",
                }

        # Run OCR
        output_file = Path(self.tempdir) / "output.pdf"
        sidecar_file = Path(self.tempdir) / "sidecar.txt"

        try:
            text = self._run_ocrmypdf(file_path, str(output_file), str(sidecar_file), mime_type)

            if not text or len(text) < self.config.min_text_length:
                raise NoTextFoundError("No text found in document")

            return {
                "text": text,
                "page_count": self._get_page_count(str(output_file)),
                "ocr_performed": True,
                "method": "ocrmypdf",
            }

        except (NoTextFoundError, OcrError) as e:
            logger.warning(f"OCR failed: {e}. Attempting fallback with force_ocr=True")

            # Fallback: try with force_ocr
            output_file_fallback = Path(self.tempdir) / "output_fallback.pdf"
            sidecar_file_fallback = Path(self.tempdir) / "sidecar_fallback.txt"

            try:
                text = self._run_ocrmypdf(
                    file_path,
                    str(output_file_fallback),
                    str(sidecar_file_fallback),
                    mime_type,
                    force_ocr=True,
                )

                return {
                    "text": text or "",
                    "page_count": self._get_page_count(str(output_file_fallback)),
                    "ocr_performed": True,
                    "method": "ocrmypdf_force",
                }

            except EncryptedPdfError:
                # Can't OCR encrypted PDFs, use original text if available
                if original_has_text:
                    return {
                        "text": text_original,
                        "page_count": self._get_page_count(file_path),
                        "ocr_performed": False,
                        "method": "pdftotext_encrypted",
                    }
                raise

            except Exception as fallback_error:
                logger.error(f"Fallback OCR also failed: {fallback_error}")

                # Last resort: return original text if any
                if original_has_text:
                    return {
                        "text": text_original,
                        "page_count": self._get_page_count(file_path),
                        "ocr_performed": False,
                        "method": "pdftotext_fallback",
                    }

                raise OcrError(f"OCR failed: {fallback_error}") from fallback_error

    def _get_page_count(self, pdf_path: str) -> Optional[int]:
        """Get page count from PDF."""
        try:
            import pikepdf

            with pikepdf.Pdf.open(pdf_path) as pdf:
                return len(pdf.pages)
        except Exception as e:
            logger.warning(f"Error getting page count: {e}")
            return None
