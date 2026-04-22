"""users_default_persona

Add ``users.default_persona_id`` — nullable FK to ``personas.id``. The
frontend lets the user pick one of their personas (or a built-in) as the
one new sessions adopt by default; session creation falls back to it when
no ``persona_id`` is passed in the payload.

``ON DELETE SET NULL`` so deleting a persona silently clears anyone who had
it set as default.

Revision ID: a5c8e92f41d0
Revises: f2b8d14c90a3
Create Date: 2026-04-22 23:10:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a5c8e92f41d0"
down_revision: str | None = "f2b8d14c90a3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("default_persona_id", sa.BigInteger(), nullable=True),
    )
    op.create_foreign_key(
        "fk_users_default_persona_id",
        "users",
        "personas",
        ["default_persona_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_users_default_persona_id", "users", type_="foreignkey")
    op.drop_column("users", "default_persona_id")
