"""mcp_servers

Add ``mcp_servers`` table for user-defined Model Context Protocol endpoints.
Each row carries the connection details (url + transport), the bearer token
encrypted at rest via Fernet (``auth_token_cipher``), the last-synced tool
list (``synced_tools`` JSONB), and last-sync diagnostics.

Revision ID: c4e0d23a8fb1
Revises: a5c8e92f41d0
Create Date: 2026-04-26 09:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "c4e0d23a8fb1"
down_revision: str | None = "a5c8e92f41d0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "mcp_servers",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("url", sa.String(length=500), nullable=False),
        sa.Column("transport", sa.String(length=10), nullable=False, server_default="http"),
        sa.Column("auth_token_cipher", sa.String(length=500), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "synced_tools",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_sync_error", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "name", name="uq_mcp_servers_user_name"),
    )
    op.create_index("ix_mcp_servers_user_id", "mcp_servers", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_mcp_servers_user_id", table_name="mcp_servers")
    op.drop_table("mcp_servers")
