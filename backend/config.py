import os
from typing import List
from dotenv import load_dotenv
from pathlib import Path
import secrets

# Load environment variables based on ENV setting
ENV = os.getenv("ENV", "development")
env_path = Path(__file__).parent / f".env.{ENV}"
load_dotenv(env_path)

print("Loaded DATABASE_URL:", os.getenv("DATABASE_URL"))
print("Loaded from:", env_path)

class Settings:
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        raise ValueError(f"DATABASE_URL not found in {env_path}. Please create this file with your database configuration.")
    
    # JWT - Generate a strong secret if not provided
    JWT_SECRET: str = os.getenv("JWT_SECRET")
    if not JWT_SECRET or JWT_SECRET == "SUPERSECRET":
        # Generate a secure secret if not set or using default
        JWT_SECRET = secrets.token_urlsafe(32)
        print(f"WARNING: Generated new JWT_SECRET. Please set this in your .env.{ENV} file: {JWT_SECRET}")
    
    # R2 Storage
    R2_ENDPOINT_URL: str = os.getenv("R2_ENDPOINT_URL")
    R2_ACCESS_KEY_ID: str = os.getenv("R2_ACCESS_KEY_ID")
    R2_SECRET_ACCESS_KEY: str = os.getenv("R2_SECRET_ACCESS_KEY")
    R2_BUCKET_NAME: str = os.getenv("R2_BUCKET_NAME")
    
    # CORS
    CORS_ORIGINS: List[str] = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    
    # Environment
    ENV: str = ENV
    
    def __str__(self):
        return f"Settings(ENV={self.ENV}, DATABASE_URL={self.DATABASE_URL})"

# Create a global settings instance
settings = Settings() 