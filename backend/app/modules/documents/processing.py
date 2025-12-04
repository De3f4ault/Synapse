"""
Document Processing

File extraction and text processing utilities.
Handles extraction from various document formats (PDF, DOCX, TXT, etc.)
"""

import io
from typing import Optional


async def extract_text_from_pdf(file_path: str) -> str:
    """
    Extract text from PDF file.

    Uses PyPDF2 or pdfplumber for text extraction.

    Args:
        file_path: Path to PDF file

    Returns:
        Extracted text

    Raises:
        Exception: If extraction fails
    """
    try:
        import PyPDF2

        with open(file_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = []

            for page_num, page in enumerate(reader.pages):
                try:
                    page_text = page.extract_text()
                    if page_text:
                        text.append(page_text)
                except Exception as e:
                    # Skip pages that fail to extract
                    print(f"Warning: Failed to extract page {page_num}: {e}")
                    continue

            return "\n\n".join(text)

    except ImportError:
        # Fallback to pdfplumber if PyPDF2 not available
        try:
            import pdfplumber

            with pdfplumber.open(file_path) as pdf:
                text = []

                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text.append(page_text)

                return "\n\n".join(text)

        except ImportError:
            raise Exception("PDF extraction library not found. Install PyPDF2 or pdfplumber.")

    except Exception as e:
        raise Exception(f"Failed to extract text from PDF: {str(e)}")


async def extract_text_from_docx(file_path: str) -> str:
    """
    Extract text from DOCX file.

    Uses python-docx library.

    Args:
        file_path: Path to DOCX file

    Returns:
        Extracted text

    Raises:
        Exception: If extraction fails
    """
    try:
        from docx import Document

        doc = Document(file_path)
        text = []

        for paragraph in doc.paragraphs:
            if paragraph.text:
                text.append(paragraph.text)

        return "\n\n".join(text)

    except ImportError:
        raise Exception("DOCX extraction library not found. Install python-docx.")

    except Exception as e:
        raise Exception(f"Failed to extract text from DOCX: {str(e)}")


async def extract_text_from_txt(file_path: str) -> str:
    """
    Extract text from TXT file.

    Attempts UTF-8 decoding with fallbacks.

    Args:
        file_path: Path to TXT file

    Returns:
        Extracted text

    Raises:
        Exception: If extraction fails
    """
    try:
        # Try UTF-8 first
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()

    except UnicodeDecodeError:
        # Fallback to latin-1
        try:
            with open(file_path, 'r', encoding='latin-1') as file:
                return file.read()
        except Exception as e:
            raise Exception(f"Failed to decode text file: {str(e)}")

    except Exception as e:
        raise Exception(f"Failed to read text file: {str(e)}")


async def extract_text_from_epub(file_path: str) -> str:
    """
    Extract text from EPUB file.

    Uses ebooklib and BeautifulSoup.

    Args:
        file_path: Path to EPUB file

    Returns:
        Extracted text

    Raises:
        Exception: If extraction fails
    """
    try:
        import ebooklib
        from ebooklib import epub
        from bs4 import BeautifulSoup

        book = epub.read_epub(file_path)
        text = []

        for item in book.get_items():
            if item.get_type() == ebooklib.ITEM_DOCUMENT:
                soup = BeautifulSoup(item.get_content(), 'html.parser')
                text.append(soup.get_text())

        return "\n\n".join(text)

    except ImportError:
        raise Exception("EPUB extraction libraries not found. Install ebooklib and beautifulsoup4.")

    except Exception as e:
        raise Exception(f"Failed to extract text from EPUB: {str(e)}")


async def extract_text(file_path: str, file_type: str) -> str:
    """
    Extract text from file based on type.

    Routes to appropriate extraction function based on file extension.

    Args:
        file_path: Path to file
        file_type: File extension (e.g., '.pdf', '.docx')

    Returns:
        Extracted text

    Raises:
        Exception: If file type not supported or extraction fails
    """
    file_type = file_type.lower()

    if file_type == '.pdf':
        return await extract_text_from_pdf(file_path)

    elif file_type == '.docx':
        return await extract_text_from_docx(file_path)

    elif file_type in ['.txt', '.md']:
        return await extract_text_from_txt(file_path)

    elif file_type == '.epub':
        return await extract_text_from_epub(file_path)

    else:
        raise Exception(f"Unsupported file type: {file_type}")


def count_pages(file_path: str, file_type: str) -> Optional[int]:
    """
    Count pages in document (if applicable).

    Args:
        file_path: Path to file
        file_type: File extension

    Returns:
        Number of pages or None if not applicable
    """
    file_type = file_type.lower()

    try:
        if file_type == '.pdf':
            import PyPDF2

            with open(file_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                return len(reader.pages)

        elif file_type == '.docx':
            # DOCX doesn't have clear page concept
            # Could estimate based on content
            return None

        else:
            return None

    except Exception:
        return None


def count_words(text: str) -> int:
    """
    Count words in text.

    Args:
        text: Text to count words in

    Returns:
        Number of words
    """
    return len(text.split())


def chunk_text(text: str, chunk_size: int = 512, overlap: int = 50) -> list[dict]:
    """
    Chunk text into overlapping segments.

    Args:
        text: Text to chunk
        chunk_size: Maximum characters per chunk
        overlap: Character overlap between chunks

    Returns:
        List of dicts with chunk_index, content, start_char, end_char
    """
    chunks = []
    start = 0
    chunk_index = 0

    while start < len(text):
        end = start + chunk_size

        # Find sentence boundary if possible
        if end < len(text):
            # Look for sentence end (., !, ?) in last 100 chars
            sentence_end = text.rfind('.', end - 100, end)
            if sentence_end == -1:
                sentence_end = text.rfind('!', end - 100, end)
            if sentence_end == -1:
                sentence_end = text.rfind('?', end - 100, end)

            if sentence_end != -1:
                end = sentence_end + 1

        chunk_text = text[start:end].strip()

        if chunk_text:  # Only add non-empty chunks
            chunks.append({
                "chunk_index": chunk_index,
                "content": chunk_text,
                "start_char": start,
                "end_char": end
            })
            chunk_index += 1

        # Move start position with overlap
        start = end - overlap

    return chunks
