"""PDF parser using PyMuPDF (fitz)."""

from typing import Dict
import fitz  # PyMuPDF
import structlog

from app.core.ai.rag.ingestion.parsers.base_parser import BaseParser

logger = structlog.get_logger(__name__)


class PDFParser(BaseParser):
    """
    Extract text and metadata from PDF files using PyMuPDF.
    
    Features:
    - Fast text extraction
    - Metadata extraction (title, author, page count)
    - Handles multi-page documents
    - Preserves document structure
    """
    
    def parse(self, file_path: str) -> Dict:
        """
        Parse PDF file.
        
        Args:
            file_path: Path to PDF file
        
        Returns:
            Dict with {text, metadata}
        
        Raises:
            FileNotFoundError: If file doesn't exist
            ValueError: If file is not a PDF
        """
        # Validate file
        self._validate_file(file_path, ['.pdf'])
        
        logger.info("parsing_pdf", file=file_path)
        
        # Open PDF
        doc = fitz.open(file_path)
        
        try:
            # Extract text from all pages
            text_parts = []
            for page_num, page in enumerate(doc):
                page_text = page.get_text()
                if page_text.strip():  # Only add non-empty pages
                    text_parts.append(page_text)
            
            full_text = "\n\n".join(text_parts)
            
            # Extract metadata
            metadata = {
                "source_type": "pdf",
                "page_count": len(doc),
                "title": doc.metadata.get("title", "") or file_path.split("/")[-1],
                "author": doc.metadata.get("author", ""),
                "subject": doc.metadata.get("subject", ""),
                "creator": doc.metadata.get("creator", ""),
                "producer": doc.metadata.get("producer", ""),
                "creation_date": doc.metadata.get("creationDate", ""),
                "file_path": file_path
            }
            
            logger.info(
                "pdf_parsed",
                file=file_path,
                pages=metadata["page_count"],
                text_length=len(full_text)
            )
            
            return {
                "text": full_text,
                "metadata": metadata
            }
        
        finally:
            # Always close the document
            doc.close()
