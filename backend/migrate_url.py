#!/usr/bin/env python3
"""Migration script to add url column to jobs table."""

import asyncio
from sqlalchemy import text
from app.core.database import engine

async def migrate():
    async with engine.begin() as conn:
        result = await conn.execute(
            text("SELECT column_name FROM information_schema.columns WHERE table_name='jobs' AND column_name='url'")
        )
        if result.fetchone():
            print("url column already exists")
            return

        await conn.execute(
            text("ALTER TABLE jobs ADD COLUMN url VARCHAR NULL")
        )
        print("Added url column to jobs table")

if __name__ == "__main__":
    asyncio.run(migrate())
