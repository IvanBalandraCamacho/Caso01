"""
APIs adicionales para TIVIT - Servicios y Trabajadores
"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# ============================================================================
# SCHEMAS PARA SERVICIOS
# ============================================================================

class Servicio(BaseModel):
    """Schema para un servicio de TIVIT"""
    id: str
    nombre: str
    categoria: str  # ciberseguridad, cloud_computing, transformacion_digital, ia
    descripcion: str
    costo_mensual_min: float
    costo_mensual_max: float
    costo_implementacion_min: Optional[float] = None
    costo_implementacion_max: Optional[float] = None
    duracion_estimada_meses: int
    nivel_dificultad: str  # basico, intermedio, avanzado
    tecnologias_principales: List[str]

# ============================================================================
# SCHEMAS PARA TRABAJADORES
# ============================================================================

class Trabajador(BaseModel):
    """Schema para un trabajador de TIVIT"""
    id: str
    nombre: str
    edad: int
    nacionalidad: str
    localidad: str  # Ciudad/País
    area: str  # ciberseguridad, cloud_computing, transformacion_digital, ia
    certificaciones: List[str]
    area_experiencia: str  # Descripción detallada
    rol: str  # analista, desarrollador, arquitecto, consultor, etc.
    anos_experiencia: int
    idiomas: List[str]
    disponibilidad: str  # inmediata, 1_mes, 3_meses

# ============================================================================
# DATOS MOCK PARA TIVIT
# ============================================================================

SERVICIOS_TIVIT = [
    Servicio(
        id="cyber-001",
        nombre="Evaluación de Vulnerabilidades",
        categoria="ciberseguridad",
        descripcion="Análisis completo de seguridad de sistemas, redes e infraestructura",
        costo_mensual_min=5000,
        costo_mensual_max=15000,
        costo_implementacion_min=10000,
        costo_implementacion_max=30000,
        duracion_estimada_meses=2,
        nivel_dificultad="intermedio",
        tecnologias_principales=["Nessus", "OpenVAS", "Wireshark", "Metasploit"]
    ),
    Servicio(
        id="cloud-001",
        nombre="Migración a AWS",
        categoria="cloud_computing",
        descripcion="Migración completa de infraestructura on-premise a AWS con optimización",
        costo_mensual_min=8000,
        costo_mensual_max=25000,
        costo_implementacion_min=20000,
        costo_implementacion_max=80000,
        duracion_estimada_meses=4,
        nivel_dificultad="avanzado",
        tecnologias_principales=["AWS", "Terraform", "CloudFormation", "EC2", "S3", "RDS"]
    ),
    Servicio(
        id="digital-001",
        nombre="Transformación Digital Empresarial",
        categoria="transformacion_digital",
        descripcion="Consultoría completa para transformación digital incluyendo estrategia y roadmap",
        costo_mensual_min=10000,
        costo_mensual_max=30000,
        costo_implementacion_min=50000,
        costo_implementacion_max=150000,
        duracion_estimada_meses=6,
        nivel_dificultad="avanzado",
        tecnologias_principales=["Agile", "DevOps", "Microservicios", "APIs", "Low-Code"]
    ),
    Servicio(
        id="ia-001",
        nombre="Implementación de IA Conversacional",
        categoria="ia",
        descripcion="Desarrollo e implementación de chatbots y asistentes virtuales con IA",
        costo_mensual_min=6000,
        costo_mensual_max=18000,
        costo_implementacion_min=15000,
        costo_implementacion_max=45000,
        duracion_estimada_meses=3,
        nivel_dificultad="intermedio",
        tecnologias_principales=["OpenAI", "Dialogflow", "Rasa", "Python", "NLP"]
    ),
    Servicio(
        id="cyber-002",
        nombre="Monitoreo SOC 24/7",
        categoria="ciberseguridad",
        descripcion="Servicio de monitoreo continuo de seguridad con centro de operaciones",
        costo_mensual_min=12000,
        costo_mensual_max=35000,
        duracion_estimada_meses=12,
        nivel_dificultad="avanzado",
        tecnologias_principales=["SIEM", "Splunk", "ELK Stack", "SOAR"]
    ),
    Servicio(
        id="cloud-002",
        nombre="Optimización Cloud Multi-Provider",
        categoria="cloud_computing",
        descripcion="Gestión y optimización de costos en múltiples proveedores cloud",
        costo_mensual_min=4000,
        costo_mensual_max=12000,
        duracion_estimada_meses=3,
        nivel_dificultad="intermedio",
        tecnologias_principales=["AWS", "Azure", "GCP", "Kubernetes", "Docker"]
    )
]

TRABAJADORES_TIVIT = [
    Trabajador(
        id="emp-001",
        nombre="Carlos Rodríguez",
        edad=35,
        nacionalidad="Argentina",
        localidad="Buenos Aires, Argentina",
        area="ciberseguridad",
        certificaciones=["CISSP", "CEH", "CompTIA Security+"],
        area_experiencia="Especialista en ciberseguridad con foco en evaluación de vulnerabilidades y respuesta a incidentes",
        rol="arquitecto",
        anos_experiencia=12,
        idiomas=["Español", "Inglés", "Portugués"],
        disponibilidad="inmediata"
    ),
    Trabajador(
        id="emp-002",
        nombre="Ana Silva",
        edad=28,
        nacionalidad="Brasil",
        localidad="São Paulo, Brasil",
        area="cloud_computing",
        certificaciones=["AWS Solutions Architect", "Azure Fundamentals", "CKA"],
        area_experiencia="Arquitecta cloud especializada en migraciones y optimización de infraestructura",
        rol="arquitecto",
        anos_experiencia=6,
        idiomas=["Portugués", "Inglés", "Español"],
        disponibilidad="inmediata"
    ),
    Trabajador(
        id="emp-003",
        nombre="Miguel Torres",
        edad=42,
        nacionalidad="México",
        localidad="Ciudad de México, México",
        area="transformacion_digital",
        certificaciones=["PMP", "Agile Coach", "TOGAF"],
        area_experiencia="Consultor senior en transformación digital con experiencia en grandes corporaciones",
        rol="consultor",
        anos_experiencia=18,
        idiomas=["Español", "Inglés"],
        disponibilidad="1_mes"
    ),
    Trabajador(
        id="emp-004",
        nombre="Laura Fernández",
        edad=31,
        nacionalidad="Colombia",
        localidad="Bogotá, Colombia",
        area="ia",
        certificaciones=["TensorFlow Developer", "AWS ML Specialty"],
        area_experiencia="Desarrolladora de IA especializada en NLP y machine learning aplicado a negocio",
        rol="desarrollador",
        anos_experiencia=8,
        idiomas=["Español", "Inglés"],
        disponibilidad="inmediata"
    ),
    Trabajador(
        id="emp-005",
        nombre="João Santos",
        edad=39,
        nacionalidad="Brasil",
        localidad="Rio de Janeiro, Brasil",
        area="ciberseguridad",
        certificaciones=["CISM", "ISO 27001 Lead Auditor"],
        area_experiencia="Especialista en governance y compliance de ciberseguridad",
        rol="consultor",
        anos_experiencia=15,
        idiomas=["Portugués", "Inglés", "Español"],
        disponibilidad="inmediata"
    ),
    Trabajador(
        id="emp-006",
        nombre="Sofia Ramírez",
        edad=26,
        nacionalidad="Chile",
        localidad="Santiago, Chile",
        area="cloud_computing",
        certificaciones=["GCP Professional Cloud Architect", "Kubernetes Administrator"],
        area_experiencia="DevOps engineer especializada en contenedores y orquestación",
        rol="desarrollador",
        anos_experiencia=4,
        idiomas=["Español", "Inglés"],
        disponibilidad="inmediata"
    ),
    Trabajador(
        id="emp-007",
        nombre="Diego Morales",
        edad=45,
        nacionalidad="Perú",
        localidad="Lima, Perú",
        area="transformacion_digital",
        certificaciones=["Scrum Master", "SAFe Agilist", "Prince2"],
        area_experiencia="Director de transformación digital con experiencia en banca y retail",
        rol="consultor",
        anos_experiencia=20,
        idiomas=["Español", "Inglés"],
        disponibilidad="3_meses"
    ),
    Trabajador(
        id="emp-008",
        nombre="Camila Oliveira",
        edad=33,
        nacionalidad="Brasil",
        localidad="Porto Alegre, Brasil",
        area="ia",
        certificaciones=["Deep Learning Specialization", "Azure AI Engineer"],
        area_experiencia="Data scientist especializada en computer vision y análisis predictivo",
        rol="analista",
        anos_experiencia=10,
        idiomas=["Portugués", "Inglés", "Español"],
        disponibilidad="inmediata"
    ),
    Trabajador(
        id="emp-009",
        nombre="Roberto García",
        edad=37,
        nacionalidad="Argentina",
        localidad="Córdoba, Argentina",
        area="ciberseguridad",
        certificaciones=["OSCP", "GIAC", "Cisco Security"],
        area_experiencia="Pentester y especialista en red team con experiencia en finanzas",
        rol="analista",
        anos_experiencia=14,
        idiomas=["Español", "Inglés"],
        disponibilidad="1_mes"
    ),
    Trabajador(
        id="emp-010",
        nombre="Isabella Costa",
        edad=29,
        nacionalidad="Brasil",
        localidad="Belo Horizonte, Brasil",
        area="cloud_computing",
        certificaciones=["AWS DevOps Engineer", "Terraform Associate"],
        area_experiencia="Ingeniera DevOps con especialización en IaC y automatización",
        rol="desarrollador",
        anos_experiencia=7,
        idiomas=["Portugués", "Inglés"],
        disponibilidad="inmediata"
    )
]

# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get(
    "/servicios",
    response_model=List[Servicio],
    summary="Obtener lista de servicios TIVIT"
)
def get_servicios(
    categoria: Optional[str] = None,
    nivel_dificultad: Optional[str] = None
):
    """
    Obtiene la lista completa de servicios ofrecidos por TIVIT.

    Parámetros opcionales:
    - categoria: Filtrar por categoría (ciberseguridad, cloud_computing, transformacion_digital, ia)
    - nivel_dificultad: Filtrar por dificultad (basico, intermedio, avanzado)
    """
    servicios = SERVICIOS_TIVIT

    if categoria:
        servicios = [s for s in servicios if s.categoria == categoria]

    if nivel_dificultad:
        servicios = [s for s in servicios if s.nivel_dificultad == nivel_dificultad]

    return servicios


@router.get(
    "/servicios/{servicio_id}",
    response_model=Servicio,
    summary="Obtener detalle de un servicio específico"
)
def get_servicio(servicio_id: str):
    """
    Obtiene los detalles de un servicio específico por ID.
    """
    for servicio in SERVICIOS_TIVIT:
        if servicio.id == servicio_id:
            return servicio

    raise HTTPException(status_code=404, detail="Servicio no encontrado")


@router.get(
    "/trabajadores",
    response_model=List[Trabajador],
    summary="Obtener lista de trabajadores TIVIT"
)
def get_trabajadores(
    area: Optional[str] = None,
    rol: Optional[str] = None,
    disponibilidad: Optional[str] = None
):
    """
    Obtiene la lista de trabajadores disponibles en TIVIT.

    Parámetros opcionales:
    - area: Filtrar por área (ciberseguridad, cloud_computing, transformacion_digital, ia)
    - rol: Filtrar por rol (analista, desarrollador, arquitecto, consultor)
    - disponibilidad: Filtrar por disponibilidad (inmediata, 1_mes, 3_meses)
    """
    trabajadores = TRABAJADORES_TIVIT

    if area:
        trabajadores = [t for t in trabajadores if t.area == area]

    if rol:
        trabajadores = [t for t in trabajadores if t.rol == rol]

    if disponibilidad:
        trabajadores = [t for t in trabajadores if t.disponibilidad == disponibilidad]

    return trabajadores


@router.get(
    "/trabajadores/{trabajador_id}",
    response_model=Trabajador,
    summary="Obtener detalle de un trabajador específico"
)
def get_trabajador(trabajador_id: str):
    """
    Obtiene los detalles de un trabajador específico por ID.
    """
    for trabajador in TRABAJADORES_TIVIT:
        if trabajador.id == trabajador_id:
            return trabajador

    raise HTTPException(status_code=404, detail="Trabajador no encontrado")


@router.post(
    "/equipos/sugerir",
    summary="Sugerir equipo basado en requerimientos"
)
def sugerir_equipo(
    requerimientos: dict
):
    """
    Endpoint para sugerir un equipo basado en requerimientos del proyecto.
    Este endpoint será usado por el LLM para armar equipos.

    Requerimientos esperados:
    {
        "servicios": ["ciberseguridad", "cloud_computing"],
        "tamano_equipo": 3,
        "presupuesto_mensual": 20000,
        "duracion_meses": 6,
        "ubicacion_preferida": "Brasil"
    }
    """
    # Lógica básica de sugerencia (puede ser mejorada)
    servicios_requeridos = requerimientos.get("servicios", [])
    tamano_equipo = requerimientos.get("tamano_equipo", 3)
    presupuesto = requerimientos.get("presupuesto_mensual", 50000)
    ubicacion = requerimientos.get("ubicacion_preferida", None)

    # Filtrar trabajadores por servicios requeridos
    trabajadores_filtrados = []
    for servicio in servicios_requeridos:
        trabajadores_filtrados.extend([t for t in TRABAJADORES_TIVIT if t.area == servicio])

    # Remover duplicados
    trabajadores_filtrados = list(set(trabajadores_filtrados))

    # Filtrar por ubicación si especificada
    if ubicacion:
        trabajadores_filtrados = [t for t in trabajadores_filtrados if ubicacion.lower() in t.localidad.lower()]

    # Limitar al tamaño del equipo
    equipo_sugerido = trabajadores_filtrados[:tamano_equipo]

    # Calcular costo aproximado
    costo_mensual_aprox = sum(5000 for _ in equipo_sugerido)  # Estimación básica

    return {
        "equipo_sugerido": [t.dict() for t in equipo_sugerido],
        "costo_mensual_aproximado": costo_mensual_aprox,
        "servicios_cubiertos": servicios_requeridos,
        "tamano_equipo": len(equipo_sugerido)
    }