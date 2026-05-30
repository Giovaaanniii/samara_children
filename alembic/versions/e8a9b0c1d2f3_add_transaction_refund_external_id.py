from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op
revision: str = 'e8a9b0c1d2f3'
down_revision: Union[str, None] = 'c7f1a2b3d4e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('transactions', sa.Column('refund_external_id', sa.String(length=255), nullable=True))

def downgrade() -> None:
    op.drop_column('transactions', 'refund_external_id')
