import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine
from sqlalchemy import text

async def test_database():
    try:
        async with engine.connect() as conn:
            print("Database connection successful")
            
            # Test if CardLink table exists
            result = await conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'card_links')"))
            table_exists = result.scalar()
            print(f"CardLink table exists: {table_exists}")
            
            if table_exists:
                # Test if we can query the table
                result = await conn.execute(text("SELECT COUNT(*) FROM card_links"))
                count = result.scalar()
                print(f"CardLink table has {count} records")
                
    except Exception as e:
        print(f"Database error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_database()) 