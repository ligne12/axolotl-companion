"""sessions_uuid_pk

Switch ``sessions.id`` from BigInteger autoincrement to UUID (pgcrypto
``gen_random_uuid()``), so conversation URLs become opaque. ``messages.session_id``
must follow suit so the foreign key survives. In dev we wipe existing sessions
(and cascade into messages, which were already truncated on the previous
migration) — there is no safe way to back-fill UUIDs while keeping the old
ints meaningful.

Revision ID: c7e9b4f38a21
Revises: b1a8f2d4c9e3
Create Date: 2026-04-19 15:30:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c7e9b4f38a21"
down_revision: str | None = "b1a8f2d4c9e3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Wipe sessions (+ cascade messages). Then swap the PK and FK types.
    op.execute("TRUNCATE TABLE sessions RESTART IDENTITY CASCADE")

    # Drop FK so we can change the referenced column's type.
    op.drop_constraint("messages_session_id_fkey", "messages", type_="foreignkey")

    # sessions.id: BigInteger → UUID
    op.drop_column("sessions", "id")
    op.add_column(
        "sessions",
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
    )
    op.create_primary_key("sessions_pkey", "sessions", ["id"])

    # messages.session_id: BigInteger → UUID
    op.drop_column("messages", "session_id")
    op.add_column(
        "messages",
        sa.Column(
            "session_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
    )
    op.create_index("ix_messages_session_id", "messages", ["session_id"])
    op.create_foreign_key(
        "messages_session_id_fkey",
        "messages",
        "sessions",
        ["session_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.execute("TRUNCATE TABLE sessions RESTART IDENTITY CASCADE")

    op.drop_constraint("messages_session_id_fkey", "messages", type_="foreignkey")
    op.drop_index("ix_messages_session_id", table_name="messages")
    op.drop_column("messages", "session_id")
    op.add_column(
        "messages",
        sa.Column("session_id", sa.BigInteger(), nullable=False),
    )
    op.create_index("ix_messages_session_id", "messages", ["session_id"])

    op.drop_column("sessions", "id")
    op.add_column(
        "sessions",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
    )
    op.create_primary_key("sessions_pkey", "sessions", ["id"])

    op.create_foreign_key(
        "messages_session_id_fkey",
        "messages",
        "sessions",
        ["session_id"],
        ["id"],
        ondelete="CASCADE",
    )
