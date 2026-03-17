import asyncio
from sqlalchemy import text
from app.core.config import settings
from sqlalchemy.ext.asyncio import create_async_engine

async def run_migration():
    engine = create_async_engine(settings.DATABASE_URL)
    sql_file_path = "migrations/005_add_german_lebenslauf_fields.sql"

    try:
        with open(sql_file_path, 'r') as file:
            sql_command = file.read()

        async with engine.begin() as conn:
            print(f"Applying {sql_file_path}...")
            for statement in sql_command.split(';'):
                if statement.strip():
                    await conn.execute(text(statement))
            print("Migration 005 applied successfully!")
    except FileNotFoundError:
        print(f"Error: Could not find {sql_file_path}")
    except Exception as e:
        if "already exists" in str(e):
            print(f"Columns already exist (migration was already applied): {e}")
        else:
            print(f"Migration failed: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(run_migration())
