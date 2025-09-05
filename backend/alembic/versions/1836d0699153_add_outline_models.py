"""add_outline_models

Revision ID: 1836d0699153
Revises: add_time_created_to_cards
Create Date: 2025-09-04 15:20:35.548542

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1836d0699153'
down_revision: Union[str, Sequence[str], None] = 'add_time_created_to_cards'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create outline_sections table
    op.create_table('outline_sections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('order_index', sa.Integer(), nullable=False),
        sa.Column('parent_section_id', sa.Integer(), nullable=True),
        sa.Column('section_number', sa.String(), nullable=True),
        sa.Column('time_created', sa.DateTime(), nullable=False),
        sa.Column('time_updated', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['parent_section_id'], ['outline_sections.id'], ),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_outline_sections_id'), 'outline_sections', ['id'], unique=False)
    
    # Create outline_card_placements table
    op.create_table('outline_card_placements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('card_id', sa.Integer(), nullable=False),
        sa.Column('section_id', sa.Integer(), nullable=False),
        sa.Column('order_index', sa.Integer(), nullable=False),
        sa.Column('time_created', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['card_id'], ['cards.id'], ),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
        sa.ForeignKeyConstraint(['section_id'], ['outline_sections.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_outline_card_placements_id'), 'outline_card_placements', ['id'], unique=False)
    
    # Add unique constraint on card_id for single placement
    op.create_unique_constraint('uq_outline_card_placements_card_id', 'outline_card_placements', ['card_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('uq_outline_card_placements_card_id', 'outline_card_placements', type_='unique')
    op.drop_index(op.f('ix_outline_card_placements_id'), table_name='outline_card_placements')
    op.drop_table('outline_card_placements')
    op.drop_index(op.f('ix_outline_sections_id'), table_name='outline_sections')
    op.drop_table('outline_sections')
