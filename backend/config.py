import os
from typing import List
from dotenv import load_dotenv
from pathlib import Path
import secrets

# Load environment variables based on ENV setting
ENV = os.getenv("ENV", "local")

# Debug: Print all Railway-related environment variables
print("=== Environment Detection Debug ===")
print(f"Initial ENV: {ENV}")
print(f"RAILWAY_ENVIRONMENT: {os.getenv('RAILWAY_ENVIRONMENT')}")
print(f"RAILWAY_PROJECT_ID: {os.getenv('RAILWAY_PROJECT_ID')}")
print(f"RAILWAY_SERVICE_NAME: {os.getenv('RAILWAY_SERVICE_NAME')}")
print(f"RAILWAY_SERVICE_ID: {os.getenv('RAILWAY_SERVICE_ID')}")
print(f"Custom ENV variable: {os.getenv('ENV')}")

# If Railway is detected, try to determine the environment
if os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("RAILWAY_PROJECT_ID"):
    print("Railway environment detected")
    
    # First, check if ENV is explicitly set
    if os.getenv("ENV") in ["develop", "production"]:
        ENV = os.getenv("ENV")
        print(f"Using explicit ENV setting: {ENV}")
    else:
        # Try to determine from Railway service name
        service_name = os.getenv("RAILWAY_SERVICE_NAME", "").lower()
        if "develop" in service_name or "dev" in service_name:
            ENV = "develop"
            print(f"Detected develop environment from service name: {service_name}")
        else:
            ENV = "production"
            print(f"Detected production environment from service name: {service_name}")
else:
    print("Local environment detected")

print(f"Final ENV setting: {ENV}")
print("=== End Environment Detection ===")

# Map ENV to environment file
env_mapping = {
    "local": ".env.local",
    "development": ".env.development", 
    "develop": ".env.development",  # Add support for "develop" environment
    "production": ".env.production"
}

env_file = env_mapping.get(ENV, ".env.development")
env_path = Path(__file__).parent / env_file
load_dotenv(env_path)


print("Environment:", ENV)

class Settings:
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    DATABASE_SYNC_URL: str = os.getenv("DATABASE_SYNC_URL")
    
    if not DATABASE_URL:
        raise ValueError(f"DATABASE_URL not found in {env_path}. Please create this file with your database configuration.")
    
    # If no sync URL provided, try to convert async URL
    if not DATABASE_SYNC_URL:
        if DATABASE_URL.startswith("postgresql+asyncpg"):
            DATABASE_SYNC_URL = DATABASE_URL.replace("+asyncpg", "")
        else:
            # For Railway, the sync URL is the public URL
            DATABASE_SYNC_URL = DATABASE_URL.replace("railway.internal", "mainline.proxy.rlwy.net")
    
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
    
    # Mailgun Email
    MAILGUN_API_KEY: str = os.getenv("MAILGUN_API_KEY")
    MAILGUN_DOMAIN: str = os.getenv("MAILGUN_DOMAIN")
    
    # CORS
    CORS_ORIGINS: List[str] = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    
    # Environment
    ENV: str = ENV
    
    def __str__(self):
        return f"Settings(ENV={self.ENV}, DATABASE_URL={self.DATABASE_URL})"

# Create a global settings instance
settings = Settings() 