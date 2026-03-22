#!/usr/bin/env python3
"""Migration script to add research_data column to jobs table."""

import asyncio
from sqlalchemy import text
from app.core.database import engine

async def migrate():
    async with engine.begin() as conn:
        result = await conn.execute(
            text("SELECT column_name FROM information_schema.columns WHERE table_name='jobs' AND column_name='research_data'")
        )
        if result.fetchone():
            print("research_data column already exists")
            return

        await conn.execute(
            text("ALTER TABLE jobs ADD COLUMN research_data TEXT NULL")
        )
        print("Added research_data column to jobs table")

if __name__ == "__main__":
    asyncio.run(migrate())
