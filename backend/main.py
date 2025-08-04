from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from database import SessionLocal, engine, Base, DATABASE_URL, SyncSessionLocal
import models, schemas
from models import User, Project, PasswordResetCode
from schemas import UserRead, UserCreate, UserUpdate, Project as ProjectSchema, ProjectCreate, CardUpdate
from user_db import get_user_db
from fastapi_users import FastAPIUsers
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from fastapi_users.authentication import AuthenticationBackend
from fastapi_users.authentication.strategy.jwt import JWTStrategy
from fastapi_users.authentication.transport.bearer import BearerTransport
from fastapi_users.authentication.transport.cookie import CookieTransport
from fastapi_users.manager import BaseUserManager
from fastapi_users.password import PasswordHelper
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm.exc import StaleDataError
from sqlalchemy import delete as sa_delete
from pydantic import BaseModel
from r2_storage import R2Storage
from dotenv import load_dotenv
from fastapi.responses import StreamingResponse

import uuid
import os
from sqlalchemy import select
from pathlib import Path
import crud
import random
import datetime
from fastapi_users.router import get_auth_router

from config import settings

# Password reset request models
class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    password: str

SECRET = settings.JWT_SECRET

# Create sync engine for sync operations
# sync_engine = create_engine(DATABASE_URL.replace("+asyncpg", ""))
# SyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)

class UserManager(BaseUserManager[User, int]):
    reset_password_token_secret = SECRET
    verification_token_secret = SECRET

    async def on_after_register(self, user: User, request=None):
        print(f"User {user.id} has registered.")
        print(f"User email: {user.email}")
        print(f"User is_active: {user.is_active}")
        print(f"User is_verified: {user.is_verified}")

    async def on_after_forgot_password(self, user: User, token: str, request=None):
        print(f"User {user.id} has forgot their password. Reset token: {token}")

    async def on_after_reset_password(self, user: User, request=None):
        print(f"User {user.id} has reset their password.")

    def parse_id(self, value: str) -> int:
        return int(value)

    async def create(self, user_create: schemas.UC, safe: bool = False, request: Optional[Request] = None) -> models.UP:
        try:
            print(f"Attempting to create user with email: {user_create.email}")
            result = await super().create(user_create, safe, request)
            print(f"User creation successful: {result.id}")
            return result
        except Exception as e:
            print(f"User creation failed with error: {str(e)}")
            print(f"Error type: {type(e)}")
            raise

async def get_user_manager(user_db=Depends(get_user_db)):
    yield UserManager(user_db)

def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=SECRET, lifetime_seconds=30 * 24 * 3600)  # 30 days

# Use cookie transport for authentication with secure settings
cookie_transport = CookieTransport(
    cookie_name="auth_token",  # Less predictable name
    cookie_max_age=30 * 24 * 3600,  # 30 days - users stay logged in
    cookie_secure=settings.ENV == "production",  # HTTPS only in production
    cookie_httponly=True,  # Prevent XSS
    cookie_samesite="lax"  # CSRF protection
)
auth_backend = AuthenticationBackend(
    name="cookie",
    transport=cookie_transport,
    get_strategy=get_jwt_strategy,
)

# Comment out BearerTransport and old backend
# bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")
# auth_backend = AuthenticationBackend(
#     name="jwt",
#     transport=bearer_transport,
#     get_strategy=get_jwt_strategy,
# )

fastapi_users = FastAPIUsers[User, int](
    get_user_manager,
    [auth_backend],
)

get_current_user = fastapi_users.current_user(active=True)

app = FastAPI()

# Initialize R2 storage
r2_storage = R2Storage()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # Dynamic CORS origins
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)
print("CORS origins in use:", settings.CORS_ORIGINS)

# Dependency to get async DB session
def get_db():
    async def _get_db():
        async with SessionLocal() as session:
            yield session
    return _get_db

# Dependency to get regular DB session
def get_sync_db():
    with SyncSessionLocal() as session:
        yield session

# --- Citation Endpoints ---
@app.post("/citations/", response_model=schemas.Citation)
async def create_citation(citation: schemas.CitationCreate, db: AsyncSession = Depends(get_db())):
    print(f"[backend] Creating citation: {citation.dict()}")
    db_citation = models.Citation(**citation.dict())
    db.add(db_citation)
    await db.commit()
    await db.refresh(db_citation)
    print(f"[backend] Created citation with ID: {db_citation.id}")
    return db_citation

@app.get("/citations/", response_model=List[schemas.Citation])
async def read_citations(skip: int = 0, limit: int = 100, project_id: int = None, db: AsyncSession = Depends(get_db())):
    query = select(models.Citation)
    if project_id is not None:
        query = query.where(models.Citation.project_id == project_id)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    citations = result.scalars().all()
    return citations

@app.get("/citations/{citation_id}", response_model=schemas.Citation)
async def read_citation(citation_id: int, db: AsyncSession = Depends(get_db())):
    result = await db.execute(select(models.Citation).where(models.Citation.id == citation_id))
    citation = result.scalar_one_or_none()
    if not citation:
        raise HTTPException(status_code=404, detail="Citation not found")
    return citation

@app.put("/citations/{citation_id}", response_model=schemas.Citation)
async def update_citation(citation_id: int, citation: schemas.CitationCreate, db: AsyncSession = Depends(get_db())):
        db_citation = await db.get(models.Citation, citation_id)
        if not db_citation:
            raise HTTPException(status_code=404, detail="Citation not found")
        for key, value in citation.dict().items():
            setattr(db_citation, key, value)
        await db.commit()
        await db.refresh(db_citation)
        return db_citation

@app.delete("/citations/{citation_id}")
async def delete_citation(citation_id: int, db: AsyncSession = Depends(get_db())):
    result = await db.execute(select(models.Citation).where(models.Citation.id == citation_id))
    db_citation = result.scalar_one_or_none()
    if not db_citation:
        raise HTTPException(status_code=404, detail="Citation not found")
    await db.delete(db_citation)
    await db.commit()
    return {"ok": True}

# --- SourceMaterial Endpoints ---
@app.post("/source_materials/", response_model=schemas.SourceMaterial)
async def create_source_material(sm: schemas.SourceMaterialCreate, db: AsyncSession = Depends(get_db())):
    print(f"[backend] Creating source material: {sm.dict()}")
    db_sm = models.SourceMaterial(**sm.dict())
    db.add(db_sm)
    await db.commit()
    await db.refresh(db_sm)
    print(f"[backend] Created source material with ID: {db_sm.id}, citation_id: {db_sm.citation_id}")
    return db_sm

