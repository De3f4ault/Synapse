"""
Document processing service.

Handles text extraction from various document formats,
chunking, and preparation for embedding generation.

Enhanced with OCR support for scanned documents and images.
"""

import logging
from pathlib import Path
from typing import Optional, Dict, Any
import re

logger = logging.getLogger(__name__)

# Minimum text length to consider extraction successful
MIN_TEXT_LENGTH = 50


class DocumentProcessor:
    """Process documents to extract text content."""

    def __init__(self, enable_ocr: bool = True):
        """
        Initialize document processor.

        Args:
            enable_ocr: Enable OCR for scanned documents
        """
        self.enable_ocr = enable_ocr
        self.supported_formats = {
            "pdf": self._extract_pdf,
            "txt": self._extract_txt,
            "md": self._extract_txt,
            "docx": self._extract_docx,
            # Image formats (OCR required)
            "png": self._extract_image,
            "jpg": self._extract_image,
            "jpeg": self._extract_image,
            "tiff": self._extract_image,
            "tif": self._extract_image,
            "bmp": self._extract_image,
            "gif": self._extract_image,
            "webp": self._extract_image,
        }

    def process_document(self, file_path: str, file_type: str) -> Dict[str, Any]:
        """
        Process a document and extract its content.

        Args:
            file_path: Path to the document file
            file_type: File extension (pdf, txt, docx, etc.)

        Returns:
            Dictionary containing:
                - content_text: Extracted text
                - page_count: Number of pages (for PDFs)
                - word_count: Number of words
                - metadata: Additional metadata
                - ocr_performed: Whether OCR was used
        """
        # Normalize file type
        file_type = file_type.lower().lstrip(".")

        logger.info(f"Processing document: {file_path} (type: {file_type})")

        if file_type not in self.supported_formats:
            raise ValueError(f"Unsupported file type: {file_type}")

        # Extract text using appropriate method
        extractor = self.supported_formats[file_type]
        result = extractor(file_path)

        # Clean and normalize text
        content_text = self._clean_text(result["content"])

        # Calculate word count
        word_count = len(content_text.split())

        logger.info(
            f"Document processed: {word_count} words, "
            f"{result.get('page_count', 'N/A')} pages, "
            f"OCR: {result.get('ocr_performed', False)}"
        )

        return {
            "content_text": content_text,
            "page_count": result.get("page_count"),
            "word_count": word_count,
            "metadata": result.get("metadata", {}),
            "ocr_performed": result.get("ocr_performed", False),
        }

    def _extract_pdf(self, file_path: str) -> Dict[str, Any]:
        """
        Extract text from PDF file.

        Falls back to OCR if insufficient text is found.
        """
        try:
            from pypdf import PdfReader

            reader = PdfReader(file_path)
            page_count = len(reader.pages)

            # Extract text from all pages
            text_parts = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    text_parts.append(text)

            content = "\n\n".join(text_parts)

            # Extract metadata
            metadata = {}
            if reader.metadata:
                metadata = {
                    "title": reader.metadata.get("/Title"),
                    "author": reader.metadata.get("/Author"),
                    "subject": reader.metadata.get("/Subject"),
                    "creator": reader.metadata.get("/Creator"),
                }

            # Check if we have enough text, or need OCR
            if len(content) < MIN_TEXT_LENGTH and self.enable_ocr:
                logger.info(f"Insufficient text ({len(content)} chars), attempting OCR...")
                ocr_result = self._extract_with_ocr(file_path, "application/pdf")
                if ocr_result:
                    return {
                        "content": ocr_result["text"],
                        "page_count": ocr_result.get("page_count", page_count),
                        "metadata": metadata,
                        "ocr_performed": True,
                    }

            return {
                "content": content,
                "page_count": page_count,
                "metadata": metadata,
                "ocr_performed": False,
            }

        except Exception as e:
            logger.error(f"Error extracting PDF: {str(e)}")
            raise

    def _extract_image(self, file_path: str) -> Dict[str, Any]:
        """Extract text from image using OCR."""
        if not self.enable_ocr:
            raise ValueError("OCR is disabled, cannot process image files")

        # Determine MIME type from extension
        ext = Path(file_path).suffix.lower()
        mime_map = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".tiff": "image/tiff",
            ".tif": "image/tiff",
            ".bmp": "image/bmp",
            ".gif": "image/gif",
            ".webp": "image/webp",
        }
        mime_type = mime_map.get(ext, "image/png")

        ocr_result = self._extract_with_ocr(file_path, mime_type)

        return {
            "content": ocr_result.get("text", ""),
            "page_count": ocr_result.get("page_count", 1),
            "metadata": {},
            "ocr_performed": True,
        }

    def _extract_with_ocr(self, file_path: str, mime_type: str) -> Optional[Dict[str, Any]]:
        """
        Extract text using OCR processor.

        Args:
            file_path: Path to file
            mime_type: MIME type of file

        Returns:
            OCR result dict or None on failure
        """
        try:
            from app.services.ocr import OcrProcessor

            with OcrProcessor() as processor:
                result = processor.process_file(file_path, mime_type)
                return result

        except ImportError:
            logger.warning("OCR service not available (ocrmypdf not installed)")
            return None
        except Exception as e:
            logger.error(f"OCR failed: {e}")
            return None

    def _extract_txt(self, file_path: str) -> Dict[str, Any]:
        """Extract text from plain text file."""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            return {"content": content, "page_count": None, "metadata": {}}

        except UnicodeDecodeError:
            # Try with different encoding
            with open(file_path, "r", encoding="latin-1") as f:
                content = f.read()

            return {"content": content, "page_count": None, "metadata": {}}

    def _extract_docx(self, file_path: str) -> Dict[str, Any]:
        """Extract text from DOCX file."""
        try:
            from docx import Document

            doc = Document(file_path)

            # Extract text from paragraphs
            text_parts = []
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    text_parts.append(paragraph.text)

            # Extract text from tables
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        if cell.text.strip():
                            text_parts.append(cell.text)

            content = "\n\n".join(text_parts)

            # Extract metadata
            metadata = {}
            if doc.core_properties:
                metadata = {
                    "title": doc.core_properties.title,
                    "author": doc.core_properties.author,
                    "subject": doc.core_properties.subject,
                    "keywords": doc.core_properties.keywords,
                }

            return {"content": content, "page_count": None, "metadata": metadata}

        except Exception as e:
            logger.error(f"Error extracting DOCX: {str(e)}")
            raise

    def _clean_text(self, text: str) -> str:
        """
        Clean and normalize extracted text.

        Args:
            text: Raw extracted text

        Returns:
            Cleaned text
        """
        # Remove excessive whitespace
        text = re.sub(r"\s+", " ", text)

        # Remove excessive newlines
        text = re.sub(r"\n{3,}", "\n\n", text)

        # Strip leading/trailing whitespace
        text = text.strip()

        return text

    def chunk_text(
        self, text: str, chunk_size: int = 1000, overlap: int = 200
    ) -> list[Dict[str, Any]]:
        """
        Split text into overlapping chunks for embedding.

        Args:
            text: Text to chunk
            chunk_size: Target chunk size in characters
            overlap: Overlap between chunks in characters

        Returns:
            List of chunk dictionaries with content and metadata
        """
        chunks = []
        start = 0
        chunk_index = 0

        while start < len(text):
            end = start + chunk_size

            # Find the nearest sentence boundary
            if end < len(text):
                # Look for sentence endings
                for punct in [". ", "! ", "? ", "\n\n"]:
                    punct_pos = text.rfind(punct, start, end)
                    if punct_pos != -1:
                        end = punct_pos + len(punct)
                        break

            chunk_text = text[start:end].strip()

            if chunk_text:
                chunks.append(
                    {
                        "content": chunk_text,
                        "chunk_index": chunk_index,
                        "start_char": start,
                        "end_char": end,
                    }
                )
                chunk_index += 1

            # Move start position with overlap
            start = end - overlap

        logger.info(f"Created {len(chunks)} chunks from text")
        return chunks
