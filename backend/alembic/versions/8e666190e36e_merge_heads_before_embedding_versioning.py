"""Merge heads before embedding versioning

Revision ID: 8e666190e36e
Revises: add_conversation_branching, add_document_content_hash, add_embedding_columns
Create Date: 2026-01-08 04:46:58.683331+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8e666190e36e'
down_revision = ('add_conversation_branching', 'add_document_content_hash', 'add_embedding_columns')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
