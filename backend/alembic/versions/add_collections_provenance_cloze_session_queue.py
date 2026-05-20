"""Add deck collections, card provenance, cloze cards, and session queue.

Revision ID: collections_provenance_cloze
Revises: flashcard_topic_001
Create Date: 2026-04-23

Schema additions (all backward compatible):

  Collections layer
  ─────────────────
  deck_collections          New table — folder/collection hierarchy above Deck
  decks.collection_id       FK → deck_collections (nullable)
  decks.scheduling_algorithm 'sm2' (default) | 'fsrs' — dispatch flag

  Provenance tracking
  ───────────────────
  card_sources              What created each card (document, quiz, note, chat)
  card_prerequisites        Card → Card prerequisite graph (generation-time)

  Cloze card support
  ──────────────────
  flashcards.card_type      'basic' | 'cloze' (server_default='basic')
  flashcards.cloze_answer   The blanked-out answer text for cloze cards

  Session persistence (queue resume)
  ──────────────────────────────────
  study_sessions.deck_id            Which deck this session is focused on
  study_sessions.session_mode       'classic' | 'socratic'
  study_sessions.resume_status      'in_progress' | 'completed' | 'abandoned'
  study_sessions.cards_planned      Ordered queue snapshot at session start
  study_sessions.cards_reviewed_detail Per-card review records
  study_sessions.current_card_index  Position in queue for resume
  study_sessions.last_activity_at   For stale session logic

  Card Tutor thread anchor
  ────────────────────────
  chat_messages.card_id     Which card a Card Tutor message is anchored to
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "collections_provenance_cloze"
down_revision: Union[str, None] = "flashcard_topic_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(conn, name: str) -> bool:
    return name in sa.inspect(conn).get_table_names()


def _column_exists(conn, table: str, column: str) -> bool:
    cols = {c["name"] for c in sa.inspect(conn).get_columns(table)}
    return column in cols


def _index_exists(conn, table: str, index: str) -> bool:
    return index in {i["name"] for i in sa.inspect(conn).get_indexes(table)}


def upgrade() -> None:
    conn = op.get_bind()

    # ── deck_collections ─────────────────────────────────────────────────────
    if not _table_exists(conn, "deck_collections"):
        op.create_table(
            "deck_collections",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "user_id", sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
            ),
            sa.Column("name", sa.String(255), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column(
                "parent_id", sa.Integer(),
                sa.ForeignKey("deck_collections.id", ondelete="SET NULL"), nullable=True,
            ),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                      server_default=sa.text("NOW()")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                      server_default=sa.text("NOW()")),
        )
        op.create_index("ix_deck_collections_user_id", "deck_collections", ["user_id"])
        op.create_index("ix_deck_collections_user_name", "deck_collections",
                        ["user_id", "name"])

    # ── decks.collection_id ──────────────────────────────────────────────────
    if not _column_exists(conn, "decks", "collection_id"):
        op.add_column("decks", sa.Column(
            "collection_id", sa.Integer(),
            sa.ForeignKey("deck_collections.id", ondelete="SET NULL"), nullable=True,
        ))
        op.create_index("ix_decks_collection_id", "decks", ["collection_id"])

    # ── decks.scheduling_algorithm ───────────────────────────────────────────
    if not _column_exists(conn, "decks", "scheduling_algorithm"):
        op.add_column("decks", sa.Column(
            "scheduling_algorithm", sa.String(10),
            nullable=False, server_default="sm2",
        ))

    # ── card_sources ─────────────────────────────────────────────────────────
    if not _table_exists(conn, "card_sources"):
        op.create_table(
            "card_sources",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("card_id", sa.Integer(),
                      sa.ForeignKey("flashcards.id", ondelete="CASCADE"), nullable=False),
            sa.Column("source_type", sa.String(30), nullable=False,
                      comment="'document'|'quiz_question'|'note'|'chat_message'|'card'"),
            sa.Column("source_id", sa.Integer(), nullable=False),
            sa.Column("source_chunk_id", sa.Integer(), nullable=True),
            sa.Column("generation_method", sa.String(30), nullable=False,
                      comment="'ai_generated'|'manual'|'quiz_failure'|'remedial'|'atomized'"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                      server_default=sa.text("NOW()")),
        )
        op.create_index("ix_card_sources_card_id", "card_sources", ["card_id"])
        op.create_index("ix_card_sources_source", "card_sources",
                        ["source_type", "source_id"])

    # ── card_prerequisites ───────────────────────────────────────────────────
    if not _table_exists(conn, "card_prerequisites"):
        op.create_table(
            "card_prerequisites",
            sa.Column("card_id", sa.Integer(),
                      sa.ForeignKey("flashcards.id", ondelete="CASCADE"),
                      nullable=False, primary_key=True),
            sa.Column("prereq_id", sa.Integer(),
                      sa.ForeignKey("flashcards.id", ondelete="CASCADE"),
                      nullable=False, primary_key=True),
        )

    # ── flashcards.card_type ─────────────────────────────────────────────────
    if not _column_exists(conn, "flashcards", "card_type"):
        op.add_column("flashcards", sa.Column(
            "card_type", sa.String(10), nullable=False, server_default="basic",
            comment="'basic' (flip card) or 'cloze' (fill-in-the-blank)",
        ))

    # ── flashcards.cloze_answer ──────────────────────────────────────────────
    if not _column_exists(conn, "flashcards", "cloze_answer"):
        op.add_column("flashcards", sa.Column(
            "cloze_answer", sa.Text(), nullable=True,
            comment="Blanked-out answer for cloze cards. Null for basic cards.",
        ))

    # ── study_sessions extensions ────────────────────────────────────────────
    if _table_exists(conn, "study_sessions"):
        new_cols = [
            ("deck_id", sa.Column(
                "deck_id", sa.Integer(),
                sa.ForeignKey("decks.id", ondelete="SET NULL"), nullable=True,
            )),
            ("session_mode", sa.Column(
                "session_mode", sa.String(20), nullable=False, server_default="classic",
                comment="'classic' | 'socratic'",
            )),
            ("resume_status", sa.Column(
                "resume_status", sa.String(20), nullable=False, server_default="in_progress",
                comment="'in_progress' | 'completed' | 'abandoned'",
            )),
            ("cards_planned", sa.Column(
                "cards_planned", sa.JSON(), nullable=True,
                comment="[{card_id, deck_id}] — ordered queue at session start",
            )),
            ("cards_reviewed_detail", sa.Column(
                "cards_reviewed_detail", sa.JSON(), nullable=True,
                comment="[{card_id, quality, duration_ms, hint_used}] per-card records",
            )),
            ("current_card_index", sa.Column(
                "current_card_index", sa.Integer(), nullable=False, server_default="0",
            )),
            ("last_activity_at", sa.Column(
                "last_activity_at", sa.DateTime(timezone=True), nullable=True,
            )),
        ]
        for col_name, col_def in new_cols:
            if not _column_exists(conn, "study_sessions", col_name):
                op.add_column("study_sessions", col_def)

        if not _index_exists(conn, "study_sessions", "ix_study_sessions_user_resume"):
            op.create_index(
                "ix_study_sessions_user_resume",
                "study_sessions", ["user_id", "resume_status"],
            )

    # ── chat_messages.card_id ────────────────────────────────────────────────
    try:
        if not _column_exists(conn, "chat_messages", "card_id"):
            op.add_column("chat_messages", sa.Column(
                "card_id", sa.Integer(),
                sa.ForeignKey("flashcards.id", ondelete="SET NULL"), nullable=True,
                comment="Card Tutor anchor — which card this message is anchored to",
            ))
    except Exception:
        pass  # chat_messages may not exist in all environments


def downgrade() -> None:
    conn = op.get_bind()

    try:
        if _column_exists(conn, "chat_messages", "card_id"):
            op.drop_column("chat_messages", "card_id")
    except Exception:
        pass

    if _table_exists(conn, "study_sessions"):
        if _index_exists(conn, "study_sessions", "ix_study_sessions_user_resume"):
            op.drop_index("ix_study_sessions_user_resume",
                          table_name="study_sessions")
        for col in ["last_activity_at", "current_card_index", "cards_reviewed_detail",
                    "cards_planned", "resume_status", "session_mode", "deck_id"]:
            if _column_exists(conn, "study_sessions", col):
                op.drop_column("study_sessions", col)

    for col in ["cloze_answer", "card_type"]:
        if _column_exists(conn, "flashcards", col):
            op.drop_column("flashcards", col)

    if _table_exists(conn, "card_prerequisites"):
        op.drop_table("card_prerequisites")

    if _table_exists(conn, "card_sources"):
        op.drop_index("ix_card_sources_source", table_name="card_sources")
        op.drop_index("ix_card_sources_card_id", table_name="card_sources")
        op.drop_table("card_sources")

    if _column_exists(conn, "decks", "scheduling_algorithm"):
        op.drop_column("decks", "scheduling_algorithm")
    if _column_exists(conn, "decks", "collection_id"):
        op.drop_index("ix_decks_collection_id", table_name="decks")
        op.drop_column("decks", "collection_id")

    if _table_exists(conn, "deck_collections"):
        op.drop_index("ix_deck_collections_user_name", table_name="deck_collections")
        op.drop_index("ix_deck_collections_user_id", table_name="deck_collections")
        op.drop_table("deck_collections")
