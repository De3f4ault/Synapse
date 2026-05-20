"""Convert agent_metrics from UNLOGGED to LOGGED.

BACKGROUND:
    agent_metrics was declared UNLOGGED for a 2x write performance boost
    (no WAL overhead). That tradeoff made sense for ephemeral diagnostics.

    It no longer makes sense now that we need historical ReAct loop profiling
    for the Admin Dashboard. Converting to LOGGED:
    - Data survives server restarts (previously wiped on crash)
    - Table enters the WAL stream → replicates to the Logical Replica
    - Agent diagnostics move from Primary-only to a MATERIALIZED VIEW on Replica

    The performance delta (~40-50% slower writes) is negligible against the
    500ms–3s LLM round-trip that precedes every INSERT.

SEQUENCING:
    Run this migration Replica-first using:
        make migrate-safe
    or manually:
        ALEMBIC_TARGET=replica alembic upgrade head
        alembic upgrade head

    After applying to Primary, run on Primary:
        ALTER PUBLICATION synapse_telemetry_pub ADD TABLE agent_metrics;

Revision ID: f7e3a2b1c9d0
Revises: (latest head)
Create Date: 2026-05-14
"""

from alembic import op

# revision identifiers, used by Alembic
revision = "f7e3a2b1c9d0"
down_revision = "proc_status_v2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Convert agent_metrics from UNLOGGED to LOGGED.

    ALTER TABLE ... SET LOGGED does not destroy data, does not require a
    table rebuild, and takes effect immediately. PostgreSQL rewrites the
    table's relation options and the table becomes a WAL participant from
    the next write onward.
    """
    op.execute("ALTER TABLE agent_metrics SET LOGGED")


def downgrade() -> None:
    """
    Revert agent_metrics back to UNLOGGED.

    Only do this if you explicitly want to trade historical data persistence
    for write performance and no longer need the Admin Dashboard agent panel.
    This will also remove the table from any active replication publication.
    """
    op.execute("ALTER TABLE agent_metrics SET UNLOGGED")
