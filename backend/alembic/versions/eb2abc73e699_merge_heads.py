"""merge heads

Revision ID: eb2abc73e699
Revises: collections_provenance_cloze, add_notes_content_text
Create Date: 2026-04-27 08:59:08.867881+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'eb2abc73e699'
down_revision = ('collections_provenance_cloze', 'add_notes_content_text')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
