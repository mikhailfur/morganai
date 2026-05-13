"""Initial migration - create all tables."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import BIGINT

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('telegram_id', sa.BigInteger(), nullable=False, unique=True),
        sa.Column('username', sa.String(255), nullable=True),
        sa.Column('first_name', sa.String(255), nullable=True),
        sa.Column('last_name', sa.String(255), nullable=True),
        sa.Column('is_premium', sa.Boolean(), nullable=False, server_default='f'),
        sa.Column('premium_expires_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('selected_character_id', sa.Integer(), nullable=True),
        sa.Column('selected_mode_id', sa.Integer(), nullable=True),
        sa.Column('last_activity_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('idx_users_telegram_id', 'telegram_id')
    )

    # Create characters table
    op.create_table(
        'characters',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('system_prompt', sa.Text(), nullable=False),
        sa.Column('avatar_url', sa.String(512), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default='f'),
        sa.Column('is_nsfw', sa.Boolean(), nullable=False, server_default='f'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )

    # Create behavior_modes table
    op.create_table(
        'behavior_modes',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('prompt_addition', sa.Text(), nullable=False),
        sa.Column('is_premium', sa.Boolean(), nullable=False, server_default='f'),
        sa.Column('is_nsfw', sa.Boolean(), nullable=False, server_default='f'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )

    # Create conversations table
    op.create_table(
        'conversations',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('character_id', sa.Integer(), nullable=True),
        sa.Column('mode_id', sa.Integer(), nullable=True),
        sa.Column('messages', sa.Text(), nullable=False, server_default='[]'),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.telegram_id']),
        sa.ForeignKeyConstraint(['character_id'], ['characters.id']),
        sa.ForeignKeyConstraint(['mode_id'], ['behavior_modes.id']),
        sa.Index('idx_conversations_user_updated', 'user_id', 'updated_at')
    )

    # Create subscriptions table
    op.create_table(
        'subscriptions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('plan_type', sa.String(50), nullable=False),
        sa.Column('payment_gateway', sa.String(50), nullable=True),
        sa.Column('payment_id', sa.String(255), nullable=True),
        sa.Column('expires_at', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.telegram_id']),
        sa.Index('idx_subscriptions_expires', 'expires_at')
    )

    # Create admin_settings table
    op.create_table(
        'admin_settings',
        sa.Column('key', sa.String(255), nullable=False),
        sa.Column('value', sa.Text(), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('key')
    )


def downgrade() -> None:
    op.drop_table('admin_settings')
    op.drop_table('subscriptions')
    op.drop_table('conversations')
    op.drop_table('behavior_modes')
    op.drop_table('characters')
    op.drop_table('users')
