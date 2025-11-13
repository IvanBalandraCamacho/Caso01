from sqlalchemy import Column, String, DateTime, func
from .database import Base


class Setting(Base):
    __tablename__ = "settings"

    # key única para la configuración
    key = Column(String(100), primary_key=True, index=True)
    value = Column(String(1000), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
