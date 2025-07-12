#!/usr/bin/env python3
"""
Script to directly check card positions in the database
"""
import asyncio
import asyncpg
import os

# Database configuration - adjust these values to match your setup
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:password@localhost/paper_mapper")

async def check_card_positions():
    """Check all card positions in the database"""
    
    try:
        # Connect to database
        conn = await asyncpg.connect(DATABASE_URL)
        
        print("Checking card positions in database...")
        print("=" * 50)
        
        # Query all cards with their positions
        rows = await conn.fetch("""
            SELECT id, type, position_x, position_y, project_id, data_id 
            FROM cards 
            ORDER BY id
        """)
        
        if not rows:
            print("No cards found in database")
        else:
            print(f"Found {len(rows)} cards:")
            print("-" * 50)
            for row in rows:
                print(f"Card ID: {row['id']}")
                print(f"  Type: {row['type']}")
                print(f"  Position: x={row['position_x']}, y={row['position_y']}")
                print(f"  Project ID: {row['project_id']}")
                print(f"  Data ID: {row['data_id']}")
                print("-" * 30)
        
        # Close connection
        await conn.close()
        
    except Exception as e:
        print(f"Error connecting to database: {e}")
        print("\nMake sure:")
        print("1. Your database is running")
        print("2. DATABASE_URL is set correctly")
        print("3. The database contains the 'cards' table")

if __name__ == "__main__":
    asyncio.run(check_card_positions()) 