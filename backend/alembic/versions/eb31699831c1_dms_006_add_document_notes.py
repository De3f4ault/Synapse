"""dms_006_add_document_notes

Revision ID: eb31699831c1
Revises: d6f0a4b57c12
Create Date: 2026-03-18 20:23:19.753978+00:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'eb31699831c1'
down_revision = 'd6f0a4b57c12'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'document_notes',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('note', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_document_notes_document_id'),
        'document_notes',
        ['document_id'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_document_notes_document_id'), table_name='document_notes')
    op.drop_table('document_notes')
