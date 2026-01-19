"""merge_question_learning_states_and_activity_logs_fix

Revision ID: 00370989f385
Revises: add_question_learning_states, fix_activity_logs_columns
Create Date: 2026-01-16 05:27:25.979251+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '00370989f385'
down_revision = ('add_question_learning_states', 'fix_activity_logs_columns')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
