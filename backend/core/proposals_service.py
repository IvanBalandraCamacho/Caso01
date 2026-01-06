from sqlalchemy.orm import Session
from models.workspace import Workspace
from typing import Dict, Any, List

def calculate_workspace_health(db: Session, workspace_id: str) -> Dict[str, Any]:
    """
    Calcula la salud (completitud) de un Workspace basado en sus campos estratégicos.
    """
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        return {"error": "Workspace not found"}

    # Lista de campos requeridos para una propuesta completa
    required_fields = [
        "country",
        "client_company",
        "operation_name",
        "tvt",
        "tech_stack",
        "opportunity_type",
        "estimated_price",
        "estimated_time",
        "resource_count",
        "category",
        "objective"
    ]

    missing_sections = []
    filled_count = 0

    for field in required_fields:
        value = getattr(workspace, field)
        if value is None or (isinstance(value, (str, list)) and len(value) == 0):
            # Formatear el nombre del campo para el usuario (snake_case to Title Case)
            display_name = field.replace("_", " ").title()
            missing_sections.append(display_name)
        else:
            filled_count += 1

    percentage = int((filled_count / len(required_fields)) * 100)

    return {
        "workspace_id": workspace_id,
        "percentage": percentage,
        "missing_sections": missing_sections,
        "is_complete": percentage == 100
    }
