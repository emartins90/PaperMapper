from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from backend.database import SessionLocal, engine, Base, DATABASE_URL
from backend import models, schemas
from backend.models import User, Project, PasswordResetCode
from backend.schemas import UserRead, UserCreate, UserUpdate, Project as ProjectSchema, ProjectCreate, CardUpdate
from backend.user_db import get_user_db
from fastapi_users import FastAPIUsers
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
from backend.r2_storage import R2Storage
from dotenv import load_dotenv
from fastapi.responses import StreamingResponse

import uuid
import os
from sqlalchemy import select
from pathlib import Path
from backend import crud
import random
import datetime
from fastapi_users.router import get_auth_router

# Load environment variables from .env file
load_dotenv()

# Password reset request models
class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    password: str

SECRET = os.environ.get("JWT_SECRET", "SUPERSECRET")

# Create sync engine for sync operations
sync_engine = create_engine(DATABASE_URL.replace("+asyncpg", ""))
SyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)

class UserManager(BaseUserManager[User, int]):
    reset_password_token_secret = SECRET
    verification_token_secret = SECRET

    async def on_after_register(self, user: User, request=None):
        print(f"User {user.id} has registered.")

    async def on_after_forgot_password(self, user: User, token: str, request=None):
        print(f"User {user.id} has forgot their password. Reset token: {token}")

    async def on_after_reset_password(self, user: User, request=None):
        print(f"User {user.id} has reset their password.")

    def parse_id(self, value: str) -> int:
        return int(value)

async def get_user_manager(user_db=Depends(get_user_db)):
    yield UserManager(user_db)

def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=SECRET, lifetime_seconds=3600)

# Use cookie transport for authentication
cookie_transport = CookieTransport(cookie_name="fastapiusersauth", cookie_max_age=3600)
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
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Frontend URLs
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
    return _get_db

# Dependency to get regular DB session
def get_sync_db():
    with SyncSessionLocal() as session:
        yield session

# --- Citation Endpoints ---
@app.post("/citations/", response_model=schemas.Citation)
async def create_citation(citation: schemas.CitationCreate, db: AsyncSession = Depends(get_db())):
    db_citation = models.Citation(**citation.dict())
    db.add(db_citation)
    await db.commit()
    await db.refresh(db_citation)
    return db_citation

@app.get("/citations/", response_model=List[schemas.Citation])
async def read_citations(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db())):
    result = await db.execute(models.Citation.__table__.select().offset(skip).limit(limit))
    return result.scalars().all()

@app.get("/citations/{citation_id}", response_model=schemas.Citation)
async def read_citation(citation_id: int, db: AsyncSession = Depends(get_db())):
    result = await db.execute(models.Citation.__table__.select().where(models.Citation.id == citation_id))
    citation = result.scalar_one_or_none()
    if not citation:
        raise HTTPException(status_code=404, detail="Citation not found")
    return citation

@app.put("/citations/{citation_id}", response_model=schemas.Citation)
def update_citation(citation_id: int, citation: schemas.CitationCreate, db: AsyncSession = Depends(get_db())):
    async def _update_citation():
        db_citation = await db.get(models.Citation, citation_id)
        if not db_citation:
            raise HTTPException(status_code=404, detail="Citation not found")
        for key, value in citation.dict().items():
            setattr(db_citation, key, value)
        await db.commit()
        await db.refresh(db_citation)
        return db_citation
    return _update_citation()

@app.delete("/citations/{citation_id}")
async def delete_citation(citation_id: int, db: AsyncSession = Depends(get_db())):
    result = await db.execute(models.Citation.__table__.select().where(models.Citation.id == citation_id))
    db_citation = result.scalar_one_or_none()
    if not db_citation:
        raise HTTPException(status_code=404, detail="Citation not found")
    await db.delete(db_citation)
    await db.commit()
    return {"ok": True}

# --- SourceMaterial Endpoints ---
@app.post("/source_materials/", response_model=schemas.SourceMaterial)
async def create_source_material(sm: schemas.SourceMaterialCreate, db: AsyncSession = Depends(get_db())):
    db_sm = models.SourceMaterial(**sm.dict())
    db.add(db_sm)
    await db.commit()
    await db.refresh(db_sm)
    return db_sm

