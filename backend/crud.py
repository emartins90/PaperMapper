from sqlalchemy.orm import Session
from backend.models import UserCustomOption

def get_user_custom_options(db: Session, user_id: int, option_type: str = None):
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

def update_user_custom_option(db: Session, option_id: int, user_id: int, value: str, option_type: str = None):
    db_option = db.query(UserCustomOption).filter_by(id=option_id, user_id=user_id).first()
    if not db_option:
        return None
    
    db_option.value = value
    if option_type:
        db_option.option_type = option_type
    
    db.commit()
    db.refresh(db_option)
    return db_option
