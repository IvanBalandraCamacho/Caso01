"""Add proposal tracking fields to workspaces

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2026-01-10 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6g7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add proposal tracking fields to workspaces table
    # Fase 1.1 - Gestion de Estado de Propuestas
    
    # Estado de la propuesta: pending, sent, accepted, rejected, won, lost
    op.add_column(
        'workspaces', 
        sa.Column('proposal_status', sa.String(20), nullable=True, server_default='pending')
    )
    
    # Fecha cuando se envio la propuesta
    op.add_column(
        'workspaces',
        sa.Column('proposal_sent_at', sa.DateTime(timezone=True), nullable=True)
    )
    
    # ID de propuesta comercial TIVIT (TVT-XXXX)
    op.add_column(
        'workspaces',
        sa.Column('tvt_id', sa.String(50), nullable=True)
    )
    
    # Tipo de RFP: security, technology, infrastructure, development, consulting, other
    op.add_column(
        'workspaces',
        sa.Column('rfp_type', sa.String(50), nullable=True, server_default='other')
    )


def downgrade() -> None:
    op.drop_column('workspaces', 'rfp_type')
    op.drop_column('workspaces', 'tvt_id')
    op.drop_column('workspaces', 'proposal_sent_at')
    op.drop_column('workspaces', 'proposal_status')
