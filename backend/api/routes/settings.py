from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from models import database, setting as setting_model, schemas

router = APIRouter()

@router.get(
    "/settings/active_llm",
    response_model=schemas.SettingPublic,
    summary="Obtener el LLM activo (configuración)"
)
def get_active_llm(db: Session = Depends(database.get_db)):
    s = db.query(setting_model.Setting).filter(setting_model.Setting.key == "active_llm").first()
    if not s:
        # devolver valor por defecto desde core.config si existe
        from core.config import settings as core_settings
        return {"key": "active_llm", "value": getattr(core_settings, "ACTIVE_LLM_SERVICE", None)}
    return s

@router.post(
    "/settings/active_llm",
    response_model=schemas.SettingPublic,
    summary="Establecer el LLM activo (configuración)"
)
def set_active_llm(update: schemas.ActiveLLMUpdate, db: Session = Depends(database.get_db)):
    s = db.query(setting_model.Setting).filter(setting_model.Setting.key == "active_llm").first()
    if not s:
        s = setting_model.Setting(key="active_llm", value=update.active_llm)
        db.add(s)
    else:
        s.value = update.active_llm
    db.commit()
    db.refresh(s)
    return s
