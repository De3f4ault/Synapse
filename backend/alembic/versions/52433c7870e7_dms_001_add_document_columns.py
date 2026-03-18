"""dms_001_add_document_columns

Add DMS Phase 1 columns to the documents table:
- mime_type: detected MIME type for parser dispatch
- archive_path: path to PDF/A archive copy
- archive_checksum: SHA-256 of archive file
- original_filename: filename as uploaded (before renaming)
- archive_serial_number: sequential ASN for physical filing
- created_date: document date extracted by parser

Revision ID: 52433c7870e7
Revises: add_link_constraints_001
Create Date: 2026-03-14 13:52:30.726109+00:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '52433c7870e7'
down_revision = 'add_link_constraints_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # DMS Phase 1: Add document management columns
    op.add_column('documents', sa.Column('mime_type', sa.String(length=255), nullable=True))
    op.add_column('documents', sa.Column('archive_path', sa.String(length=500), nullable=True))
    op.add_column('documents', sa.Column('archive_checksum', sa.String(length=64), nullable=True))
    op.add_column('documents', sa.Column('original_filename', sa.String(length=255), nullable=True))
    op.add_column('documents', sa.Column('archive_serial_number', sa.Integer(), nullable=True))
    op.add_column('documents', sa.Column('created_date', sa.Date(), nullable=True))

    # Indexes
    op.create_index(op.f('ix_documents_mime_type'), 'documents', ['mime_type'], unique=False)
    op.create_unique_constraint('uq_documents_archive_serial_number', 'documents', ['archive_serial_number'])


def downgrade() -> None:
    # Remove DMS columns
    op.drop_constraint('uq_documents_archive_serial_number', 'documents', type_='unique')
    op.drop_index(op.f('ix_documents_mime_type'), table_name='documents')

    op.drop_column('documents', 'created_date')
    op.drop_column('documents', 'archive_serial_number')
    op.drop_column('documents', 'original_filename')
    op.drop_column('documents', 'archive_checksum')
    op.drop_column('documents', 'archive_path')
    op.drop_column('documents', 'mime_type')
