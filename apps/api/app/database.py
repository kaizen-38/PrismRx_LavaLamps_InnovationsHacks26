"""Database configuration and session management."""

import logging
from sqlalchemy import create_engine, event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from typing import AsyncGenerator

from app.config import settings

logger = logging.getLogger(__name__)

# Declarative base for ORM models
Base = declarative_base()

# Synchronous engine (for migrations and background tasks)
sync_engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DB_ECHO,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
)

# Asynchronous engine (for API requests)
async_database_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
async_engine = create_async_engine(
    async_database_url,
    echo=settings.DB_ECHO,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
)

# Session factories
AsyncSessionLocal = sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
)

SyncSessionLocal = sessionmaker(
    bind=sync_engine, expire_on_commit=False
)


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """Get async database session for dependency injection."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            await session.close()


def get_sync_db():
    """Get sync database session for background tasks."""
    db = SyncSessionLocal()
    try:
        yield db
    finally:
        db.close()


async def init_db():
    """Initialize database tables."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")


async def close_db():
    """Close database connections."""
    await async_engine.dispose()
    logger.info("Database connections closed")


# Event listeners for connection management
@event.listens_for(sync_engine, "connect")
def receive_connect(dbapi_conn, connection_record):
    """Enable foreign keys and other SQLite/Postgres settings on connect."""
    pass  # Uncomment for SQLite: dbapi_conn.execute("PRAGMA foreign_keys=ON")
