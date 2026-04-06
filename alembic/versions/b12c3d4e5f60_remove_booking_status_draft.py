"""remove booking_status enum value draft

Revision ID: b12c3d4e5f60
Revises: c7f1a2b3d4e5
Create Date: 2026-04-06

"""

from typing import Sequence, Union

from alembic import op


revision: str = "b12c3d4e5f60"
down_revision: Union[str, None] = "c7f1a2b3d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) На всякий случай конвертируем draft -> pending
    op.execute("UPDATE bookings SET status = 'pending' WHERE status = 'draft'")

    # 2) Пересоздаём enum без draft (PostgreSQL не умеет DROP VALUE)
    op.execute("ALTER TABLE bookings ALTER COLUMN status DROP DEFAULT")
    op.execute(
        "CREATE TYPE booking_status_new AS ENUM ('pending', 'confirmed', 'cancelled', 'completed')"
    )
    op.execute(
        "ALTER TABLE bookings ALTER COLUMN status TYPE booking_status_new "
        "USING status::text::booking_status_new"
    )
    op.execute("DROP TYPE booking_status")
    op.execute("ALTER TYPE booking_status_new RENAME TO booking_status")
    op.execute("ALTER TABLE bookings ALTER COLUMN status SET DEFAULT 'pending'")


def downgrade() -> None:
    # Обратная операция: добавляем draft обратно и делаем его возможным значением.
    # Значения не переводим назад автоматически.
    op.execute("ALTER TABLE bookings ALTER COLUMN status DROP DEFAULT")
    op.execute(
        "CREATE TYPE booking_status_old AS ENUM ('draft', 'pending', 'confirmed', 'cancelled', 'completed')"
    )
    op.execute(
        "ALTER TABLE bookings ALTER COLUMN status TYPE booking_status_old "
        "USING status::text::booking_status_old"
    )
    op.execute("DROP TYPE booking_status")
    op.execute("ALTER TYPE booking_status_old RENAME TO booking_status")
    op.execute("ALTER TABLE bookings ALTER COLUMN status SET DEFAULT 'pending'")

