"""SQLModel definitions for all tables."""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import JSON, BigInteger, Column, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy import String as SAString
from sqlalchemy.dialects.postgresql import CITEXT, JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlmodel import Field, Relationship, SQLModel


def utcnow() -> datetime:
    """Timezone-aware UTC now (DB-friendly default)."""
    return datetime.now(UTC)


# -----------------------------------------------------------------------------
# User
# -----------------------------------------------------------------------------
class User(SQLModel, table=True):
    __tablename__ = "users"

    id: int | None = Field(
        default=None,
        sa_column=Column(BigInteger, primary_key=True, autoincrement=True),
    )
    username: str = Field(
        sa_column=Column(CITEXT, unique=True, nullable=False, index=True),
        min_length=3,
        max_length=50,
    )
    email: str = Field(
        sa_column=Column(CITEXT, unique=True, nullable=False, index=True),
        max_length=255,
    )
    password_hash: str = Field(sa_column=Column(SAString(255), nullable=False))
    avatar_url: str | None = Field(default=None, max_length=500)
    locality: str | None = Field(default=None, max_length=80)
    time_format: str = Field(default="24h", max_length=3)
    temperature_unit: str = Field(default="C", max_length=1)
    defaults: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )

    sessions: list["Session"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
    personas: list["Persona"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
    refresh_tokens: list["RefreshToken"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


# -----------------------------------------------------------------------------
# Persona
# -----------------------------------------------------------------------------
class Persona(SQLModel, table=True):
    __tablename__ = "personas"

    id: int | None = Field(
        default=None,
        sa_column=Column(BigInteger, primary_key=True, autoincrement=True),
    )
    user_id: int | None = Field(foreign_key="users.id", index=True, default=None)
    name: str = Field(max_length=100)
    system_prompt: str
    params: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False),
    )
    is_builtin: bool = Field(default=False)
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )

    user: User | None = Relationship(back_populates="personas")
    sessions: list["Session"] = Relationship(back_populates="persona")


# -----------------------------------------------------------------------------
# Session (conversation)
# -----------------------------------------------------------------------------
class Session(SQLModel, table=True):
    __tablename__ = "sessions"

    id: UUID = Field(
        default_factory=uuid4,
        sa_column=Column(PG_UUID(as_uuid=True), primary_key=True),
    )
    user_id: int = Field(foreign_key="users.id", nullable=False)
    persona_id: int | None = Field(default=None, foreign_key="personas.id")
    title: str = Field(default="New conversation", max_length=200)
    model: str | None = Field(default=None, max_length=100)
    overrides: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )
    archived: bool = Field(default=False)
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )

    user: User = Relationship(back_populates="sessions")
    persona: Persona | None = Relationship(back_populates="sessions")
    messages: list["Message"] = Relationship(
        back_populates="session",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "order_by": "Message.created_at",
        },
    )

    __table_args__ = (Index("ix_sessions_user_updated", "user_id", "updated_at"),)


# -----------------------------------------------------------------------------
# Message
# -----------------------------------------------------------------------------
class Message(SQLModel, table=True):
    __tablename__ = "messages"

    id: UUID = Field(
        default_factory=uuid4,
        sa_column=Column(PG_UUID(as_uuid=True), primary_key=True),
    )
    session_id: UUID = Field(
        sa_column=Column(
            PG_UUID(as_uuid=True),
            ForeignKey("sessions.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )
    role: str = Field(max_length=20)  # user | assistant | tool | system
    content: str | None = None
    reasoning: str | None = None
    tool_calls: list[dict[str, Any]] | None = Field(
        default=None,
        sa_column=Column(JSON, nullable=True),
    )
    tool_call_id: str | None = Field(default=None, max_length=100)
    message_metadata: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column("metadata", JSON, nullable=False),
    )
    token_count: int | None = None
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False, index=True),
    )

    session: Session = Relationship(back_populates="messages")


# -----------------------------------------------------------------------------
# Setting (per-user key-value store)
# -----------------------------------------------------------------------------
class Setting(SQLModel, table=True):
    __tablename__ = "settings"

    user_id: int = Field(foreign_key="users.id", primary_key=True)
    key: str = Field(primary_key=True, max_length=100)
    value: dict[str, Any] = Field(sa_column=Column(JSON, nullable=False))
    updated_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


# -----------------------------------------------------------------------------
# RefreshToken
# -----------------------------------------------------------------------------
class RefreshToken(SQLModel, table=True):
    __tablename__ = "refresh_tokens"

    id: int | None = Field(
        default=None,
        sa_column=Column(BigInteger, primary_key=True, autoincrement=True),
    )
    user_id: int = Field(foreign_key="users.id", nullable=False, index=True)
    token_hash: str = Field(max_length=255)
    expires_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    revoked_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )

    user: User = Relationship(back_populates="refresh_tokens")

    __table_args__ = (UniqueConstraint("token_hash", name="uq_refresh_token_hash"),)
