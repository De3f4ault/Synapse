"""add content_text to documents

Revision ID: c368ad399481
Revises: 052d2385be9e
Create Date: 2025-11-22 13:44:39.956763+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c368ad399481"
down_revision = "052d2385be9e"
branch_labels = None
depends_on = None

def upgrade() -> None:
    """Add content_text column to documents table."""
    op.add_column(
        'documents',
        sa.Column('content_text', sa.Text(), nullable=True)
    )


def downgrade() -> None:
    """Remove content_text column from documents table."""
    op.drop_column('documents', 'content_text')
