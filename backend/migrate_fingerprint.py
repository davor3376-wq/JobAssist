import asyncio
from sqlalchemy import text
from app.core.config import settings
from sqlalchemy.ext.asyncio import create_async_engine


async def run_migration():
    engine = create_async_engine(settings.DATABASE_URL)

    commands = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS fingerprint VARCHAR;",
        "CREATE INDEX IF NOT EXISTS ix_users_fingerprint ON users (fingerprint) WHERE fingerprint IS NOT NULL;",
    ]

    async with engine.begin() as conn:
        for cmd in commands:
            try:
                await conn.execute(text(cmd))
                print(f"✅ Success: {cmd}")
            except Exception as e:
                print(f"❌ Error: {e}")


if __name__ == "__main__":
    asyncio.run(run_migration())
