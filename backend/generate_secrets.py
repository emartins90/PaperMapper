#!/usr/bin/env python3
"""
Utility script to generate secure secrets for the application.
Run this to generate JWT secrets and other cryptographic keys.
"""

import secrets
import string

def generate_jwt_secret():
    """Generate a secure JWT secret"""
    return secrets.token_urlsafe(32)

def generate_random_string(length=32, include_symbols=False):
    """Generate a random string of specified length"""
    chars = string.ascii_letters + string.digits
    if include_symbols:
        chars += "!@#$%^&*()_+-=[]{}|;:,.<>?"
    return ''.join(secrets.choice(chars) for _ in range(length))

def main():
    print("🔐 Secure Secret Generator")
    print("=" * 40)
    
    print("\n1. JWT Secret (for .env file):")
    jwt_secret = generate_jwt_secret()
    print(f"JWT_SECRET={jwt_secret}")
    
    print("\n2. Random Password (32 chars):")
    password = generate_random_string(32, include_symbols=True)
    print(password)
    
    print("\n3. API Key (32 chars):")
    api_key = generate_random_string(32)
    print(api_key)
    
    print("\n4. Database Password (16 chars):")
    db_password = generate_random_string(16)
    print(db_password)
    
    print("\n" + "=" * 40)
    print("💡 Copy these values to your .env.development file")
    print("⚠️  Keep these secrets secure and never commit them to git!")

if __name__ == "__main__":
    main() 