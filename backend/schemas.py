from pydantic import BaseModel
from typing import Optional, List
from fastapi_users import schemas as fa_schemas

class UserRead(fa_schemas.BaseUser[int]):
    pass

class UserCreate(fa_schemas.BaseUserCreate):
    pass

class UserUpdate(fa_schemas.BaseUserUpdate):
    pass

class ProjectBase(BaseModel):
    name: str

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: int
    class Config:
        orm_mode = True

class CitationBase(BaseModel):
    text: str
    credibility: Optional[str] = None

class CitationCreate(CitationBase):
    pass

class Citation(CitationBase):
    id: int
    class Config:
        orm_mode = True

class SourceMaterialBase(BaseModel):
    citation_id: Optional[int] = None
    project_id: int
    content: Optional[str] = None
    summary: Optional[str] = None
    tags: Optional[str] = None  # Comma-separated string
    argument_type: Optional[str] = None
    function: Optional[str] = None
    files: Optional[str] = None  # Comma-separated string
    notes: Optional[str] = None  # Additional notes

class SourceMaterialCreate(SourceMaterialBase):
    pass

class SourceMaterial(SourceMaterialBase):
    id: int
    class Config:
        orm_mode = True

class CardBase(BaseModel):
    type: str
    data_id: Optional[int] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    project_id: int

class CardCreate(CardBase):
    data_id: int  # Required for source cards
    pass

class Card(CardBase):
    id: int
    class Config:
        orm_mode = True

class CardUpdate(BaseModel):
    type: Optional[str] = None
    data_id: Optional[int] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    project_id: Optional[int] = None

class CardLinkBase(BaseModel):
    source_card_id: int
    target_card_id: int
    source_handle: Optional[str] = None
    target_handle: Optional[str] = None
    project_id: int

class CardLinkCreate(CardLinkBase):
    pass

class CardLink(CardLinkBase):
    id: int
    class Config:
        orm_mode = True

class UserCustomOptionBase(BaseModel):
    option_type: str
    value: str

class UserCustomOptionCreate(UserCustomOptionBase):
    pass

class UserCustomOptionUpdate(BaseModel):
    value: str
    option_type: Optional[str] = None

class UserCustomOptionRead(UserCustomOptionBase):
    id: int
    user_id: int

    class Config:
        orm_mode = True

class QuestionBase(BaseModel):
    project_id: int
    question_text: str
    category: Optional[str] = None  # e.g., Clarify a concept, Challenge an assumption, etc. (custom allowed)
    status: Optional[str] = None    # e.g., unexplored, needs sources, in progress, answered, not relevant
    priority: Optional[str] = None  # e.g., high, medium, low
    files: Optional[str] = None  # Comma-separated string

class QuestionCreate(QuestionBase):
    pass

class Question(QuestionBase):
    id: int
    class Config:
        orm_mode = True

class QuestionUpdate(BaseModel):
    project_id: Optional[int] = None
    question_text: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    files: Optional[str] = None

class InsightBase(BaseModel):
    project_id: int
    insight_text: str
    sources_linked: Optional[str] = None  # e.g., "3 Sources Linked"
    files: Optional[str] = None  # Comma-separated string
    insight_type: Optional[str] = None

class InsightCreate(InsightBase):
    pass

class InsightUpdate(BaseModel):
    project_id: Optional[int] = None
    insight_text: Optional[str] = None
    sources_linked: Optional[str] = None
    files: Optional[str] = None
    insight_type: Optional[str] = None

class Insight(InsightBase):
    id: int
    class Config:
        orm_mode = True

class ThoughtBase(BaseModel):
    project_id: int
    thought_text: str
    files: Optional[str] = None  # Comma-separated string

class ThoughtCreate(ThoughtBase):
    pass

class ThoughtUpdate(BaseModel):
    project_id: Optional[int] = None
    thought_text: Optional[str] = None
    files: Optional[str] = None

class Thought(ThoughtBase):
    id: int
    class Config:
        orm_mode = True

class ClaimBase(BaseModel):
    project_id: int
    claim_text: str
    claim_type: Optional[str] = None  # Hypothesis, Thesis, Conclusion, Proposal
    files: Optional[str] = None  # Comma-separated string

class ClaimCreate(ClaimBase):
    pass

class Claim(ClaimBase):
    id: int
    class Config:
        orm_mode = True

class ClaimUpdate(BaseModel):
    project_id: Optional[int] = None
    claim_text: Optional[str] = None
    claim_type: Optional[str] = None
    files: Optional[str] = None