@app.get("/source_materials/", response_model=List[schemas.SourceMaterial])
async def read_source_materials(skip: int = 0, limit: int = 100, project_id: int = None, db: AsyncSession = Depends(get_db())):
    query = select(models.SourceMaterial)
    if project_id is not None:
        query = query.where(models.SourceMaterial.project_id == project_id)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    source_materials = result.scalars().all()
    return source_materials

@app.get("/source_materials/{sm_id}", response_model=schemas.SourceMaterial)
async def read_source_material(sm_id: int, db: AsyncSession = Depends(get_db())):
    result = await db.execute(select(models.SourceMaterial).where(models.SourceMaterial.id == sm_id))
    sm = result.scalar_one_or_none()
    if not sm:
        raise HTTPException(status_code=404, detail="SourceMaterial not found")
    return sm

@app.put("/source_materials/{sm_id}", response_model=schemas.SourceMaterial)
async def update_source_material(sm_id: int, sm: schemas.SourceMaterialCreate, db: AsyncSession = Depends(get_db())):
    result = await db.execute(select(models.SourceMaterial).where(models.SourceMaterial.id == sm_id))
    db_sm = result.scalar_one_or_none()
    if not db_sm:
        raise HTTPException(status_code=404, detail="SourceMaterial not found")
    for key, value in sm.dict().items():
        setattr(db_sm, key, value)
    await db.commit()
    await db.refresh(db_sm)
    return db_sm

@app.delete("/source_materials/{sm_id}")
async def delete_source_material(sm_id: int, db: AsyncSession = Depends(get_db())):
    result = await db.execute(select(models.SourceMaterial).where(models.SourceMaterial.id == sm_id))
    db_sm = result.scalar_one_or_none()
    if not db_sm:
        raise HTTPException(status_code=404, detail="SourceMaterial not found")
    
    # Clean up associated files from R2
    if db_sm.files:
        file_urls = db_sm.files.split(',')
        for file_url in file_urls:
            file_url = file_url.strip()
            if file_url:
                key = r2_storage.extract_key_from_url(file_url)
                if key:
                    await r2_storage.delete_file(key)
    
    await db.delete(db_sm)
    await db.commit()
    return {"ok": True}

# --- SourceMaterial File Upload Endpoint ---
@app.post("/source_materials/upload_file/")
async def upload_source_material_files(
    source_material_id: int = Form(...),
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db()),
    current_user: models.User = Depends(get_current_user)
):
    # Find the source material
    result = await db.execute(select(models.SourceMaterial).where(models.SourceMaterial.id == source_material_id))
    db_sm = result.scalar_one_or_none()
    if db_sm is None:
        raise HTTPException(status_code=404, detail="SourceMaterial not found")

    # Upload files to R2
    upload_results = await r2_storage.upload_multiple_files(files, folder="source-materials")
    uploaded_urls = [result["file_url"] for result in upload_results]
    uploaded_filenames = [result["filename"] for result in upload_results]

    # Update the files field (append new files)
    existing_files = db_sm.files.split(",") if db_sm.files else []
    all_files = existing_files + uploaded_urls
    db_sm.files = ",".join([f.strip() for f in all_files if f.strip()])
    
    # Update the file_filenames field (append new filenames)
    existing_filenames = db_sm.file_filenames.split(",") if db_sm.file_filenames else []
    all_filenames = existing_filenames + uploaded_filenames
    db_sm.file_filenames = ",".join([f.strip() for f in all_filenames if f.strip()])
    
    await db.commit()
    await db.refresh(db_sm)
    return {
        "file_urls": uploaded_urls, 
        "file_filenames": uploaded_filenames,
        "all_files": all_files
    }

# --- Question Endpoints ---
@app.post("/questions/", response_model=schemas.Question)
async def create_question(question: schemas.QuestionCreate, db: AsyncSession = Depends(get_db())):
    db_question = models.Question(**question.dict())
    db.add(db_question)
    await db.commit()
    await db.refresh(db_question)
    return db_question

@app.get("/questions/", response_model=List[schemas.Question])
async def read_questions(skip: int = 0, limit: int = 100, project_id: int = None, db: AsyncSession = Depends(get_db())):
    query = select(models.Question)
    if project_id is not None:
        query = query.where(models.Question.project_id == project_id)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@app.get("/questions/{question_id}", response_model=schemas.Question)
async def read_question(question_id: int, db: AsyncSession = Depends(get_db())):
    query = select(models.Question).where(models.Question.id == question_id)
    result = await db.execute(query)
    question = result.scalar_one_or_none()
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found")
    return question

@app.put("/questions/{question_id}", response_model=schemas.Question)
async def update_question(question_id: int, question: schemas.QuestionUpdate, db: AsyncSession = Depends(get_db())):
    query = select(models.Question).where(models.Question.id == question_id)
    result = await db.execute(query)
    db_question = result.scalar_one_or_none()
    if db_question is None:
        raise HTTPException(status_code=404, detail="Question not found")
    
    for field, value in question.dict(exclude_unset=True).items():
        setattr(db_question, field, value)
    
    await db.commit()
    await db.refresh(db_question)
    return db_question

@app.delete("/questions/{question_id}")
async def delete_question(question_id: int, db: AsyncSession = Depends(get_db())):
    query = select(models.Question).where(models.Question.id == question_id)
    result = await db.execute(query)
    question = result.scalar_one_or_none()
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Clean up associated files from R2
    if question.files:
        print(f"[DELETE] Cleaning up files for question {question_id}: {question.files}")
        file_urls = question.files.split(',')
        for file_url in file_urls:
            file_url = file_url.strip()
            if file_url:
                key = r2_storage.extract_key_from_url(file_url)
                if key:
                    print(f"[DELETE] Deleting file from R2: {key}")
                    await r2_storage.delete_file(key)
                else:
                    print(f"[DELETE] Could not extract key from URL: {file_url}")
    
    await db.delete(question)
    await db.commit()
    return {"message": "Question deleted"}

