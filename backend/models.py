from fastapi_users_db_sqlalchemy import SQLAlchemyBaseUserTable
from sqlalchemy import Column, Integer, String, ForeignKey, Float, Boolean, DateTime, Date, func
from sqlalchemy.orm import relationship
from database import Base
import datetime
from sqlalchemy.dialects.postgresql import ARRAY

class User(Base, SQLAlchemyBaseUserTable[int]):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    time_created = Column(DateTime, default=func.now(), nullable=False)
    time_first_project_created = Column(DateTime, nullable=True)
    projects = relationship("Project", back_populates="user")
    custom_options = relationship("UserCustomOption", back_populates="user", cascade="all, delete-orphan")
    password_reset_codes = relationship("PasswordResetCode", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    class_subject = Column(String, nullable=True)
    paper_type = Column(String, nullable=True)
    due_date = Column(Date, nullable=True)
    last_edited_date = Column(DateTime, default=func.now(), onupdate=func.now())
    status = Column(String, default="not_started")  # not_started, in_progress, ready_to_write, complete
    assignment_file = Column(String, nullable=True)  # File path/URL
    assignment_filename = Column(String, nullable=True)  # Original filename
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="projects")
    citations = relationship("Citation", back_populates="project", cascade="all, delete-orphan")
    source_materials = relationship("SourceMaterial", back_populates="project", cascade="all, delete-orphan")
    cards = relationship("Card", back_populates="project", cascade="all, delete-orphan")
    card_links = relationship("CardLink", back_populates="project", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="project", cascade="all, delete-orphan")
    insights = relationship("Insight", back_populates="project", cascade="all, delete-orphan")
    thoughts = relationship("Thought", back_populates="project", cascade="all, delete-orphan")
    claims = relationship("Claim", back_populates="project", cascade="all, delete-orphan")
    outline_sections = relationship("OutlineSection", back_populates="project", cascade="all, delete-orphan")
    outline_card_placements = relationship("OutlineCardPlacement", back_populates="project", cascade="all, delete-orphan")

