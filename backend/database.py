import os
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
import datetime
from backend.config import settings
from sqlalchemy import create_engine

DATABASE_URL = settings.DATABASE_URL

if DATABASE_URL.startswith("postgresql+asyncpg"):
    # Async for app
    engine = create_async_engine(DATABASE_URL, echo=True)
    SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
else:
    # Sync for migrations
    engine = create_engine(DATABASE_URL, echo=True)
    SessionLocal = sessionmaker(bind=engine)

# Always define a sync engine/session for auth and migrations
from sqlalchemy import create_engine as sync_create_engine
sync_engine = sync_create_engine(DATABASE_URL.replace("+asyncpg", ""))
SyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)

Base = declarative_base()