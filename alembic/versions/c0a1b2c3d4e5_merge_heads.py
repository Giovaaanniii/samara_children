"""merge alembic heads

Revision ID: c0a1b2c3d4e5
Revises: b12c3d4e5f60, f1a2b3c4d5e6
Create Date: 2026-04-06

"""

from typing import Sequence, Union

from alembic import op


revision: str = "c0a1b2c3d4e5"
down_revision: Union[str, tuple[str, ...], None] = ("b12c3d4e5f60", "f1a2b3c4d5e6")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Merge revision — no schema changes.
    pass


def downgrade() -> None:
    # Merge revision — no schema changes.
    pass