# --- Question File Upload/Deletion Endpoints ---
@app.post("/questions/upload_file/")
async def upload_question_files(
    question_id: int = Form(...),
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db()),
    current_user: models.User = Depends(get_current_user)
):
    # Find the question
    result = await db.execute(select(models.Question).where(models.Question.id == question_id))
    db_question = result.scalar_one_or_none()
    if db_question is None:
        raise HTTPException(status_code=404, detail="Question not found")

    # Upload files to R2
    upload_results = await r2_storage.upload_multiple_files(files, folder="questions")
    uploaded_urls = [result["file_url"] for result in upload_results]
    uploaded_filenames = [result["filename"] for result in upload_results]

    # Update the files field (append new files)
    existing_files = db_question.files.split(",") if db_question.files else []
    all_files = existing_files + uploaded_urls
    db_question.files = ",".join([f.strip() for f in all_files if f.strip()])
    
    # Update the file_filenames field (append new filenames)
    existing_filenames = db_question.file_filenames.split(",") if db_question.file_filenames else []
    all_filenames = existing_filenames + uploaded_filenames
    db_question.file_filenames = ",".join([f.strip() for f in all_filenames if f.strip()])
    
    await db.commit()
    await db.refresh(db_question)
    return {"file_urls": uploaded_urls, "file_filenames": uploaded_filenames, "all_files": all_files}

@app.post("/questions/delete_file/")
async def delete_question_file(
    question_id: int,
    file_url: str,
    db: AsyncSession = Depends(get_db())
):
    # Find the question
    result = await db.execute(select(models.Question).where(models.Question.id == question_id))
    db_question = result.scalar_one_or_none()
    if db_question is None:
        raise HTTPException(status_code=404, detail="Question not found")

    # Remove file from R2
    key = r2_storage.extract_key_from_url(file_url)
    if key:
        await r2_storage.delete_file(key)

    # Remove file from files field and file_filenames field
    existing_files = db_question.files.split(",") if db_question.files else []
    existing_filenames = db_question.file_filenames.split(",") if db_question.file_filenames else []
    
    # Find the index of the file to remove
    try:
        file_index = existing_files.index(file_url.strip())
        # Remove from both arrays at the same index
        new_files = [f for i, f in enumerate(existing_files) if i != file_index]
        new_filenames = [f for i, f in enumerate(existing_filenames) if i != file_index]
    except ValueError:
        # File not found, just return current state
        new_files = existing_files
        new_filenames = existing_filenames
    
    db_question.files = ",".join(new_files)
    db_question.file_filenames = ",".join(new_filenames)
    await db.commit()
    await db.refresh(db_question)
    return {"ok": True, "remaining_files": new_files}

# --- Insight Endpoints ---
@app.post("/insights/", response_model=schemas.Insight)
async def create_insight(insight: schemas.InsightCreate, db: AsyncSession = Depends(get_db())):
    db_insight = models.Insight(**insight.dict())
    db.add(db_insight)
    await db.commit()
    await db.refresh(db_insight)
    return db_insight

@app.get("/insights/", response_model=List[schemas.Insight])
async def read_insights(skip: int = 0, limit: int = 100, project_id: int = None, db: AsyncSession = Depends(get_db())):
    query = select(models.Insight)
    if project_id is not None:
        query = query.where(models.Insight.project_id == project_id)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@app.get("/insights/{insight_id}", response_model=schemas.Insight)
async def read_insight(insight_id: int, db: AsyncSession = Depends(get_db())):
    query = select(models.Insight).where(models.Insight.id == insight_id)
    result = await db.execute(query)
    insight = result.scalar_one_or_none()
    if insight is None:
        raise HTTPException(status_code=404, detail="Insight not found")
    return insight

@app.put("/insights/{insight_id}", response_model=schemas.Insight)
async def update_insight(insight_id: int, insight: schemas.InsightUpdate, db: AsyncSession = Depends(get_db())):
    print(f"[backend] /insights/{{insight_id}} PUT body: {insight.dict()}")
    print(f"[backend] /insights/{{insight_id}} tags: {insight.tags} type: {type(insight.tags)}")
    query = select(models.Insight).where(models.Insight.id == insight_id)
    result = await db.execute(query)
    db_insight = result.scalar_one_or_none()
    if db_insight is None:
        raise HTTPException(status_code=404, detail="Insight not found")
    
    for field, value in insight.dict(exclude_unset=True).items():
        setattr(db_insight, field, value)
    
    await db.commit()
    await db.refresh(db_insight)
    return db_insight

@app.delete("/insights/{insight_id}")
async def delete_insight(insight_id: int, db: AsyncSession = Depends(get_db())):
    query = select(models.Insight).where(models.Insight.id == insight_id)
    result = await db.execute(query)
    insight = result.scalar_one_or_none()
    if insight is None:
        raise HTTPException(status_code=404, detail="Insight not found")
    
    # Clean up associated files from R2
    if insight.files:
        print(f"[DELETE] Cleaning up files for insight {insight_id}: {insight.files}")
        file_urls = insight.files.split(',')
        for file_url in file_urls:
            file_url = file_url.strip()
            if file_url:
                key = r2_storage.extract_key_from_url(file_url)
                if key:
                    print(f"[DELETE] Deleting file from R2: {key}")
                    await r2_storage.delete_file(key)
                else:
                    print(f"[DELETE] Could not extract key from URL: {file_url}")
    
    await db.delete(insight)
    await db.commit()
    return {"message": "Insight deleted"}

# --- Thought Endpoints ---
@app.post("/thoughts/", response_model=schemas.Thought)
async def create_thought(thought: schemas.ThoughtCreate, db: AsyncSession = Depends(get_db())):
    db_thought = models.Thought(**thought.dict())
    db.add(db_thought)
    await db.commit()
    await db.refresh(db_thought)
    return db_thought

@app.get("/thoughts/", response_model=List[schemas.Thought])
async def read_thoughts(skip: int = 0, limit: int = 100, project_id: int = None, db: AsyncSession = Depends(get_db())):
    query = select(models.Thought)
    if project_id is not None:
        query = query.where(models.Thought.project_id == project_id)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@app.get("/thoughts/{thought_id}", response_model=schemas.Thought)
async def read_thought(thought_id: int, db: AsyncSession = Depends(get_db())):
    query = select(models.Thought).where(models.Thought.id == thought_id)
    result = await db.execute(query)
    thought = result.scalar_one_or_none()
    if thought is None:
        raise HTTPException(status_code=404, detail="Thought not found")
    return thought

