"""user_defaults_session_overrides

Add ``users.defaults`` and ``sessions.overrides`` JSONB columns, both default
``{}``. Holds the partial hyperparameter maps used to layer
``settings`` → ``user.defaults`` → ``session.overrides`` at chat time.

Revision ID: f2b8d14c90a3
Revises: e4c0a55b21f7
Create Date: 2026-04-22 22:30:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "f2b8d14c90a3"
down_revision: str | None = "e4c0a55b21f7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "defaults",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.add_column(
        "sessions",
        sa.Column(
            "overrides",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column("sessions", "overrides")
    op.drop_column("users", "defaults")
