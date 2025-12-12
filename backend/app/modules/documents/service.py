"""
Documents Service

Business logic for document operations including:
- Upload and storage
- Text extraction and processing
- Chunking and embedding
- Gemini Files API integration
"""

from typing import Dict, List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from .repository import DocumentRepository
from .processing import extract_text, count_pages, count_words, chunk_text
from .constants import ProcessingStatus, CHUNK_SIZE, CHUNK_OVERLAP


class DocumentService:
    """Service layer for document business logic"""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = DocumentRepository(session)

    async def upload_document(self, user_id: int, file, filename: str, file_type: str) -> Dict:
        """Upload and create document record"""
        from app.models.document import Document

        # Validate file type
        # Save file to storage
        # Create document record with status=PENDING

        document = Document(
            user_id=user_id,
            filename=filename,
            file_path=f"uploads/{user_id}/{filename}",
            file_type=file_type,
            file_size=len(file.read()) if hasattr(file, 'read') else 0,
            processing_status=ProcessingStatus.PENDING
        )

        self.session.add(document)
        await self.session.commit()
        await self.session.refresh(document)

        return self._document_to_dict(document)

    async def process_document(self, document_id: int):
        """Process document: extract text, chunk, embed"""
        from app.models.document import Document
        from app.models.document_chunk import DocumentChunk

        # Get document
        query = select(Document).where(Document.id == document_id)
        result = await self.session.execute(query)
        document = result.scalar_one_or_none()

        if not document:
            raise Exception(f"Document {document_id} not found")

        try:
            # Update status
            document.processing_status = ProcessingStatus.PROCESSING
            await self.session.commit()

            # Extract text
            text = await extract_text(document.file_path, document.file_type)

            # Count pages and words
            page_count = count_pages(document.file_path, document.file_type)
            word_count = count_words(text)

            # Chunk text
            chunks = chunk_text(text, CHUNK_SIZE, CHUNK_OVERLAP)

            # Create chunk records
            for chunk_data in chunks:
                chunk = DocumentChunk(
                    document_id=document.id,
                    content=chunk_data["content"],
                    chunk_index=chunk_data["chunk_index"],
                    start_char=chunk_data["start_char"],
                    end_char=chunk_data["end_char"]
                )
                self.session.add(chunk)

            # Update document
            document.page_count = page_count
            document.word_count = word_count
            document.processing_status = ProcessingStatus.COMPLETED

            await self.session.commit()

        except Exception as e:
            document.processing_status = ProcessingStatus.FAILED
            await self.session.commit()
            raise

    async def get_document(self, document_id: int, user_id: int) -> Dict:
        """Get document by ID"""
        from app.models.document import Document

        query = select(Document).where(
            and_(
                Document.id == document_id,
                Document.user_id == user_id,
                Document.deleted_at.is_(None)
            )
        )

        result = await self.session.execute(query)
        document = result.scalar_one_or_none()

        if not document:
            raise Exception(f"Document {document_id} not found")

        return self._document_to_dict(document)

    async def list_documents(self, user_id: int) -> List[Dict]:
        """List user's documents"""
        from app.models.document import Document

        query = select(Document).where(
            and_(
                Document.user_id == user_id,
                Document.deleted_at.is_(None)
            )
        ).order_by(Document.created_at.desc())

        result = await self.session.execute(query)
        documents = result.scalars().all()

        return [self._document_to_dict(doc) for doc in documents]

    async def delete_document(self, document_id: int, user_id: int):
        """Soft delete document"""
        from app.models.document import Document

        query = select(Document).where(
            and_(
                Document.id == document_id,
                Document.user_id == user_id
            )
        )

        result = await self.session.execute(query)
        document = result.scalar_one_or_none()

        if not document:
            raise Exception("Document not found")

        # Delete chunks
        await self.repository.delete_document_chunks(document_id)

        # Soft delete document
        document.deleted_at = datetime.utcnow()
        await self.session.commit()

    def _document_to_dict(self, document) -> Dict:
        """Convert Document model to dict"""
        return {
            "id": document.id,
            "user_id": document.user_id,
            "filename": document.filename,
            "file_path": document.file_path,
            "file_type": document.file_type,
            "file_size": document.file_size,
            "processing_status": document.processing_status,
            "page_count": document.page_count,
            "word_count": document.word_count,
            "created_at": document.created_at
        }
