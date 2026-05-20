"""increase format length

Revision ID: 0e55fd61f54f
Revises: eb2abc73e699
Create Date: 2026-04-27 09:00:13.602368+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0e55fd61f54f'
down_revision = 'eb2abc73e699'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column('notes', 'format',
               existing_type=sa.VARCHAR(length=8),
               type_=sa.VARCHAR(length=16),
               existing_nullable=False)
    op.alter_column('note_versions', 'format',
               existing_type=sa.VARCHAR(length=8),
               type_=sa.VARCHAR(length=16),
               existing_nullable=False)


def downgrade() -> None:
    op.alter_column('notes', 'format',
               existing_type=sa.VARCHAR(length=16),
               type_=sa.VARCHAR(length=8),
               existing_nullable=False)
    op.alter_column('note_versions', 'format',
               existing_type=sa.VARCHAR(length=16),
               type_=sa.VARCHAR(length=8),
               existing_nullable=False)
