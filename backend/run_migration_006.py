import asyncio
from sqlalchemy import text
from app.core.config import settings
from sqlalchemy.ext.asyncio import create_async_engine

async def run_migration():
    engine = create_async_engine(settings.DATABASE_URL)
    sql_file_path = "migrations/006_add_avatar.sql"

    try:
        with open(sql_file_path, 'r') as file:
            sql_command = file.read()

        async with engine.begin() as conn:
            print(f"Applying {sql_file_path}...")
            for statement in sql_command.split(';'):
                if statement.strip():
                    await conn.execute(text(statement))
            print("Migration 006 applied successfully!")
    except FileNotFoundError:
        print(f"Error: Could not find {sql_file_path}")
    except Exception as e:
        if "already exists" in str(e):
            print(f"Column already exists: {e}")
        else:
            print(f"Migration failed: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(run_migration())
