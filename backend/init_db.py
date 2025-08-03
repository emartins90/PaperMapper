from database import engine, Base
from models  # This imports your models so SQLAlchemy knows about them

# This will create all tables defined in your models.py
Base.metadata.create_all(bind=engine)
 
print("Tables created successfully!") 