class Citation(Base):
    __tablename__ = "citations"
    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, nullable=False)
    credibility = Column(String, nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    project = relationship("Project", back_populates="citations")
    source_materials = relationship("SourceMaterial", back_populates="citation")

class SourceMaterial(Base):
    __tablename__ = "source_materials"
    id = Column(Integer, primary_key=True, index=True)
    citation_id = Column(Integer, ForeignKey("citations.id"))
    project_id = Column(Integer, ForeignKey("projects.id"))
    content = Column(String, nullable=True)
    content_formatted = Column(String, nullable=True)  # HTML content from rich text editor
    summary = Column(String, nullable=True)
    summary_formatted = Column(String, nullable=True)  # HTML content from rich text editor for summary
    tags = Column(ARRAY(String), nullable=True)
    argument_type = Column(String, nullable=True)
    function = Column(String, nullable=True)
    files = Column(String, nullable=True)  # Store as comma-separated for now
    file_filenames = Column(String, nullable=True)  # Store original filenames as comma-separated
    notes = Column(String, nullable=True)  # Additional notes field
    citation = relationship("Citation", back_populates="source_materials")
    project = relationship("Project", back_populates="source_materials")

class Card(Base):
    __tablename__ = "cards"
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)  # e.g., 'question', 'source_material', etc.
    data_id = Column(Integer, nullable=True)  # e.g., source_material_id
    position_x = Column(Float, nullable=True)
    position_y = Column(Float, nullable=True)
    time_created = Column(DateTime, default=func.now(), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"))
    project = relationship("Project", back_populates="cards")
    outgoing_links = relationship("CardLink", back_populates="source_card", foreign_keys='CardLink.source_card_id')
    incoming_links = relationship("CardLink", back_populates="target_card", foreign_keys='CardLink.target_card_id')
    outline_placement = relationship("OutlineCardPlacement", back_populates="card", cascade="all, delete-orphan")

class CardLink(Base):
    __tablename__ = "card_links"
    id = Column(Integer, primary_key=True, index=True)
    source_card_id = Column(Integer, ForeignKey("cards.id"))
    target_card_id = Column(Integer, ForeignKey("cards.id"))
    source_handle = Column(String, nullable=True)  # e.g., "right", "bottom"
    target_handle = Column(String, nullable=True)  # e.g., "left", "top"
    project_id = Column(Integer, ForeignKey("projects.id"))
    project = relationship("Project", back_populates="card_links")
    source_card = relationship("Card", back_populates="outgoing_links", foreign_keys=[source_card_id])
    target_card = relationship("Card", back_populates="incoming_links", foreign_keys=[target_card_id])

class UserCustomOption(Base):
    __tablename__ = "user_custom_options"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    option_type = Column(String, nullable=False)  # e.g., 'sourceFunction', 'argumentType', etc.
    value = Column(String, nullable=False)
    user = relationship("User", back_populates="custom_options")

class PasswordResetCode(Base):
    __tablename__ = "password_reset_codes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    code = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    user = relationship("User")

class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    question_text = Column(String, nullable=False)
    question_text_formatted = Column(String, nullable=True)  # HTML content from rich text editor
    category = Column(String, nullable=True)  # e.g., Clarify a concept, Challenge an assumption, etc. (custom allowed)
    status = Column(String, nullable=True)    # e.g., unexplored, needs sources, in progress, answered, not relevant
    priority = Column(String, nullable=True)  # e.g., high, medium, low
    tags = Column(ARRAY(String), nullable=True)  # Store as comma-separated for now
    files = Column(String, nullable=True)  # Store as comma-separated for now
    file_filenames = Column(String, nullable=True)  # Store original filenames as comma-separated
    project = relationship("Project", back_populates="questions")

class Insight(Base):
    __tablename__ = "insights"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    insight_text = Column(String, nullable=False)
    insight_text_formatted = Column(String, nullable=True)  # HTML content from rich text editor
    sources_linked = Column(String, nullable=True)  # e.g., "3 Sources Linked"
    files = Column(String, nullable=True)  # Store as comma-separated for now
    file_filenames = Column(String, nullable=True)  # Store original filenames as comma-separated
    insight_type = Column(String, nullable=True)  # e.g., Resolved Confusion, Noticed a Pattern, etc.
    tags = Column(ARRAY(String), nullable=True)  # Store as comma-separated for now
    project = relationship("Project", back_populates="insights")

class Thought(Base):
    __tablename__ = "thoughts"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    thought_text = Column(String, nullable=False)
    thought_text_formatted = Column(String, nullable=True)  # HTML content from rich text editor
    tags = Column(ARRAY(String), nullable=True)  # Store as comma-separated for now
    files = Column(String, nullable=True)  # Store as comma-separated for now
    file_filenames = Column(String, nullable=True)  # Store original filenames as comma-separated
    project = relationship("Project", back_populates="thoughts")

class Claim(Base):
    __tablename__ = "claims"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    claim_text = Column(String, nullable=False)
    claim_text_formatted = Column(String, nullable=True)  # HTML content from rich text editor
    claim_type = Column(String, nullable=True)  # Hypothesis, Thesis, Conclusion, Proposal
    tags = Column(ARRAY(String), nullable=True)  # Store as comma-separated for now
    files = Column(String, nullable=True)  # Store as comma-separated for now
    file_filenames = Column(String, nullable=True)  # Store original filenames as comma-separated
    project = relationship("Project", back_populates="claims")

class OutlineSection(Base):
    __tablename__ = "outline_sections"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    title = Column(String, nullable=False)
    order_index = Column(Integer, nullable=False)  # For ordering sections
    parent_section_id = Column(Integer, ForeignKey("outline_sections.id"), nullable=True)  # For subsections
    section_number = Column(String, nullable=True)  # e.g., "I", "II", "A", "B" - calculated and stored
    time_created = Column(DateTime, default=func.now(), nullable=False)
    time_updated = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    project = relationship("Project", back_populates="outline_sections")
    parent_section = relationship("OutlineSection", remote_side=[id], back_populates="subsections")
    subsections = relationship("OutlineSection", back_populates="parent_section", cascade="all, delete-orphan")
    card_placements = relationship("OutlineCardPlacement", back_populates="section", cascade="all, delete-orphan")

class OutlineCardPlacement(Base):
    __tablename__ = "outline_card_placements"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    section_id = Column(Integer, ForeignKey("outline_sections.id"))
    card_id = Column(Integer, ForeignKey("cards.id"), unique=True)  # UNIQUE constraint for single placement
    order_index = Column(Integer, nullable=False)  # For ordering cards within a section
    time_created = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationships
    project = relationship("Project", back_populates="outline_card_placements")
    section = relationship("OutlineSection", back_populates="card_placements")
    card = relationship("Card", back_populates="outline_placement") 
