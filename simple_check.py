#!/usr/bin/env python3
"""
Simple script to check card positions
"""
import sqlite3
import os

def check_positions():
    # Try to find the database file
    db_paths = [
        "backend/paper_mapper.db",
        "paper_mapper.db", 
        "backend/database.db"
    ]
    
    db_path = None
    for path in db_paths:
        if os.path.exists(path):
            db_path = path
            break
    
    if not db_path:
        print("❌ Couldn't find database file")
        print("Looked in:", db_paths)
        return
    
    print(f"✅ Found database: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if cards table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='cards'")
        if not cursor.fetchone():
            print("❌ No 'cards' table found")
            return
        
        # Get all cards
        cursor.execute("SELECT id, type, position_x, position_y FROM cards")
        cards = cursor.fetchall()
        
        if not cards:
            print("❌ No cards found in database")
        else:
            print(f"✅ Found {len(cards)} cards:")
            for card in cards:
                print(f"  Card {card[0]} ({card[1]}): x={card[2]}, y={card[3]}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("Checking card positions...")
    check_positions() 