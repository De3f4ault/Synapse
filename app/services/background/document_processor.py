"""
Document processing service.

Handles text extraction from various document formats,
chunking, and preparation for embedding generation.
"""

import logging
from pathlib import Path
from typing import Optional, Dict, Any
import re

logger = logging.getLogger(__name__)


class DocumentProcessor:
    """Process documents to extract text content."""

    def __init__(self):
        """Initialize document processor."""
        self.supported_formats = {
            "pdf": self._extract_pdf,
            "txt": self._extract_txt,
            "md": self._extract_txt,
            "docx": self._extract_docx,
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
        """
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
            f"{result.get('page_count', 'N/A')} pages"
        )

        return {
            "content_text": content_text,
            "page_count": result.get("page_count"),
            "word_count": word_count,
            "metadata": result.get("metadata", {})
        }

    def _extract_pdf(self, file_path: str) -> Dict[str, Any]:
        """Extract text from PDF file."""
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

            return {
                "content": content,
                "page_count": page_count,
                "metadata": metadata
            }

        except Exception as e:
            logger.error(f"Error extracting PDF: {str(e)}")
            raise

    def _extract_txt(self, file_path: str) -> Dict[str, Any]:
        """Extract text from plain text file."""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            return {
                "content": content,
                "page_count": None,
                "metadata": {}
            }

        except UnicodeDecodeError:
            # Try with different encoding
            with open(file_path, "r", encoding="latin-1") as f:
                content = f.read()

            return {
                "content": content,
                "page_count": None,
                "metadata": {}
            }

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

            return {
                "content": content,
                "page_count": None,
                "metadata": metadata
            }

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
        text = re.sub(r'\s+', ' ', text)

        # Remove excessive newlines
        text = re.sub(r'\n{3,}', '\n\n', text)

        # Strip leading/trailing whitespace
        text = text.strip()

        return text

    def chunk_text(
        self,
        text: str,
        chunk_size: int = 1000,
        overlap: int = 200
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
                for punct in ['. ', '! ', '? ', '\n\n']:
                    punct_pos = text.rfind(punct, start, end)
                    if punct_pos != -1:
                        end = punct_pos + len(punct)
                        break

            chunk_text = text[start:end].strip()

            if chunk_text:
                chunks.append({
                    "content": chunk_text,
                    "chunk_index": chunk_index,
                    "start_char": start,
                    "end_char": end,
                })
                chunk_index += 1

            # Move start position with overlap
            start = end - overlap

        logger.info(f"Created {len(chunks)} chunks from text")
        return chunks
