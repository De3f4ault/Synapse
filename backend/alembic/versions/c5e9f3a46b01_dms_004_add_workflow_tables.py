"""DMS 004: Add workflow automation tables

Creates the workflow engine schema:
  - workflow_triggers: 24 columns (trigger conditions)
  - workflow_actions: 22 columns (action definitions)
  - workflows: 7 columns (parent container)
  - workflow_workflow_triggers: M2M association
  - workflow_workflow_actions: M2M association
  - workflow_runs: audit log with 3 indexes

Revision ID: c5e9f3a46b01
Revises: b4d8e2f35a90
Create Date: 2026-03-15
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "c5e9f3a46b01"
down_revision = "b4d8e2f35a90"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ---------------------------------------------------------------
    # 1. workflow_triggers — trigger conditions
    # ---------------------------------------------------------------
    op.create_table(
        "workflow_triggers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("type", sa.Integer(), nullable=False, server_default="1"),
        # Source filters
        sa.Column("filter_sources", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("filter_filename", sa.String(256), nullable=True),
        sa.Column("filter_path", sa.String(256), nullable=True),
        # Content matching
        sa.Column("match", sa.String(256), nullable=True, server_default=""),
        sa.Column("matching_algorithm", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_insensitive", sa.Boolean(), nullable=False, server_default="true"),
        # Tag filters (ARRAY instead of M2M)
        sa.Column("filter_has_tag_ids", postgresql.ARRAY(sa.Integer()), nullable=True),
        sa.Column("filter_has_all_tag_ids", postgresql.ARRAY(sa.Integer()), nullable=True),
        sa.Column("filter_has_not_tag_ids", postgresql.ARRAY(sa.Integer()), nullable=True),
        # Document type filter
        sa.Column("filter_has_document_type_id", sa.Integer(), nullable=True),
        sa.Column("filter_has_not_document_type_ids", postgresql.ARRAY(sa.Integer()), nullable=True),
        # Correspondent filter
        sa.Column("filter_has_correspondent_id", sa.Integer(), nullable=True),
        sa.Column("filter_has_not_correspondent_ids", postgresql.ARRAY(sa.Integer()), nullable=True),
        # Storage path filter
        sa.Column("filter_has_storage_path_id", sa.Integer(), nullable=True),
        sa.Column("filter_has_not_storage_path_ids", postgresql.ARRAY(sa.Integer()), nullable=True),
        # Schedule config
        sa.Column("schedule_date_field", sa.String(20), nullable=True, server_default="added"),
        sa.Column("schedule_offset_days", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("schedule_is_recurring", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("schedule_recurring_interval_days", sa.Integer(), nullable=False, server_default="1"),
        # Ownership + timestamps
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        # Constraints
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["filter_has_document_type_id"], ["document_types.id"], ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["filter_has_correspondent_id"], ["correspondents.id"], ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["filter_has_storage_path_id"], ["storage_paths.id"], ondelete="SET NULL",
        ),
    )

    # ---------------------------------------------------------------
    # 2. workflow_actions — action definitions
    # ---------------------------------------------------------------
    op.create_table(
        "workflow_actions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("type", sa.Integer(), nullable=False, server_default="1"),
        # Assignment fields
        sa.Column("assign_title", sa.String(256), nullable=True),
        sa.Column("assign_tag_ids", postgresql.ARRAY(sa.Integer()), nullable=True),
        sa.Column("assign_correspondent_id", sa.Integer(), nullable=True),
        sa.Column("assign_document_type_id", sa.Integer(), nullable=True),
        sa.Column("assign_storage_path_id", sa.Integer(), nullable=True),
        sa.Column("assign_owner_id", sa.Integer(), nullable=True),
        # Removal fields
        sa.Column("remove_tag_ids", postgresql.ARRAY(sa.Integer()), nullable=True),
        sa.Column("remove_all_tags", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("remove_correspondent", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("remove_document_type", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("remove_storage_path", sa.Boolean(), nullable=False, server_default="false"),
        # Email fields (inlined from WorkflowActionEmail)
        sa.Column("email_subject", sa.String(256), nullable=True),
        sa.Column("email_body", sa.Text(), nullable=True),
        sa.Column("email_to", sa.String(512), nullable=True),
        # Webhook fields (inlined from WorkflowActionWebhook)
        sa.Column("webhook_url", sa.String(256), nullable=True),
        sa.Column("webhook_headers", postgresql.JSONB(), nullable=True),
        sa.Column("webhook_body", postgresql.JSONB(), nullable=True),
        # Ownership + timestamps
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        # Constraints
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["assign_correspondent_id"], ["correspondents.id"], ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["assign_document_type_id"], ["document_types.id"], ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["assign_storage_path_id"], ["storage_paths.id"], ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["assign_owner_id"], ["users.id"], ondelete="SET NULL",
        ),
    )

    # ---------------------------------------------------------------
    # 3. workflows — parent container
    # ---------------------------------------------------------------
    op.create_table(
        "workflows",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(256), nullable=False, unique=True),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        # Constraints
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_workflows_user_id", "workflows", ["user_id"])

    # ---------------------------------------------------------------
    # 4. workflow_workflow_triggers — M2M: workflow ↔ triggers
    # ---------------------------------------------------------------
    op.create_table(
        "workflow_workflow_triggers",
        sa.Column("workflow_id", sa.Integer(), nullable=False),
        sa.Column("trigger_id", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("workflow_id", "trigger_id"),
        sa.ForeignKeyConstraint(
            ["workflow_id"], ["workflows.id"], ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["trigger_id"], ["workflow_triggers.id"], ondelete="CASCADE",
        ),
    )

    # ---------------------------------------------------------------
    # 5. workflow_workflow_actions — M2M: workflow ↔ actions
    # ---------------------------------------------------------------
    op.create_table(
        "workflow_workflow_actions",
        sa.Column("workflow_id", sa.Integer(), nullable=False),
        sa.Column("action_id", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("workflow_id", "action_id"),
        sa.ForeignKeyConstraint(
            ["workflow_id"], ["workflows.id"], ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["action_id"], ["workflow_actions.id"], ondelete="CASCADE",
        ),
    )

    # ---------------------------------------------------------------
    # 6. workflow_runs — execution audit log
    # ---------------------------------------------------------------
    op.create_table(
        "workflow_runs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("workflow_id", sa.Integer(), nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=True),
        sa.Column("trigger_type", sa.Integer(), nullable=False),
        sa.Column("run_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        # Constraints
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["workflow_id"], ["workflows.id"], ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["document_id"], ["documents.id"], ondelete="CASCADE",
        ),
    )
    op.create_index("ix_workflow_runs_workflow", "workflow_runs", ["workflow_id"])
    op.create_index("ix_workflow_runs_document", "workflow_runs", ["document_id"])
    op.create_index("ix_workflow_runs_run_at", "workflow_runs", ["run_at"])


def downgrade() -> None:
    # Drop in reverse dependency order
    op.drop_index("ix_workflow_runs_run_at", table_name="workflow_runs")
    op.drop_index("ix_workflow_runs_document", table_name="workflow_runs")
    op.drop_index("ix_workflow_runs_workflow", table_name="workflow_runs")
    op.drop_table("workflow_runs")
    op.drop_table("workflow_workflow_actions")
    op.drop_table("workflow_workflow_triggers")
    op.drop_index("ix_workflows_user_id", table_name="workflows")
    op.drop_table("workflows")
    op.drop_table("workflow_actions")
    op.drop_table("workflow_triggers")
