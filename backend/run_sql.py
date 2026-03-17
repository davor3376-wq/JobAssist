import asyncio
from sqlalchemy import text
from app.core.config import settings
from sqlalchemy.ext.asyncio import create_async_engine

async def run_migration_file():
    engine = create_async_engine(settings.DATABASE_URL)
    # This matches the file you were trying to run
    sql_file_path = "migrations/003_create_resume_data_table.sql"
    
    try:
        with open(sql_file_path, 'r') as file:
            sql_command = file.read()

        async with engine.begin() as conn:
            print(f"Applying {sql_file_path}...")
            # Split by ; to handle multiple SQL statements in one file
            for statement in sql_command.split(';'):
                if statement.strip():
                    await conn.execute(text(statement))
            print("✅ Database is now up to date!")
    except FileNotFoundError:
        print(f"❌ Error: Could not find {sql_file_path}")
    except Exception as e:
        print(f"❌ Migration failed: {e}")

if __name__ == "__main__":
    asyncio.run(run_migration_file())