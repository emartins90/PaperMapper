from sqlalchemy.orm import Session
from typing import Optional
from models import UserCustomOption

def get_user_custom_options(db: Session, user_id: int, option_type: Optional[str] = None):
    query = db.query(UserCustomOption).filter(UserCustomOption.user_id == user_id)
    if option_type:
        query = query.filter(UserCustomOption.option_type == option_type)
    return query.all()

def create_user_custom_option(db: Session, user_id: int, option_type: str, value: str):
    db_option = UserCustomOption(user_id=user_id, option_type=option_type, value=value)
    db.add(db_option)
    db.commit()
    db.refresh(db_option)
    return db_option

def update_user_custom_option(db: Session, option_id: int, user_id: int, value: str, option_type: Optional[str] = None):
    db_option = db.query(UserCustomOption).filter_by(id=option_id, user_id=user_id).first()
    if not db_option:
        return None
    
    db_option.value = value
    if option_type:
        db_option.option_type = option_type
    
    db.commit()
    db.refresh(db_option)
    return db_option

def get_guided_experience_setting(db: Session, user_id: int):
    """Get the guided experience setting for a user"""
    option = db.query(UserCustomOption).filter_by(
        user_id=user_id, 
        option_type="guided_experience"
    ).first()
    return option

def set_guided_experience_setting(db: Session, user_id: int, guided: bool):
    """Set the guided experience setting for a user"""
    # Check if setting already exists
    existing_option = get_guided_experience_setting(db, user_id)
    
    if existing_option:
        # Update existing setting
        existing_option.value = str(guided).lower()
        db.commit()
        db.refresh(existing_option)
        return existing_option
    else:
        # Create new setting
        return create_user_custom_option(
            db=db,
            user_id=user_id,
            option_type="guided_experience",
            value=str(guided).lower()
        )
