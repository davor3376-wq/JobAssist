"""
Migration: Add Austrian Lebenslauf fields to resume_data table.
Run once: python migrate_austrian.py
"""
import asyncio
from sqlalchemy import text
from app.core.database import engine


async def migrate():
    async with engine.begin() as conn:
        for col, col_type in [
            ("titel",      "VARCHAR"),
            ("interests",  "TEXT"),
            ("photo_b64",  "TEXT"),
        ]:
            try:
                await conn.execute(text(f"ALTER TABLE resume_data ADD COLUMN {col} {col_type}"))
                print(f"Added column: {col}")
            except Exception as e:
                print(f"Column '{col}' already exists or error: {e}")

        # Add location to work_experience and education — stored as JSON, no migration needed.
        print("Migration complete. JSON sub-fields (location, grades) are schema-only changes.")


if __name__ == "__main__":
    asyncio.run(migrate())
