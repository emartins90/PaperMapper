#!/usr/bin/env python3
"""
Test upload endpoint without R2
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + "/.."))

from fastapi import FastAPI, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import tempfile
import uuid

# Import your existing auth setup
from backend.main import get_current_user, models
from backend.database import SessionLocal
from sqlalchemy.ext.asyncio import AsyncSession

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Dependency to get async DB session
def get_db():
    async def _get_db():
        async with SessionLocal() as session:
            yield session
    return _get_db()

@app.post("/test_upload/")
async def test_upload(
    question_id: int = Form(...),
    files: List[File] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Test upload endpoint that doesn't use R2"""
    try:
        print(f"[TEST] User authenticated: {current_user.email}")
        print(f"[TEST] Question ID: {question_id}")
        print(f"[TEST] Files: {[f.filename for f in files]}")
        
        # Simulate file processing without R2
        uploaded_urls = []
        for file in files:
            # Create a fake URL
            fake_url = f"test://fake-storage/{uuid.uuid4()}-{file.filename}"
            uploaded_urls.append(fake_url)
            print(f"[TEST] Created fake URL: {fake_url}")
        
        return {
            "file_urls": uploaded_urls,
            "all_files": uploaded_urls,
            "message": "Test upload successful (no R2)"
        }
        
    except Exception as e:
        print(f"[TEST] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) 