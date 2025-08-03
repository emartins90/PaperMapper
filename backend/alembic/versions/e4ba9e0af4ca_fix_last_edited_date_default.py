"""fix_last_edited_date_default

Revision ID: e4ba9e0af4ca
Revises: dd63c8379965
Create Date: 2025-08-01 21:45:37.301780

"""
from typing import Sequence, Union
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import func


# revision identifiers, used by Alembic.
revision: str = 'e4ba9e0af4ca'
down_revision: Union[str, Sequence[str], None] = 'dd63c8379965'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # First, update any records with future dates to current time
    op.execute("""
        UPDATE projects 
        SET last_edited_date = NOW() 
        WHERE last_edited_date > NOW()
    """)
    
    # Update the column to use func.now() for future updates
    # Note: We can't change the default/onupdate in a migration easily
    # The model change we made will handle new records
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
