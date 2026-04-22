"""users_time_temp_prefs

Add ``users.time_format`` ('12h' / '24h') and ``users.temperature_unit``
('C' / 'F') — profile-level display preferences surfaced in the Settings
Profile tab and consumed by the terminal footer clock + weather pill.

Revision ID: e4c0a55b21f7
Revises: d9f1a472e883
Create Date: 2026-04-22 21:45:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e4c0a55b21f7"
down_revision: str | None = "d9f1a472e883"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "time_format",
            sa.String(length=3),
            nullable=False,
            server_default="24h",
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "temperature_unit",
            sa.String(length=1),
            nullable=False,
            server_default="C",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "temperature_unit")
    op.drop_column("users", "time_format")
