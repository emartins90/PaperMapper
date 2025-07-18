from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from backend.models import User
from backend.database import SessionLocal

async def get_user_db():
    async with SessionLocal() as session:
        yield SQLAlchemyUserDatabase(session, User) 