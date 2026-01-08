"""Add has_proposal to conversations

Revision ID: e4f1a9b2c3d5
Revises: 
Create Date: 2025-12-26 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e4f1a9b2c3d5'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add has_proposal column
    # Note: MySQL doesn't support Boolean type natively (it uses TinyInt), 
    # but SQLAlchemy handles this abstraction.
    # We set default=False. Ideally we update existing rows to False.
    op.add_column('conversations', sa.Column('has_proposal', sa.Boolean(), server_default='0', nullable=False))


def downgrade() -> None:
    op.drop_column('conversations', 'has_proposal')
