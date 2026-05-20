"""Add pipeline stage statuses: parsing, parsed, chunking.

Extends the processing_status column from the original mixed-case set
(PENDING, PROCESSING, COMPLETED, FAILED) to a unified lowercase 6-value
two-pipeline state machine:

    DMS pipeline:  pending → parsing → parsed
    RAG pipeline:  parsed  → chunking → completed

Backfill strategy (case-insensitive):
  - PROCESSING / processing → parsed  (DMS was running, needs RAG)
  - COMPLETED with chunks   → completed  (both pipelines done — keep)
  - COMPLETED without chunks → parsed   (never embedded, needs RAG)

Revision ID: proc_status_v2
Revises: parent_child_chunking_v1
"""
from alembic import op
import sqlalchemy as sa


revision = "proc_status_v2"
down_revision = "parent_child_chunking_v1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # ── 1. Drop any existing CHECK constraint (uses raw DDL — no Alembic wrapper) ──
    conn.execute(sa.text("""
        DO $$
        DECLARE
            cname text;
        BEGIN
            SELECT con.conname INTO cname
            FROM pg_catalog.pg_constraint con
            JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
            JOIN pg_catalog.pg_namespace nsp ON nsp.oid = rel.relnamespace
            WHERE nsp.nspname = 'public'
              AND rel.relname = 'documents'
              AND con.contype = 'c'
              AND con.conname ILIKE '%processing_status%'
            LIMIT 1;

            IF cname IS NOT NULL THEN
                EXECUTE 'ALTER TABLE documents DROP CONSTRAINT ' || quote_ident(cname);
            END IF;
        END $$;
    """))

    # ── 2. Normalise all existing values to lowercase ──
    conn.execute(sa.text("""
        UPDATE documents
        SET processing_status = LOWER(processing_status)
        WHERE processing_status != LOWER(processing_status);
    """))

    # ── 3. Backfill: processing → parsed ──
    conn.execute(sa.text("""
        UPDATE documents
        SET processing_status = 'parsed'
        WHERE processing_status = 'processing';
    """))

    # ── 4. Backfill: completed rows WITHOUT leaf chunks → parsed ──
    conn.execute(sa.text("""
        UPDATE documents d
        SET processing_status = 'parsed'
        WHERE d.processing_status = 'completed'
          AND NOT EXISTS (
              SELECT 1 FROM document_chunks dc
              WHERE dc.document_id = d.id
                AND dc.is_parent = false
          );
    """))

    # ── 5. Add new CHECK constraint with all 6 lowercase values ──
    conn.execute(sa.text("""
        ALTER TABLE documents
        ADD CONSTRAINT ck_documents_processing_status
        CHECK (processing_status IN (
            'pending', 'parsing', 'parsed', 'chunking', 'completed', 'failed'
        ));
    """))

    # ── Diagnostic: print final counts ──
    result = conn.execute(sa.text(
        "SELECT processing_status, COUNT(*) FROM documents GROUP BY 1 ORDER BY 1"
    ))
    print("\nMigration proc_status_v2 complete:")
    for row in result:
        print(f"  {row[0]:12s}: {row[1]} rows")


def downgrade() -> None:
    conn = op.get_bind()

    # Drop the new constraint
    conn.execute(sa.text("""
        ALTER TABLE documents DROP CONSTRAINT IF EXISTS ck_documents_processing_status;
    """))

    # Reverse backfill: parsed → processing (best approximation for rollback)
    conn.execute(sa.text("""
        UPDATE documents
        SET processing_status = 'processing'
        WHERE processing_status IN ('parsing', 'parsed', 'chunking');
    """))

    # Normalise back to UPPERCASE (original state)
    conn.execute(sa.text("""
        UPDATE documents
        SET processing_status = UPPER(processing_status);
    """))
