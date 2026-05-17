"""pinned_messages

Add ``pinned_messages`` table. Promotes any assistant message to a
persistent card on ``/home``; the user supplies a short title and the
order is managed via the ``position`` column.

Constraints:
- ``(user_id, message_id)`` is unique — same message can only be pinned
  once per user.
- FK on ``message_id`` cascades on delete so removing the source
  conversation cleans up dangling pins.
- ``(user_id, position)`` index for the ordered-list query that the
  home page issues on every load.

Revision ID: e8a7b3c2d1f0
Revises: c4e0d23a8fb1
Create Date: 2026-05-17 10:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "e8a7b3c2d1f0"
down_revision: str | None = "c4e0d23a8fb1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "pinned_messages",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "message_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("position", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["message_id"], ["messages.id"], ondelete="CASCADE"),
        sa.UniqueConstraint(
            "user_id", "message_id", name="uq_pinned_messages_user_message"
        ),
    )
    op.create_index("ix_pinned_messages_user_id", "pinned_messages", ["user_id"])
    op.create_index(
        "ix_pinned_messages_user_position",
        "pinned_messages",
        ["user_id", "position"],
    )


def downgrade() -> None:
    op.drop_index("ix_pinned_messages_user_position", table_name="pinned_messages")
    op.drop_index("ix_pinned_messages_user_id", table_name="pinned_messages")
    op.drop_table("pinned_messages")
