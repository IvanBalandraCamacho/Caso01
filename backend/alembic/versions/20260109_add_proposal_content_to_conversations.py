"""Add proposal_content to conversations

Revision ID: a1b2c3d4e5f6
Revises: d7f1dfa45879
Create Date: 2026-01-09 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'd7f1dfa45879'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add proposal_content column to store the generated proposal markdown
    # This makes proposal persistence more robust than searching through messages
    op.add_column(
        'conversations', 
        sa.Column('proposal_content', sa.Text(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('conversations', 'proposal_content')
