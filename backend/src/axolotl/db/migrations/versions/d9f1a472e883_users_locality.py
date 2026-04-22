"""users_locality

Add ``users.locality`` (nullable, up to 80 chars). Feeds the terminal
footer's ``LOCAL · <city>`` tag and future geo-aware features.

Revision ID: d9f1a472e883
Revises: c7e9b4f38a21
Create Date: 2026-04-22 20:30:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d9f1a472e883"
down_revision: str | None = "c7e9b4f38a21"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("locality", sa.String(length=80), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "locality")
