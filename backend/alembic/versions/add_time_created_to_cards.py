"""add time_created to cards

Revision ID: add_time_created_to_cards
Revises: 0ad98d4b6b2b
Create Date: 2024-12-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_time_created_to_cards'
down_revision = '0ad98d4b6b2b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add time_created column to cards table
    op.add_column('cards', sa.Column('time_created', sa.DateTime(), nullable=True))
    
    # Set default value for existing records (current timestamp)
    op.execute("UPDATE cards SET time_created = NOW() WHERE time_created IS NULL")
    
    # Make the column not nullable after setting default values
    op.alter_column('cards', 'time_created', nullable=False)


def downgrade() -> None:
    # Remove time_created column from cards table
    op.drop_column('cards', 'time_created') 