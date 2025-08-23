#!/usr/bin/env python3
"""
Script to run the backend in development mode
"""
import os
import subprocess
import sys
from pathlib import Path

def main():
    # Get the project root directory (parent of backend)
    project_root = Path(__file__).parent.parent
    backend_dir = Path(__file__).parent
    
    # Change to project root directory
    os.chdir(project_root)
    
    # Set environment to local
    os.environ["ENV"] = "local"
    
    print("🚀 Starting PaperMapper Backend in LOCAL mode")
    print(f"Environment: {os.environ.get('ENV')}")
    print(f"Project root: {project_root}")
    
    # Run uvicorn from project root
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