"""
Phase 3 Migration: Add status and updated_at columns to jobs table.
Run this once: python migrate_phase3.py
"""
import asyncio
from sqlalchemy import text
from app.core.database import engine


async def migrate():
    async with engine.begin() as conn:
        # Add status column with default value
        try:
            await conn.execute(text(
                "ALTER TABLE jobs ADD COLUMN status VARCHAR NOT NULL DEFAULT 'bookmarked'"
            ))
            print("Added 'status' column")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print("'status' column already exists, skipping")
            else:
                print(f"Error adding status: {e}")

        # Add updated_at column with default value
        try:
            await conn.execute(text(
                "ALTER TABLE jobs ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()"
            ))
            print("Added 'updated_at' column")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print("'updated_at' column already exists, skipping")
            else:
                print(f"Error adding updated_at: {e}")

    print("\nMigration complete!")


if __name__ == "__main__":
    asyncio.run(migrate())
