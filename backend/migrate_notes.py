#!/usr/bin/env python3
"""Migration script to add notes column to jobs table."""

import asyncio
from sqlalchemy import text
from app.core.database import engine

async def migrate():
    async with engine.begin() as conn:
        # Check if column exists
        result = await conn.execute(
            text("SELECT column_name FROM information_schema.columns WHERE table_name='jobs' AND column_name='notes'")
        )
        if result.fetchone():
            print("notes column already exists")
            return

        # Add column
        await conn.execute(
            text("ALTER TABLE jobs ADD COLUMN notes TEXT NULL")
        )
        print("✅ Added notes column to jobs table")

if __name__ == "__main__":
    asyncio.run(migrate())
