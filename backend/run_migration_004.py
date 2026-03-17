import asyncio
from sqlalchemy import text
from app.core.config import settings
from sqlalchemy.ext.asyncio import create_async_engine

async def run_migration():
    engine = create_async_engine(settings.DATABASE_URL)
    sql_file_path = "migrations/004_add_user_preferences.sql"

    try:
        with open(sql_file_path, 'r') as file:
            sql_command = file.read()

        async with engine.begin() as conn:
            print(f"Applying {sql_file_path}...")
            for statement in sql_command.split(';'):
                if statement.strip():
                    await conn.execute(text(statement))
            print("Migration 004 applied successfully!")
    except FileNotFoundError:
        print(f"Error: Could not find {sql_file_path}")
    except Exception as e:
        # Column might already exist if run twice — that's OK
        if "already exists" in str(e):
            print(f"Columns already exist (migration was already applied): {e}")
        else:
            print(f"Migration failed: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(run_migration())
