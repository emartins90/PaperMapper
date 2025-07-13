#!/usr/bin/env python3
"""
Script to run the backend in development mode from project root
"""
import os
import subprocess
import sys

def main():
    # Set environment to development
    os.environ["ENV"] = "development"
    
    print("🚀 Starting PaperMapper Backend in DEVELOPMENT mode")
    print(f"Environment: {os.environ.get('ENV')}")
    
    # Run uvicorn
    try:
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "backend.main:app", 
            "--reload", 
            "--host", "0.0.0.0", 
            "--port", "8000"
        ])
    except KeyboardInterrupt:
        print("\n👋 Shutting down development server...")

if __name__ == "__main__":
    main() 