"""messages_uuid_pk

Switch messages.id from BigInteger autoincrement to UUID (pgcrypto
``gen_random_uuid()``). In dev this migration drops existing rows because
there is no safe way to back-fill UUIDs across a running foreign-key graph
here — and the ``messages`` table has no incoming foreign keys in our schema.

Revision ID: b1a8f2d4c9e3
Revises: d24aa563f150
Create Date: 2026-04-19 11:20:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b1a8f2d4c9e3"
down_revision: str | None = "d24aa563f150"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # No FK references messages.id today; we can wipe and re-create the PK.
    op.execute("TRUNCATE TABLE messages RESTART IDENTITY CASCADE")
    op.drop_column("messages", "id")
    op.add_column(
        "messages",
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
    )
    op.create_primary_key("messages_pkey", "messages", ["id"])


def downgrade() -> None:
    op.execute("TRUNCATE TABLE messages RESTART IDENTITY CASCADE")
    op.drop_column("messages", "id")
    op.add_column(
        "messages",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
    )
    op.create_primary_key("messages_pkey", "messages", ["id"])
