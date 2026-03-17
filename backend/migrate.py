import asyncio
from sqlalchemy import text
from app.core.config import settings
from sqlalchemy.ext.asyncio import create_async_engine

async def run_migration():
    # This automatically pulls your DB URL from your .env
    engine = create_async_engine(settings.DATABASE_URL)
    
    commands = [
        "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS notes TEXT;",
        "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deadline TIMESTAMP;",
        "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'applied';"
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