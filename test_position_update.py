#!/usr/bin/env python3
"""
Test script to verify card position updates are working
"""
import requests
import json

# Configuration
API_URL = "http://localhost:8000"
CARD_ID = 1  # Change this to an actual card ID from your database

def test_position_update():
    """Test updating a card's position"""
    
    # First, get the current card data
    print(f"Getting current data for card {CARD_ID}...")
    try:
        response = requests.get(f"{API_URL}/cards/{CARD_ID}")
        if response.status_code == 200:
            current_card = response.json()
            print(f"Current position: x={current_card.get('position_x')}, y={current_card.get('position_y')}")
        else:
            print(f"Failed to get card: {response.status_code}")
            return
    except Exception as e:
        print(f"Error getting card: {e}")
        return
    
    # Update the position
    new_position = {
        "position_x": 100.0,
        "position_y": 200.0
    }
    
    print(f"Updating card {CARD_ID} to new position: {new_position}")
    
    try:
        response = requests.put(
            f"{API_URL}/cards/{CARD_ID}",
            headers={"Content-Type": "application/json"},
            data=json.dumps(new_position)
        )
        
        if response.status_code == 200:
            updated_card = response.json()
            print(f"✅ Successfully updated card!")
            print(f"New position: x={updated_card.get('position_x')}, y={updated_card.get('position_y')}")
            
            # Verify by getting the card again
            print("\nVerifying update by fetching card again...")
            verify_response = requests.get(f"{API_URL}/cards/{CARD_ID}")
            if verify_response.status_code == 200:
                verified_card = verify_response.json()
                print(f"Verified position: x={verified_card.get('position_x')}, y={verified_card.get('position_y')}")
                
                if (verified_card.get('position_x') == new_position['position_x'] and 
                    verified_card.get('position_y') == new_position['position_y']):
                    print("✅ Position update verified in database!")
                else:
                    print("❌ Position update verification failed!")
            else:
                print(f"❌ Failed to verify update: {verify_response.status_code}")
        else:
            print(f"❌ Failed to update card: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error updating card: {e}")

if __name__ == "__main__":
    print("Testing card position update...")
    print("=" * 50)
    test_position_update() 