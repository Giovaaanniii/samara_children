"""add booking_status enum value pending

Revision ID: c7f1a2b3d4e5
Revises: a8c4e2b91d0f
Create Date: 2026-04-03

"""
from typing import Sequence, Union

from alembic import op


revision: str = "c7f1a2b3d4e5"
down_revision: Union[str, None] = "a8c4e2b91d0f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'pending'")


def downgrade() -> None:
    pass
