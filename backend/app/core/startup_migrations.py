"""
Schema patches applied at startup before Alembic was introduced.
All statements use IF NOT EXISTS so they are safe to re-run.
"""
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

_MIGRATIONS = [
    # users — columns added after initial schema
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_manual_run_count INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_creation_count INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_counts_reset_at TIMESTAMP",
    # jobs — columns added after initial schema
    "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS notes TEXT",
    "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ",
    "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'bookmarked'",
    "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
    "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS category VARCHAR",
    "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS research_data TEXT",
    # user_profiles — columns added after initial schema
    "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar TEXT",
]


async def run_startup_migrations(conn: AsyncConnection) -> None:
    for stmt in _MIGRATIONS:
        await conn.execute(text(stmt))
