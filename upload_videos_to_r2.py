#!/usr/bin/env python3
"""
Script to upload marketing videos to R2 storage
Usage:
  python3 upload_videos_to_r2.py           # Uses dev config
  python3 upload_videos_to_r2.py prod      # Uses .env.production
"""
import os
import sys
import boto3
from pathlib import Path
from dotenv import load_dotenv

# Check if production mode is requested
use_production = len(sys.argv) > 1 and sys.argv[1].lower() in ['prod', 'production']

if use_production:
    print("🚀 Production mode - loading .env.production")
    # Load production environment variables
    env_path = Path('backend/.env.production')
    if env_path.exists():
        load_dotenv(env_path)
        print(f"Loaded environment from: {env_path}")
    else:
        print(f"❌ Production env file not found: {env_path}")
        exit(1)

# Try environment variables first, then fall back to config file
R2_ENDPOINT_URL = os.getenv('R2_ENDPOINT_URL')
R2_ACCESS_KEY_ID = os.getenv('R2_ACCESS_KEY_ID')
R2_SECRET_ACCESS_KEY = os.getenv('R2_SECRET_ACCESS_KEY')
R2_BUCKET_NAME = os.getenv('R2_BUCKET_NAME')

if not all([R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME]):
    if use_production:
        print("❌ Missing R2 credentials in .env.production file")
        exit(1)
    else:
        print("🔧 Environment variables not found, trying dev config file...")
        # Add backend to path so we can import config
        sys.path.append('backend')
        
        try:
            from config import settings
            R2_ENDPOINT_URL = settings.R2_ENDPOINT_URL
            R2_ACCESS_KEY_ID = settings.R2_ACCESS_KEY_ID
            R2_SECRET_ACCESS_KEY = settings.R2_SECRET_ACCESS_KEY
            R2_BUCKET_NAME = settings.R2_BUCKET_NAME
            print("✅ Using dev config file settings")
        except ImportError:
            print("❌ Could not import settings and no environment variables found.")
            print("Either run with 'prod' argument or make sure you're in the project root with backend dependencies.")
            exit(1)
else:
    env_source = "production .env file" if use_production else "environment variables"
    print(f"✅ Using R2 credentials from {env_source}")

try:
    # Initialize R2 client
    s3_client = boto3.client(
        's3',
        endpoint_url=R2_ENDPOINT_URL,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        region_name='auto'
    )
    
    bucket_name = R2_BUCKET_NAME
    
    # Video files to upload
    videos = [
        'frontend/public/buildconfidence.mp4',
        'frontend/public/createlink.mp4', 
        'frontend/public/firstthought.mp4'
    ]
    
    uploaded_urls = {}
    
    for video_path in videos:
        if os.path.exists(video_path):
            filename = Path(video_path).name
            key = f"static-assets/{filename}"  # Same folder as heroimage.jpg
            
            print(f"Uploading {filename}...")
            
            # Upload to R2
            with open(video_path, 'rb') as file:
                s3_client.upload_fileobj(
                    file,
                    bucket_name,
                    key,
                    ExtraArgs={
                        'ContentType': 'video/mp4'
                    }
                )
            
            # Generate public URL
            file_url = f"https://pub-{bucket_name}.r2.dev/{key}"
            uploaded_urls[filename] = file_url
            
            print(f"✅ Uploaded: {file_url}")
        else:
            print(f"❌ File not found: {video_path}")
    
    print(f"\n🎉 All videos uploaded successfully to bucket: {bucket_name}!")
    print("\nUploaded URLs:")
    for filename, url in uploaded_urls.items():
        print(f"  {filename}: {url}")
        
except Exception as e:
    print(f"❌ Upload failed: {e}")
    print("Make sure your R2 credentials are correct") 