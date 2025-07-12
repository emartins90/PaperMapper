"""fix project FKs to use ON DELETE CASCADE

Revision ID: 4e5fce9f6903
Revises: 4e593fc9c23c
Create Date: 2025-07-07 13:29:19.252828

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4e5fce9f6903'
down_revision: Union[str, Sequence[str], None] = '4e593fc9c23c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop old FKs
    op.drop_constraint('cards_project_id_fkey', 'cards', type_='foreignkey')
    op.drop_constraint('card_links_project_id_fkey', 'card_links', type_='foreignkey')
    op.drop_constraint('source_materials_project_id_fkey', 'source_materials', type_='foreignkey')
    op.drop_constraint('citations_project_id_fkey', 'citations', type_='foreignkey')

    # Add new FKs with ON DELETE CASCADE
    op.create_foreign_key(
        'cards_project_id_fkey', 'cards', 'projects', ['project_id'], ['id'], ondelete='CASCADE'
    )
    op.create_foreign_key(
        'card_links_project_id_fkey', 'card_links', 'projects', ['project_id'], ['id'], ondelete='CASCADE'
    )
    op.create_foreign_key(
        'source_materials_project_id_fkey', 'source_materials', 'projects', ['project_id'], ['id'], ondelete='CASCADE'
    )
    op.create_foreign_key(
        'citations_project_id_fkey', 'citations', 'projects', ['project_id'], ['id'], ondelete='CASCADE'
    )


def downgrade() -> None:
    """Downgrade schema."""
    pass