@app.put("/thoughts/{thought_id}", response_model=schemas.Thought)
async def update_thought(thought_id: int, thought: schemas.ThoughtUpdate, db: AsyncSession = Depends(get_db())):
    print(f"[backend] /thoughts/{{thought_id}} PUT body: {thought.dict()}")
    print(f"[backend] /thoughts/{{thought_id}} tags: {thought.tags} type: {type(thought.tags)}")
    query = select(models.Thought).where(models.Thought.id == thought_id)
    result = await db.execute(query)
    db_thought = result.scalar_one_or_none()
    if db_thought is None:
        raise HTTPException(status_code=404, detail="Thought not found")
    
    for field, value in thought.dict(exclude_unset=True).items():
        setattr(db_thought, field, value)
    
    await db.commit()
    await db.refresh(db_thought)
    return db_thought

@app.delete("/thoughts/{thought_id}")
async def delete_thought(thought_id: int, db: AsyncSession = Depends(get_db())):
    query = select(models.Thought).where(models.Thought.id == thought_id)
    result = await db.execute(query)
    thought = result.scalar_one_or_none()
    if thought is None:
        raise HTTPException(status_code=404, detail="Thought not found")
    
    # Clean up associated files from R2
    if thought.files:
        print(f"[DELETE] Cleaning up files for thought {thought_id}: {thought.files}")
        file_urls = thought.files.split(',')
        for file_url in file_urls:
            file_url = file_url.strip()
            if file_url:
                key = r2_storage.extract_key_from_url(file_url)
                if key:
                    print(f"[DELETE] Deleting file from R2: {key}")
                    await r2_storage.delete_file(key)
                else:
                    print(f"[DELETE] Could not extract key from URL: {file_url}")
    
    await db.delete(thought)
    await db.commit()
    return {"message": "Thought deleted"}

# --- Claim Endpoints ---
@app.post("/claims/", response_model=schemas.Claim)
async def create_claim(claim: schemas.ClaimCreate, db: AsyncSession = Depends(get_db())):
    db_claim = models.Claim(**claim.dict())
    db.add(db_claim)
    await db.commit()
    await db.refresh(db_claim)
    return db_claim

@app.get("/claims/", response_model=List[schemas.Claim])
async def read_claims(skip: int = 0, limit: int = 100, project_id: int = None, db: AsyncSession = Depends(get_db())):
    query = select(models.Claim)
    if project_id is not None:
        query = query.where(models.Claim.project_id == project_id)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@app.get("/claims/{claim_id}", response_model=schemas.Claim)
async def read_claim(claim_id: int, db: AsyncSession = Depends(get_db())):
    query = select(models.Claim).where(models.Claim.id == claim_id)
    result = await db.execute(query)
    claim = result.scalar_one_or_none()
    if claim is None:
        raise HTTPException(status_code=404, detail="Claim not found")
    return claim

@app.put("/claims/{claim_id}", response_model=schemas.Claim)
async def update_claim(claim_id: int, claim: schemas.ClaimUpdate, db: AsyncSession = Depends(get_db())):
    print(f"[backend] /claims/{{claim_id}} PUT body: {claim.dict()}")
    print(f"[backend] /claims/{{claim_id}} tags: {claim.tags} type: {type(claim.tags)}")
    query = select(models.Claim).where(models.Claim.id == claim_id)
    result = await db.execute(query)
    db_claim = result.scalar_one_or_none()
    if db_claim is None:
        raise HTTPException(status_code=404, detail="Claim not found")
    for field, value in claim.dict(exclude_unset=True).items():
        setattr(db_claim, field, value)
    await db.commit()
    await db.refresh(db_claim)
    return db_claim

@app.delete("/claims/{claim_id}")
async def delete_claim(claim_id: int, db: AsyncSession = Depends(get_db())):
    query = select(models.Claim).where(models.Claim.id == claim_id)
    result = await db.execute(query)
    claim = result.scalar_one_or_none()
    if claim is None:
        raise HTTPException(status_code=404, detail="Claim not found")
    await db.delete(claim)
    await db.commit()
    return {"message": "Claim deleted"}

# --- Card Endpoints ---
@app.post("/cards/", response_model=schemas.Card)
async def create_card(card: schemas.CardCreate, db: AsyncSession = Depends(get_db())):
    db_card = models.Card(**card.dict())
    db.add(db_card)
    await db.commit()
    await db.refresh(db_card)
    
    # Update project status to "in_progress" if this is the first card
    project_result = await db.execute(select(models.Project).where(models.Project.id == card.project_id))
    project = project_result.scalar_one_or_none()
    if project and project.status == "not_started":
        project.status = "in_progress"
        await db.commit()
    
    return db_card

@app.get("/cards/", response_model=List[schemas.Card])
async def read_cards(skip: int = 0, limit: int = 100, project_id: int = None, db: AsyncSession = Depends(get_db())):
    query = select(models.Card)
    if project_id is not None:
        query = query.where(models.Card.project_id == project_id)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@app.get("/cards/{card_id}", response_model=schemas.Card)
async def read_card(card_id: int, db: AsyncSession = Depends(get_db())):
    result = await db.execute(select(models.Card).where(models.Card.id == card_id))
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card

@app.put("/cards/{card_id}", response_model=schemas.Card)
async def update_card(card_id: int, card: schemas.CardUpdate, db: AsyncSession = Depends(get_db())):
    db_card = await db.get(models.Card, card_id)
    if not db_card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    # Only update fields that are provided
    update_data = card.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(db_card, key, value)
    
    await db.commit()
    await db.refresh(db_card)
    return db_card

