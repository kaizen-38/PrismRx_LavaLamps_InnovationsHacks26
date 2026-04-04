"""
Async SQLAlchemy engine + session factory.
Uses SQLite via aiosqlite for now — swap DATABASE_URL to postgres+asyncpg later.
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from ..models.policy import Base
from .config import get_settings


def _make_engine():
    settings = get_settings()
    connect_args = {}
    if "sqlite" in settings.database_url:
        connect_args["check_same_thread"] = False
    return create_async_engine(
        settings.database_url,
        echo=settings.debug,
        connect_args=connect_args,
    )


engine = _make_engine()
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
