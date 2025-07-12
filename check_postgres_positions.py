#!/usr/bin/env python3
"""
Check card positions in PostgreSQL database
"""
import asyncio
import asyncpg
import os

# Database configuration - adjust these values to match your setup
DATABASE_URL = "postgresql://postgres:ReesesCups1810!@localhost:5432/papermapper"

async def check_card_positions():
    """Check all card positions in the database"""
    
    try:
        # Connect to database
        conn = await asyncpg.connect(DATABASE_URL)
        
        print("Checking card positions in PostgreSQL database...")
        print("=" * 60)
        
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
            print("-" * 60)
            for row in rows:
                print(f"Card ID: {row['id']}")
                print(f"  Type: {row['type']}")
                print(f"  Position: x={row['position_x']}, y={row['position_y']}")
                print(f"  Project ID: {row['project_id']}")
                print(f"  Data ID: {row['data_id']}")
                print("-" * 40)
        
        # Close connection
        await conn.close()
        
    except Exception as e:
        print(f"Error connecting to database: {e}")
        print("\nMake sure:")
        print("1. PostgreSQL is running")
        print("2. DATABASE_URL is correct")
        print("3. The database contains the 'cards' table")

if __name__ == "__main__":
    asyncio.run(check_card_positions()) 