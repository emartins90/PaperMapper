"""Convert tags columns to array

Revision ID: 044c0736f00d
Revises: 665fdf05663b
Create Date: 2025-07-17 12:35:38.589883

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '044c0736f00d'
down_revision: Union[str, Sequence[str], None] = '665fdf05663b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('source_materials', 'tags',
        type_=postgresql.ARRAY(sa.String()),
        postgresql_using="string_to_array(tags, ',')"
    )
    op.alter_column('questions', 'tags',
        type_=postgresql.ARRAY(sa.String()),
        postgresql_using="string_to_array(tags, ',')"
    )
    op.alter_column('insights', 'tags',
        type_=postgresql.ARRAY(sa.String()),
        postgresql_using="string_to_array(tags, ',')"
    )
    op.alter_column('thoughts', 'tags',
        type_=postgresql.ARRAY(sa.String()),
        postgresql_using="string_to_array(tags, ',')"
    )
    op.alter_column('claims', 'tags',
        type_=postgresql.ARRAY(sa.String()),
        postgresql_using="string_to_array(tags, ',')"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('source_materials', 'tags',
        type_=sa.String(),
        postgresql_using="array_to_string(tags, ',')"
    )
    op.alter_column('questions', 'tags',
        type_=sa.String(),
        postgresql_using="array_to_string(tags, ',')"
    )
    op.alter_column('insights', 'tags',
        type_=sa.String(),
        postgresql_using="array_to_string(tags, ',')"
    )
    op.alter_column('thoughts', 'tags',
        type_=sa.String(),
        postgresql_using="array_to_string(tags, ',')"
    )
    op.alter_column('claims', 'tags',
        type_=sa.String(),
        postgresql_using="array_to_string(tags, ',')"
    )
