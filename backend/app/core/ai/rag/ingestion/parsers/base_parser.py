"""Base parser interface."""

from abc import ABC, abstractmethod
from typing import Dict
from pathlib import Path


class BaseParser(ABC):
    """
    Abstract base class for document parsers.
    
    All parsers should implement the parse method.
    """
    
    @abstractmethod
    def parse(self, file_path: str) -> Dict:
        """
        Parse document file.
        
        Args:
            file_path: Path to file
        
        Returns:
            Dict with {text, metadata}
            - text: Extracted text content
            - metadata: Document metadata (title, author, page_count, etc.)
        """
        pass
    
    def _validate_file(self, file_path: str, extensions: list):
        """
        Validate file exists and has correct extension.
        
        Args:
            file_path: Path to file
            extensions: List of valid extensions (e.g., ['.pdf', '.txt'])
        
        Raises:
            FileNotFoundError: If file doesn't exist
            ValueError: If file extension is invalid
        """
        path = Path(file_path)
        
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        if path.suffix.lower() not in extensions:
            raise ValueError(
                f"Invalid file type: {path.suffix}. "
                f"Expected one of: {extensions}"
            )