@app.get("/source_materials/", response_model=List[schemas.SourceMaterial])
async def read_source_materials(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db())):
    result = await db.execute(select(models.SourceMaterial).offset(skip).limit(limit))
    return result.scalars().all()

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
    db: AsyncSession = Depends(get_db())
):
    # Find the source material
    result = await db.execute(select(models.SourceMaterial).where(models.SourceMaterial.id == source_material_id))
    db_sm = result.scalar_one_or_none()
    if db_sm is None:
        raise HTTPException(status_code=404, detail="SourceMaterial not found")

    # Upload files to R2
    upload_results = await r2_storage.upload_multiple_files(files, folder="source-materials")
    uploaded_urls = [result["file_url"] for result in upload_results]

    # Update the files field (append new files)
    existing_files = db_sm.files.split(",") if db_sm.files else []
    all_files = existing_files + uploaded_urls
    db_sm.files = ",".join([f.strip() for f in all_files if f.strip()])
    await db.commit()
    await db.refresh(db_sm)
    return {"file_urls": uploaded_urls, "all_files": all_files}

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
    db: AsyncSession = Depends(get_db())
):
    # Find the question
    result = await db.execute(select(models.Question).where(models.Question.id == question_id))
    db_question = result.scalar_one_or_none()
    if db_question is None:
        raise HTTPException(status_code=404, detail="Question not found")

    # Upload files to R2
    upload_results = await r2_storage.upload_multiple_files(files, folder="questions")
    uploaded_urls = [result["file_url"] for result in upload_results]

    # Update the files field (append new files)
    existing_files = db_question.files.split(",") if db_question.files else []
    all_files = existing_files + uploaded_urls
    db_question.files = ",".join([f.strip() for f in all_files if f.strip()])
    await db.commit()
    await db.refresh(db_question)
    return {"file_urls": uploaded_urls, "all_files": all_files}

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

    # Remove file from files field
    existing_files = db_question.files.split(",") if db_question.files else []
    new_files = [f for f in existing_files if f.strip() != file_url.strip()]
    db_question.files = ",".join(new_files)
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

# --- Card Endpoints ---
@app.post("/cards/", response_model=schemas.Card)
async def create_card(card: schemas.CardCreate, db: AsyncSession = Depends(get_db())):
    db_card = models.Card(**card.dict())
    db.add(db_card)
    await db.commit()
    await db.refresh(db_card)
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

        # Manually delete related CardLink rows
        await db.execute(sa_delete(models.CardLink).where(
            (models.CardLink.source_card_id == card_id) | (models.CardLink.target_card_id == card_id)
        ))

        await db.delete(db_card)
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
    db_project = Project(name=project.name, user_id=current_user.id)
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

# --- Insight File Upload/Deletion Endpoints ---
@app.post("/insights/upload_file/")
async def upload_insight_files(
    insight_id: int = Form(...),
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db())
):
    # Find the insight
    result = await db.execute(select(models.Insight).where(models.Insight.id == insight_id))
    db_insight = result.scalar_one_or_none()
    if db_insight is None:
        raise HTTPException(status_code=404, detail="Insight not found")

    # Upload files to R2
    upload_results = await r2_storage.upload_multiple_files(files, folder="insights")
    uploaded_urls = [result["file_url"] for result in upload_results]

    # Update the files field (append new files)
    existing_files = db_insight.files.split(",") if db_insight.files else []
    all_files = existing_files + uploaded_urls
    db_insight.files = ",".join([f.strip() for f in all_files if f.strip()])
    await db.commit()
    await db.refresh(db_insight)
    return {"file_urls": uploaded_urls, "all_files": all_files}

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

    # Remove file from files field
    existing_files = db_insight.files.split(",") if db_insight.files else []
    new_files = [f for f in existing_files if f.strip() != file_url.strip()]
    db_insight.files = ",".join(new_files)
    await db.commit()
    await db.refresh(db_insight)
    return {"ok": True, "remaining_files": new_files}

# --- Thought File Upload/Deletion Endpoints ---
@app.post("/thoughts/upload_file/")
async def upload_thought_files(
    thought_id: int = Form(...),
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db())
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

    # Update the files field (append new files)
    existing_files = db_thought.files.split(",") if db_thought.files else []
    all_files = existing_files + uploaded_urls
    db_thought.files = ",".join([f.strip() for f in all_files if f.strip()])
    await db.commit()
    await db.refresh(db_thought)
    return {"file_urls": uploaded_urls, "all_files": all_files}

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

    # Remove file from files field
    existing_files = db_thought.files.split(",") if db_thought.files else []
    new_files = [f for f in existing_files if f.strip() != file_url.strip()]
    db_thought.files = ",".join(new_files)
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

# --- Password Reset Endpoints ---
@app.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_sync_db)):
    # Find user by email
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if not user:
        # Don't reveal if user exists or not
        return {"message": "Password reset code sent"}
    # Generate 6-digit code
    code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
    # Invalidate previous codes
    db.query(PasswordResetCode).filter(PasswordResetCode.user_id == user.id, PasswordResetCode.used == False).update({PasswordResetCode.used: True})
    # Store code
    reset_code = PasswordResetCode(user_id=user.id, code=code, expires_at=expires_at, used=False)
    db.add(reset_code)
    db.commit()
    # Log code (simulate email)
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
    """Get all unique tags from all source materials in a project"""
    try:
        # Get all source materials for this project
        source_materials = db.query(models.SourceMaterial).filter(
            models.SourceMaterial.project_id == project_id
        ).all()
        
        # Extract all unique tags
        all_tags = set()
        for sm in source_materials:
            if sm.tags:
                # Handle both string and list formats
                if isinstance(sm.tags, str):
                    tags_list = [tag.strip() for tag in sm.tags.split(',') if tag.strip()]
                elif isinstance(sm.tags, list):
                    tags_list = [tag.strip() for tag in sm.tags if tag.strip()]
                else:
                    continue
                
                all_tags.update(tags_list)
        
        return {"tags": sorted(list(all_tags))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching tags: {str(e)}")

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