@app.delete("/cards/{card_id}")
async def delete_card(card_id: int, db: AsyncSession = Depends(get_db())):
    try:
        result = await db.execute(select(models.Card).where(models.Card.id == card_id))
        db_card = result.scalar_one_or_none()
        if not db_card:
            return {"ok": True}  # Already deleted, treat as success

        # Delete the underlying data based on card type
        if db_card.data_id:
            if db_card.type == "source":
                # Delete source material (this will cascade to citation and clean up files)
                sm_result = await db.execute(select(models.SourceMaterial).where(models.SourceMaterial.id == db_card.data_id))
                db_sm = sm_result.scalar_one_or_none()
                if db_sm:
                    # Clean up associated files from R2
                    if db_sm.files:
                        file_urls = db_sm.files.split(',')
                        for file_url in file_urls:
                            file_url = file_url.strip()
                            if file_url:
                                key = r2_storage.extract_key_from_url(file_url)
                                if key:
                                    await r2_storage.delete_file(key)
                    await db.delete(db_sm)
            elif db_card.type == "question":
                question_result = await db.execute(select(models.Question).where(models.Question.id == db_card.data_id))
                db_question = question_result.scalar_one_or_none()
                if db_question:
                    # Clean up associated files from R2
                    if db_question.files:
                        file_urls = db_question.files.split(',')
                        for file_url in file_urls:
                            file_url = file_url.strip()
                            if file_url:
                                key = r2_storage.extract_key_from_url(file_url)
                                if key:
                                    await r2_storage.delete_file(key)
                    await db.delete(db_question)
            elif db_card.type == "insight":
                insight_result = await db.execute(select(models.Insight).where(models.Insight.id == db_card.data_id))
                db_insight = insight_result.scalar_one_or_none()
                if db_insight:
                    # Clean up associated files from R2
                    if db_insight.files:
                        file_urls = db_insight.files.split(',')
                        for file_url in file_urls:
                            file_url = file_url.strip()
                            if file_url:
                                key = r2_storage.extract_key_from_url(file_url)
                                if key:
                                    await r2_storage.delete_file(key)
                    await db.delete(db_insight)
            elif db_card.type == "thought":
                thought_result = await db.execute(select(models.Thought).where(models.Thought.id == db_card.data_id))
                db_thought = thought_result.scalar_one_or_none()
                if db_thought:
                    # Clean up associated files from R2
                    if db_thought.files:
                        file_urls = db_thought.files.split(',')
                        for file_url in file_urls:
                            file_url = file_url.strip()
                            if file_url:
                                key = r2_storage.extract_key_from_url(file_url)
                                if key:
                                    await r2_storage.delete_file(key)
                    await db.delete(db_thought)
            elif db_card.type == "claim":
                claim_result = await db.execute(select(models.Claim).where(models.Claim.id == db_card.data_id))
                db_claim = claim_result.scalar_one_or_none()
                if db_claim:
                    # Clean up associated files from R2
                    if db_claim.files:
                        file_urls = db_claim.files.split(',')
                        for file_url in file_urls:
                            file_url = file_url.strip()
                            if file_url:
                                key = r2_storage.extract_key_from_url(file_url)
                                if key:
                                    await r2_storage.delete_file(key)
                    await db.delete(db_claim)

        # Manually delete related CardLink rows
        # Store project_id before deleting the card
        project_id = db_card.project_id
        
        await db.execute(sa_delete(models.CardLink).where(
            (models.CardLink.source_card_id == card_id) | (models.CardLink.target_card_id == card_id)
        ))

        await db.delete(db_card)
        await db.commit()
        
        # Check if this was the last card in the project
        remaining_cards = await db.execute(select(models.Card).where(models.Card.project_id == project_id))
        if not remaining_cards.scalars().first():
            # No cards left, update project status to "not_started"
            project_result = await db.execute(select(models.Project).where(models.Project.id == project_id))
            project = project_result.scalar_one_or_none()
            if project:
                project.status = "not_started"
                await db.commit()
        
        return {"ok": True}
    except StaleDataError:
        await db.rollback()
        return {"ok": True}
    except Exception as e:
        await db.rollback()
        print(f"Error deleting card {card_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# --- CardLink Endpoints ---
@app.post("/card_links/", response_model=schemas.CardLink)
async def create_card_link(link: schemas.CardLinkCreate, db: AsyncSession = Depends(get_db()), request: Request = None):
    print(f"Incoming card link payload: {link}")
    # Check if source card exists
    source_card = await db.get(models.Card, link.source_card_id)
    if not source_card:
        print(f"Source card with id {link.source_card_id} does not exist.")
        raise HTTPException(status_code=400, detail=f"Source card with id {link.source_card_id} does not exist.")
    # Check if target card exists
    target_card = await db.get(models.Card, link.target_card_id)
    if not target_card:
        print(f"Target card with id {link.target_card_id} does not exist.")
        raise HTTPException(status_code=400, detail=f"Target card with id {link.target_card_id} does not exist.")
    # Check if project exists
    project = await db.get(models.Project, link.project_id)
    if not project:
        print(f"Project with id {link.project_id} does not exist.")
        raise HTTPException(status_code=400, detail=f"Project with id {link.project_id} does not exist.")
    # Check if this link already exists
    existing_link = await db.execute(
        select(models.CardLink).where(
            models.CardLink.source_card_id == link.source_card_id,
            models.CardLink.target_card_id == link.target_card_id,
            models.CardLink.project_id == link.project_id
        )
    )
    existing_link = existing_link.scalar_one_or_none()
    if existing_link:
        print(f"Link already exists: {existing_link}")
        return existing_link
    # Create new link
    db_link = models.CardLink(**link.dict())
    db.add(db_link)
    await db.commit()
    await db.refresh(db_link)
    print(f"Created new card link: {db_link}")
    return db_link

@app.get("/card_links/", response_model=List[schemas.CardLink])
async def read_card_links(skip: int = 0, limit: int = 100, project_id: int = None, db: AsyncSession = Depends(get_db())):
    query = select(models.CardLink)
    if project_id is not None:
        query = query.where(models.CardLink.project_id == project_id)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@app.get("/card_links/{link_id}", response_model=schemas.CardLink)
def read_card_link(link_id: int, db: AsyncSession = Depends(get_db())):
    async def _read_card_link():
        result = await db.execute(models.CardLink.__table__.select().where(models.CardLink.id == link_id))
        link = result.scalar_one_or_none()
        if not link:
            raise HTTPException(status_code=404, detail="CardLink not found")
        return link
    return _read_card_link()

@app.put("/card_links/{link_id}", response_model=schemas.CardLink)
def update_card_link(link_id: int, link: schemas.CardLinkCreate, db: AsyncSession = Depends(get_db())):
    async def _update_card_link():
        result = await db.execute(models.CardLink.__table__.select().where(models.CardLink.id == link_id))
        db_link = result.scalar_one_or_none()
        if not db_link:
            raise HTTPException(status_code=404, detail="CardLink not found")
        for key, value in link.dict().items():
            setattr(db_link, key, value)
        await db.commit()
        await db.refresh(db_link)
        return db_link
    return _update_card_link()

@app.delete("/card_links/{link_id}")
async def delete_card_link(link_id: int, db: AsyncSession = Depends(get_db())):
    db_link = await db.get(models.CardLink, link_id)
    if not db_link:
        raise HTTPException(status_code=404, detail="CardLink not found")
    await db.delete(db_link)
    await db.commit()
    return {"ok": True}

# --- Project Endpoints ---
@app.post("/projects/", response_model=ProjectSchema, status_code=status.HTTP_201_CREATED)
async def create_project(project: ProjectCreate, db: Session = Depends(get_sync_db), current_user: User = Depends(get_current_user)):
    db_project = Project(
        name=project.name,
        class_subject=project.class_subject,
        paper_type=project.paper_type,
        due_date=project.due_date,
        status=project.status or "not_started",
        assignment_file=project.assignment_file,
        user_id=current_user.id
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@app.get("/projects/", response_model=List[ProjectSchema])
async def read_projects(skip: int = 0, limit: int = 100, db: Session = Depends(get_sync_db), current_user: User = Depends(get_current_user)):
    result = db.execute(select(Project).where(Project.user_id == current_user.id).offset(skip).limit(limit))
    return result.scalars().all()

@app.get("/projects/{project_id}", response_model=schemas.Project)
async def read_project(project_id: int, db: AsyncSession = Depends(get_db())):
    result = await db.execute(select(models.Project).where(models.Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@app.put("/projects/{project_id}", response_model=schemas.Project)
async def update_project(project_id: int, project_update: schemas.ProjectUpdate, db: Session = Depends(get_sync_db), current_user: User = Depends(get_current_user)):
    # Find the project and verify ownership
    result = db.execute(select(Project).where(Project.id == project_id, Project.user_id == current_user.id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or you don't have permission to update it")
    
    # Update only the fields that are provided
    update_data = project_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    db.commit()
    db.refresh(project)
    return project

@app.delete("/projects/{project_id}")
async def delete_project(project_id: int, db: Session = Depends(get_sync_db), current_user: User = Depends(get_current_user)):
    # Find the project and verify ownership
    result = db.execute(select(Project).where(Project.id == project_id, Project.user_id == current_user.id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or you don't have permission to delete it")
    
    # Delete the project (cascade will handle related data)
    db.delete(project)
    db.commit()
    
    return {"message": "Project deleted successfully"}

# User and auth routes
app.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/auth/jwt",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)

# Register the cookie login route
app.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/auth/cookie",
    tags=["auth"],
)
# If you want to disable JWT login, comment out the JWT login route registration if present.

# --- File Upload Endpoints ---
@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    """Upload a file to R2 and return the file URL"""
    try:
        # Upload file to R2
        result = await r2_storage.upload_file(file, folder="general")
        
        return {
            "filename": result["filename"], 
            "file_url": result["file_url"], 
            "key": result["key"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

@app.delete("/upload/{filename}")
async def delete_file(filename: str):
    """Delete an uploaded file"""
    try:
        file_path = UPLOAD_DIR / filename
        if file_path.exists():
            file_path.unlink()
            return {"message": "File deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File deletion failed: {str(e)}")

# --- Project Assignment File Upload/Deletion Endpoints ---
@app.post("/projects/upload_assignment/")
async def upload_project_assignment(
    project_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_sync_db),
    current_user: models.User = Depends(get_current_user)
):
    """Upload an assignment file for a project"""
    try:
        # Find the project and verify ownership
        result = db.execute(select(Project).where(Project.id == project_id, Project.user_id == current_user.id))
        project = result.scalar_one_or_none()
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found or you don't have permission to update it")
        
        # Upload file to R2
        result = await r2_storage.upload_file(file, folder="assignments")
        
        # Update project with the file URL and original filename
        project.assignment_file = result["file_url"]
        project.assignment_filename = result["filename"]
        db.commit()
        db.refresh(project)
        
        return {
            "filename": result["filename"], 
            "file_url": result["file_url"], 
            "key": result["key"],
            "project": project
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

@app.post("/projects/delete_assignment/")
async def delete_project_assignment(
    project_id: int,
    db: Session = Depends(get_sync_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete the assignment file for a project"""
    try:
        # Find the project and verify ownership
        result = db.execute(select(Project).where(Project.id == project_id, Project.user_id == current_user.id))
        project = result.scalar_one_or_none()
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found or you don't have permission to update it")
        
        if not project.assignment_file:
            raise HTTPException(status_code=404, detail="No assignment file found for this project")
        
        # Extract key from URL for deletion
        file_url = project.assignment_file
        key = r2_storage.extract_key_from_url(file_url)
        
        # Delete from R2
        if key:
            await r2_storage.delete_file(key)
        
        # Clear the assignment_file field
        project.assignment_file = None
        project.assignment_filename = None
        db.commit()
        db.refresh(project)
        
        return {"message": "Assignment file deleted successfully", "project": project}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File deletion failed: {str(e)}")

# --- Insight File Upload/Deletion Endpoints ---
@app.post("/insights/upload_file/")
async def upload_insight_files(
    insight_id: int = Form(...),
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db()),
    current_user: models.User = Depends(get_current_user)
):
    # Find the insight
    result = await db.execute(select(models.Insight).where(models.Insight.id == insight_id))
    db_insight = result.scalar_one_or_none()
    if db_insight is None:
        raise HTTPException(status_code=404, detail="Insight not found")

    # Upload files to R2
    upload_results = await r2_storage.upload_multiple_files(files, folder="insights")
    uploaded_urls = [result["file_url"] for result in upload_results]
    uploaded_filenames = [result["filename"] for result in upload_results]

    # Update the files field (append new files)
    existing_files = db_insight.files.split(",") if db_insight.files else []
    all_files = existing_files + uploaded_urls
    db_insight.files = ",".join([f.strip() for f in all_files if f.strip()])
    
    # Update the file_filenames field (append new filenames)
    existing_filenames = db_insight.file_filenames.split(",") if db_insight.file_filenames else []
    all_filenames = existing_filenames + uploaded_filenames
    db_insight.file_filenames = ",".join([f.strip() for f in all_filenames if f.strip()])
    
    await db.commit()
    await db.refresh(db_insight)
    return {"file_urls": uploaded_urls, "file_filenames": uploaded_filenames, "all_files": all_files}

@app.post("/insights/delete_file/")
async def delete_insight_file(
    insight_id: int,
    file_url: str,
    db: AsyncSession = Depends(get_db())
):
    # Find the insight
    result = await db.execute(select(models.Insight).where(models.Insight.id == insight_id))
    db_insight = result.scalar_one_or_none()
    if db_insight is None:
        raise HTTPException(status_code=404, detail="Insight not found")

    # Remove file from R2
    key = r2_storage.extract_key_from_url(file_url)
    if key:
        await r2_storage.delete_file(key)

    # Remove file from files field and file_filenames field
    existing_files = db_insight.files.split(",") if db_insight.files else []
    existing_filenames = db_insight.file_filenames.split(",") if db_insight.file_filenames else []
    
    # Find the index of the file to remove
    try:
        file_index = existing_files.index(file_url.strip())
        # Remove from both arrays at the same index
        new_files = [f for i, f in enumerate(existing_files) if i != file_index]
        new_filenames = [f for i, f in enumerate(existing_filenames) if i != file_index]
    except ValueError:
        # File not found, just return current state
        new_files = existing_files
        new_filenames = existing_filenames
    
    db_insight.files = ",".join(new_files)
    db_insight.file_filenames = ",".join(new_filenames)
    await db.commit()
    await db.refresh(db_insight)
    return {"ok": True, "remaining_files": new_files}

# --- Thought File Upload/Deletion Endpoints ---
@app.post("/thoughts/upload_file/")
async def upload_thought_files(
    thought_id: int = Form(...),
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db()),
    current_user: models.User = Depends(get_current_user)
):
    print(f"[UPLOAD] Received upload for thought_id={thought_id}, files={[f.filename for f in files]}")
    result = await db.execute(select(models.Thought).where(models.Thought.id == thought_id))
    db_thought = result.scalar_one_or_none()
    if db_thought is None:
        print(f"[UPLOAD] Thought not found for id={thought_id}")
        raise HTTPException(status_code=404, detail="Thought not found")

    # Upload files to R2
    upload_results = await r2_storage.upload_multiple_files(files, folder="thoughts")
    uploaded_urls = [result["file_url"] for result in upload_results]
    uploaded_filenames = [result["filename"] for result in upload_results]

    # Update the files field (append new files)
    existing_files = db_thought.files.split(",") if db_thought.files else []
    all_files = existing_files + uploaded_urls
    db_thought.files = ",".join([f.strip() for f in all_files if f.strip()])
    
    # Update the file_filenames field (append new filenames)
    existing_filenames = db_thought.file_filenames.split(",") if db_thought.file_filenames else []
    all_filenames = existing_filenames + uploaded_filenames
    db_thought.file_filenames = ",".join([f.strip() for f in all_filenames if f.strip()])
    
    await db.commit()
    await db.refresh(db_thought)
    return {"file_urls": uploaded_urls, "file_filenames": uploaded_filenames, "all_files": all_files}

@app.post("/thoughts/delete_file/")
async def delete_thought_file(
    thought_id: int,
    file_url: str,
    db: AsyncSession = Depends(get_db())
):
    # Find the thought
    result = await db.execute(select(models.Thought).where(models.Thought.id == thought_id))
    db_thought = result.scalar_one_or_none()
    if db_thought is None:
        raise HTTPException(status_code=404, detail="Thought not found")

    # Remove file from R2
    key = r2_storage.extract_key_from_url(file_url)
    if key:
        await r2_storage.delete_file(key)

    # Remove file from files field and file_filenames field
    existing_files = db_thought.files.split(",") if db_thought.files else []
    existing_filenames = db_thought.file_filenames.split(",") if db_thought.file_filenames else []
    
    # Find the index of the file to remove
    try:
        file_index = existing_files.index(file_url.strip())
        # Remove from both arrays at the same index
        new_files = [f for i, f in enumerate(existing_files) if i != file_index]
        new_filenames = [f for i, f in enumerate(existing_filenames) if i != file_index]
    except ValueError:
        # File not found, just return current state
        new_files = existing_files
        new_filenames = existing_filenames
    
    db_thought.files = ",".join(new_files)
    db_thought.file_filenames = ",".join(new_filenames)
    await db.commit()
    await db.refresh(db_thought)
    return {"ok": True, "remaining_files": new_files}

@app.get("/users/me/custom-options", response_model=List[schemas.UserCustomOptionRead])
def read_user_custom_options(option_type: str = None, db: Session = Depends(get_sync_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_user_custom_options(db, user_id=current_user.id, option_type=option_type)

@app.post("/users/me/custom-options", response_model=schemas.UserCustomOptionRead)
def create_user_custom_option(option: schemas.UserCustomOptionCreate, db: Session = Depends(get_sync_db), current_user: models.User = Depends(get_current_user)):
    return crud.create_user_custom_option(
        db=db,
        user_id=current_user.id,
        option_type=option.option_type,
        value=option.value
    )

@app.put("/users/me/custom-options/{option_id}", response_model=schemas.UserCustomOptionRead)
def update_user_custom_option(option_id: int, option: schemas.UserCustomOptionUpdate, db: Session = Depends(get_sync_db), current_user: models.User = Depends(get_current_user)):
    updated_option = crud.update_user_custom_option(
        db=db,
        option_id=option_id,
        user_id=current_user.id,
        value=option.value,
        option_type=option.option_type
    )
    if not updated_option:
        raise HTTPException(status_code=404, detail="Custom option not found")
    return updated_option

@app.delete("/users/me/custom-options/{option_id}")
def delete_user_custom_option(option_id: int, db: Session = Depends(get_sync_db), current_user: models.User = Depends(get_current_user)):
    option = db.query(models.UserCustomOption).filter_by(id=option_id, user_id=current_user.id).first()
    if not option:
        raise HTTPException(status_code=404, detail="Custom option not found")
    db.delete(option)
    db.commit()
    return {"ok": True}

# --- Guided Experience Endpoints ---
@app.get("/users/me/guided-experience")
def get_guided_experience_setting(db: Session = Depends(get_sync_db), current_user: models.User = Depends(get_current_user)):
    """Get the guided experience setting for the current user"""
    option = crud.get_guided_experience_setting(db, current_user.id)
    if option:
        return {"guided": option.value.lower() == "true"}
    else:
        # Default to true if no setting exists
        return {"guided": True}

class GuidedExperienceUpdate(BaseModel):
    guided: bool

@app.put("/users/me/guided-experience")
def update_guided_experience_setting(
    update_data: GuidedExperienceUpdate,
    db: Session = Depends(get_sync_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Update the guided experience setting for the current user"""
    option = crud.set_guided_experience_setting(db, current_user.id, update_data.guided)
    return {"guided": option.value.lower() == "true"}

# --- Password Reset Endpoints ---
@app.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_sync_db)):
    # Basic rate limiting - check recent requests for this email
    recent_requests = db.query(PasswordResetCode).filter(
        PasswordResetCode.user_id == models.User.id,
        models.User.email == request.email,
        PasswordResetCode.expires_at > datetime.datetime.utcnow() - datetime.timedelta(minutes=5)
    ).count()
    
    if recent_requests >= 3:
        raise HTTPException(status_code=429, detail="Too many reset requests. Please wait 5 minutes.")
    
    # Find user by email
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if not user:
        # Don't reveal if user exists or not
        return {"message": "Password reset code sent"}
    # Generate 6-digit code
    code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
    # Invalidate previous codes
    db.query(PasswordResetCode).filter(
        PasswordResetCode.user_id == user.id, 
        PasswordResetCode.used == False
    ).update({PasswordResetCode.used: True})
    
    # Store code
    reset_code = PasswordResetCode(user_id=user.id, code=code, expires_at=expires_at, used=False)
    db.add(reset_code)
    db.commit()
    
    # Send email via Mailgun
    from email_service import MailgunEmailService
    email_service = MailgunEmailService()
    email_sent = email_service.send_password_reset_email(user.email, code)
    
    if not email_sent and settings.ENV == "development":
        print(f"Password reset code for {user.email}: {code}")
    
    return {"message": "Password reset code sent"}

password_helper = PasswordHelper()

@app.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_sync_db)):
    # Find code
    code_entry = db.query(PasswordResetCode).filter(
        PasswordResetCode.code == request.token,
        PasswordResetCode.used == False,
        PasswordResetCode.expires_at > datetime.datetime.utcnow()
    ).first()
    if not code_entry:
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    user = db.query(models.User).filter(models.User.id == code_entry.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid user")
    # Set new password
    user.hashed_password = password_helper.hash(request.password)
    db.commit()
    # Mark code as used
    code_entry.used = True
    db.commit()
    return {"message": "Password reset successfully"}

# --- Tags Endpoint ---
@app.get("/projects/{project_id}/tags")
def get_project_tags(project_id: int, db: Session = Depends(get_sync_db), current_user: models.User = Depends(get_current_user)):
    """Get all unique tags from all card types in a project"""
    try:
        all_tags = set()
        # Get all source materials for this project
        source_materials = db.query(models.SourceMaterial).filter(
            models.SourceMaterial.project_id == project_id
        ).all()
        for sm in source_materials:
            if sm.tags:
                all_tags.update([tag.strip() for tag in sm.tags if tag.strip()])
        # Get all questions for this project
        questions = db.query(models.Question).filter(
            models.Question.project_id == project_id
        ).all()
        for q in questions:
            if q.tags:
                all_tags.update([tag.strip() for tag in q.tags if tag.strip()])
        # Get all insights for this project
        insights = db.query(models.Insight).filter(
            models.Insight.project_id == project_id
        ).all()
        for i in insights:
            if i.tags:
                all_tags.update([tag.strip() for tag in i.tags if tag.strip()])
        # Get all thoughts for this project
        thoughts = db.query(models.Thought).filter(
            models.Thought.project_id == project_id
        ).all()
        for t in thoughts:
            if t.tags:
                all_tags.update([tag.strip() for tag in t.tags if tag.strip()])
        # Get all claims for this project
        claims = db.query(models.Claim).filter(
            models.Claim.project_id == project_id
        ).all()
        for c in claims:
            if c.tags:
                all_tags.update([tag.strip() for tag in c.tags if tag.strip()])
        return {"tags": sorted(list(all_tags))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching tags: {str(e)}")

@app.post("/test_upload/")
async def test_upload(
    question_id: int = Form(...),
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db()),
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

@app.get("/secure-files/{folder}/{filename}")
async def get_secure_file(folder: str, filename: str, current_user=Depends(get_current_user)):
    # TODO: Add file ownership/authorization checks here if needed
    r2 = R2Storage()
    key = f"{folder}/{filename}"
    try:
        file_obj = r2.s3_client.get_object(Bucket=r2.bucket_name, Key=key)
        return StreamingResponse(file_obj['Body'], media_type=file_obj['ContentType'])
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"File not found or access denied: {str(e)}")

# --- Claim File Upload/Deletion Endpoints ---
@app.post("/claims/upload_file/")
async def upload_claim_files(
    claim_id: int = Form(...),
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db()),
    current_user: models.User = Depends(get_current_user)
):
    # Find the claim
    result = await db.execute(select(models.Claim).where(models.Claim.id == claim_id))
    db_claim = result.scalar_one_or_none()
    if db_claim is None:
        raise HTTPException(status_code=404, detail="Claim not found")

    # Upload files to R2
    upload_results = await r2_storage.upload_multiple_files(files, folder="claims")
    uploaded_urls = [result["file_url"] for result in upload_results]
    uploaded_filenames = [result["filename"] for result in upload_results]

    # Update the files field (append new files)
    existing_files = db_claim.files.split(",") if db_claim.files else []
    all_files = existing_files + uploaded_urls
    db_claim.files = ",".join([f.strip() for f in all_files if f.strip()])
    
    # Update the file_filenames field (append new filenames)
    existing_filenames = db_claim.file_filenames.split(",") if db_claim.file_filenames else []
    all_filenames = existing_filenames + uploaded_filenames
    db_claim.file_filenames = ",".join([f.strip() for f in all_filenames if f.strip()])
    
    await db.commit()
    await db.refresh(db_claim)
    return {"file_urls": uploaded_urls, "file_filenames": uploaded_filenames, "all_files": all_files}

@app.post("/claims/delete_file/")
async def delete_claim_file(
    claim_id: int,
    file_url: str,
    db: AsyncSession = Depends(get_db())
):
    # Find the claim
    result = await db.execute(select(models.Claim).where(models.Claim.id == claim_id))
    db_claim = result.scalar_one_or_none()
    if db_claim is None:
        raise HTTPException(status_code=404, detail="Claim not found")

    # Remove file from R2
    key = r2_storage.extract_key_from_url(file_url)
    if key:
        await r2_storage.delete_file(key)

    # Remove file from files field and file_filenames field
    existing_files = db_claim.files.split(",") if db_claim.files else []
    existing_filenames = db_claim.file_filenames.split(",") if db_claim.file_filenames else []
    
    # Find the index of the file to remove
    try:
        file_index = existing_files.index(file_url.strip())
        # Remove from both arrays at the same index
        new_files = [f for i, f in enumerate(existing_files) if i != file_index]
        new_filenames = [f for i, f in enumerate(existing_filenames) if i != file_index]
    except ValueError:
        # File not found, just return current state
        new_files = existing_files
        new_filenames = existing_filenames
    
    db_claim.files = ",".join(new_files)
    db_claim.file_filenames = ",".join(new_filenames)
    await db.commit()
    await db.refresh(db_claim)
    return {"ok": True, "remaining_files": new_files}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
