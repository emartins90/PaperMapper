"""detect all tables

Revision ID: 3f29a4b4ac3f
Revises: 425dad0a7add
Create Date: 2025-07-06 17:07:50.046844

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '3f29a4b4ac3f'
down_revision: Union[str, Sequence[str], None] = '425dad0a7add'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('email', sa.String(), nullable=False),
    sa.Column('hashed_password', sa.String(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('is_superuser', sa.Boolean(), nullable=False),
    sa.Column('is_verified', sa.Boolean(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_table('projects',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_projects_id'), 'projects', ['id'], unique=False)
    op.create_table('cards',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('type', sa.String(), nullable=False),
    sa.Column('data_id', sa.Integer(), nullable=True),
    sa.Column('position_x', sa.Float(), nullable=True),
    sa.Column('position_y', sa.Float(), nullable=True),
    sa.Column('project_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_cards_id'), 'cards', ['id'], unique=False)
    op.create_table('citations',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('text', sa.String(), nullable=False),
    sa.Column('credibility', sa.String(), nullable=True),
    sa.Column('project_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_citations_id'), 'citations', ['id'], unique=False)
    op.create_table('card_links',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('source_card_id', sa.Integer(), nullable=True),
    sa.Column('target_card_id', sa.Integer(), nullable=True),
    sa.Column('project_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
    sa.ForeignKeyConstraint(['source_card_id'], ['cards.id'], ),
    sa.ForeignKeyConstraint(['target_card_id'], ['cards.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_card_links_id'), 'card_links', ['id'], unique=False)
    op.create_table('source_materials',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('citation_id', sa.Integer(), nullable=True),
    sa.Column('project_id', sa.Integer(), nullable=True),
    sa.Column('content', sa.String(), nullable=True),
    sa.Column('summary', sa.String(), nullable=True),
    sa.Column('tags', sa.String(), nullable=True),
    sa.Column('argument_type', sa.String(), nullable=True),
    sa.Column('function', sa.String(), nullable=True),
    sa.Column('files', sa.String(), nullable=True),
    sa.ForeignKeyConstraint(['citation_id'], ['citations.id'], ),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_source_materials_id'), 'source_materials', ['id'], unique=False)
    # Convert tags columns to ARRAY(String)
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
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_source_materials_id'), table_name='source_materials')
    op.drop_table('source_materials')
    op.drop_index(op.f('ix_card_links_id'), table_name='card_links')
    op.drop_table('card_links')
    op.drop_index(op.f('ix_citations_id'), table_name='citations')
    op.drop_table('citations')
    op.drop_index(op.f('ix_cards_id'), table_name='cards')
    op.drop_table('cards')
    op.drop_index(op.f('ix_projects_id'), table_name='projects')
    op.drop_table('projects')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    # Convert tags columns back to String
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
    # ### end Alembic commands ###
