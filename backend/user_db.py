from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from models import User
from database import SessionLocal

async def get_user_db():
    async with SessionLocal() as session:
        yield SQLAlchemyUserDatabase(session, User) 