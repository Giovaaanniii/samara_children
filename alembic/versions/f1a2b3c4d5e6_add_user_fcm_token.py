"""add users.fcm_token

Revision ID: f1a2b3c4d5e6
Revises: e8a9b0c1d2f3
Create Date: 2026-03-30

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "e8a9b0c1d2f3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("fcm_token", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "fcm_token")
