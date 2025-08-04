import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from config import settings

DATABASE_URL = settings.DATABASE_URL
DATABASE_SYNC_URL = settings.DATABASE_SYNC_URL

# Use async engine for async URL
engine = create_async_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Always define a sync engine/session for auth and migrations
from sqlalchemy import create_engine as sync_create_engine
sync_engine = sync_create_engine(DATABASE_SYNC_URL)
SyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)

Base = declarative_base()