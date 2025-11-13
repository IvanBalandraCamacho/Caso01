from sqlalchemy import Column, String, Boolean, DateTime, func
from .database import Base


class User(Base):
    __tablename__ = "users"

    username = Column(String(150), primary_key=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
