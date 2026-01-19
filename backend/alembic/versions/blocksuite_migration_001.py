"""BlockSuite migration: notes.content TEXT to JSONB + editor_version

Revision ID: blocksuite_migration_001
Revises: 9a6fe7b8092f
Create Date: 2026-01-14

VAULT RULE: Backend stores raw BlockSuite snapshots without modification.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "blocksuite_migration_001"
down_revision = "9a6fe7b8092f"  # Last known migration
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Migrate notes.content from TEXT to JSONB.

    Strategy:
    1. Add editor_version column
    2. Add BLOCKSUITE to noteformat enum
    3. Convert content column from TEXT to JSONB
       - Valid JSON (BlockNote) → preserved as-is
       - Non-JSON (legacy markdown) → wrapped in {"legacy": "..."}
    """
    # 1. Add editor_version column
    op.add_column(
        "notes",
        sa.Column(
            "editor_version",
            sa.String(length=50),
            nullable=True,
            comment="Editor version (e.g., 'blocksuite@1'). NULL = legacy data.",
        ),
    )

    # 2. BLOCKSUITE value handling
    # NOTE: The model uses native_enum=False, so 'format' is stored as VARCHAR.
    # No ALTER TYPE needed - the string 'BLOCKSUITE' can be stored directly.

    # 3. Convert content from TEXT to JSONB
    # First, handle non-JSON content by wrapping in {"legacy": "..."}
    op.execute("""
        UPDATE notes
        SET content = jsonb_build_object('legacy', content)
        WHERE content IS NOT NULL
          AND content != ''
          AND content NOT SIMILAR TO '^[\\[\\{].*$'
    """)

    # Now alter the column type (remaining TEXT should be valid JSON)
    op.execute("""
        ALTER TABLE notes
        ALTER COLUMN content TYPE JSONB
        USING CASE
            WHEN content IS NULL OR content = '' THEN '{}'::jsonb
            WHEN content SIMILAR TO '^[\\[\\{].*$' THEN content::jsonb
            ELSE jsonb_build_object('legacy', content)
        END
    """)

    # 4. Set default for new rows
    op.alter_column(
        "notes",
        "content",
        server_default=sa.text("'{}'::jsonb"),
    )


def downgrade() -> None:
    """Revert JSONB to TEXT (lossy for non-legacy content)."""
    # Convert JSONB back to TEXT
    op.execute("""
        ALTER TABLE notes
        ALTER COLUMN content TYPE TEXT
        USING CASE
            WHEN content ? 'legacy' THEN content->>'legacy'
            ELSE content::text
        END
    """)

    # Remove server default
    op.alter_column("notes", "content", server_default=None)

    # Drop editor_version column
    op.drop_column("notes", "editor_version")

    # Note: Cannot remove BLOCKSUITE from enum easily in PostgreSQL
