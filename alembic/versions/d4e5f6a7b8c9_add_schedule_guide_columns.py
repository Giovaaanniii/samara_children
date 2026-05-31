from typing import Sequence, Union

from alembic import op

revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c0a1b2c3d4e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('ALTER TABLE schedules ADD COLUMN IF NOT EXISTS guide_confirmed_at TIMESTAMPTZ')
    op.execute('ALTER TABLE schedules ADD COLUMN IF NOT EXISTS guide_rejected_at TIMESTAMPTZ')
    op.execute('ALTER TABLE schedules ADD COLUMN IF NOT EXISTS guide_reject_reason TEXT')
    op.execute('ALTER TABLE schedules ADD COLUMN IF NOT EXISTS guide_completed_at TIMESTAMPTZ')
    op.execute(
        '\n        ALTER TABLE schedules\n'
        '        ADD COLUMN IF NOT EXISTS rejected_by_guide_id INTEGER\n'
        '        REFERENCES guides(id) ON DELETE SET NULL\n        '
    )


def downgrade() -> None:
    op.execute('ALTER TABLE schedules DROP COLUMN IF EXISTS rejected_by_guide_id')
    op.execute('ALTER TABLE schedules DROP COLUMN IF EXISTS guide_completed_at')
    op.execute('ALTER TABLE schedules DROP COLUMN IF EXISTS guide_reject_reason')
    op.execute('ALTER TABLE schedules DROP COLUMN IF EXISTS guide_rejected_at')
    op.execute('ALTER TABLE schedules DROP COLUMN IF EXISTS guide_confirmed_at')
