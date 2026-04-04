#!/usr/bin/env python
"""Initialize database schema without relying on alembic.config."""
import sys
import asyncio

async def init_db():
    """Initialize database by creating all tables."""
    try:
        # Import models first to register them with Base
        import app.models  # noqa: F401
        from app.database import init_db as db_init
        
        # Create tables
        await db_init()
        
        print("✓ Database initialized successfully")
        return 0
        
    except Exception as e:
        print(f"✗ Error initializing database: {e}")
        import traceback
        traceback.print_exc()
        return 1

def main():
    """Run database initialization."""
    try:
        result = asyncio.run(init_db())
        sys.exit(result)
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
