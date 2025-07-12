from backend.database import engine, Base
from backend import models  # This imports your models so SQLAlchemy knows about them

# This will create all tables defined in your models.py
Base.metadata.create_all(bind=engine)
 
print("Tables created successfully!") 