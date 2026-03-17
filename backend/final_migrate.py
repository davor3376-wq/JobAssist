import asyncio
from sqlalchemy import text
from app.core.config import settings
from sqlalchemy.ext.asyncio import create_async_engine

async def run_final_migration():
    engine = create_async_engine(settings.DATABASE_URL)
    sql_file = "migrations/003_create_resume_data_table.sql"
    
    with open(sql_file, 'r') as f:
        content = f.read()

    async with engine.begin() as conn:
        print("🚀 Creating resume_data table...")
        for statement in content.split(';'):
            if statement.strip():
                await conn.execute(text(statement))
        print("✅ Migration successful!")

if __name__ == "__main__":
    asyncio.run(run_final_migration())