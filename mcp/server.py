"""
Servidor MCP: Buscador de Talento Semantico
Permite buscar candidatos idoneos en una base de datos de certificaciones usando RAG.

Expone:
1. Servidor MCP via stdio para integracion con agentes IA
2. API REST HTTP en puerto 8083 para integracion directa con backend
"""

import os
import sys
import json
import logging
from pathlib import Path
from typing import Optional, List
from contextlib import asynccontextmanager

import pandas as pd
import lancedb
from sentence_transformers import SentenceTransformer
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Configuracion de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuracion de rutas
BASE_DIR = Path(__file__).parent
DATA_FILE = BASE_DIR / "Capital Intelectual.xlsx"
LANCEDB_PATH = BASE_DIR / "lancedb_data"
TABLE_NAME = "certificaciones"

# Columnas del archivo (nombres exactos)
COL_CERTIFICACION = "Certificacao"
COL_INSTITUCION = "Instituicao"
COL_STATUS = "Status"
COL_NOMBRE = "[Colaborador] Nome"
COL_CARGO = "[Colaborador] Cargo"
COL_PAIS = "[Colaborador] Pais"
COL_FECHA_EMISION = "Data de emissao"

# Modelo multilingue para embeddings (PT/ES)
EMBEDDING_MODEL = "paraphrase-multilingual-MiniLM-L12-v2"


# ============================================
# MODELOS PYDANTIC PARA API REST
# ============================================

class TalentSearchRequest(BaseModel):
    """Request para busqueda de talento."""
    consulta: str
    limit: int = 10


class Candidato(BaseModel):
    """Modelo de candidato encontrado."""
    nombre: str
    cargo: str
    certificacion: str
    institucion: str
    pais: str
    fecha_emision: str
    score: float


class TalentSearchResponse(BaseModel):
    """Response de busqueda de talento."""
    exito: bool
    mensaje: str
    candidatos: List[Candidato]


class StatsResponse(BaseModel):
    """Response de estadisticas."""
    exito: bool
    estadisticas: Optional[dict] = None
    mensaje: Optional[str] = None


class HealthResponse(BaseModel):
    """Response de health check."""
    status: str
    total_registros: int
    modelo_cargado: bool


# Variables globales para el modelo y la base de datos
_model: SentenceTransformer = None
_db: lancedb.DBConnection = None
_table = None


def get_model() -> SentenceTransformer:
    """Carga el modelo de embeddings (singleton)."""
    global _model
    if _model is None:
        logger.info(f"Cargando modelo de embeddings: {EMBEDDING_MODEL}")
        _model = SentenceTransformer(EMBEDDING_MODEL)
        logger.info("Modelo cargado exitosamente")
    return _model


def load_and_process_data() -> pd.DataFrame:
    """Carga y procesa el archivo Excel de certificaciones."""
    try:
        logger.info(f"Cargando datos desde: {DATA_FILE}")
        
        # Leer archivo Excel
        df = pd.read_excel(DATA_FILE, engine="openpyxl")
        logger.info(f"Archivo cargado: {len(df)} filas totales")
        logger.info(f"Columnas encontradas: {list(df.columns)}")
        
        # Limpiar valores NaN
        df = df.fillna("")
        
        # FILTRO CRITICO: Solo procesar certificaciones verificadas
        # Buscar columna Status de forma flexible
        status_col = None
        for col in df.columns:
            if "status" in col.lower():
                status_col = col
                break
        
        if status_col:
            df = df[df[status_col].astype(str).str.strip().str.lower() == "verificado"]
            logger.info(f"Filas despues de filtrar por 'Verificado': {len(df)}")
        else:
            logger.warning("Columna 'Status' no encontrada. Procesando todas las filas.")
        
        if len(df) == 0:
            logger.warning("No se encontraron registros con status 'Verificado'")
            return pd.DataFrame()
        
        return df
        
    except FileNotFoundError:
        logger.error(f"Archivo no encontrado: {DATA_FILE}")
        raise
    except Exception as e:
        logger.error(f"Error al cargar datos: {e}")
        raise


def get_column_value(row: pd.Series, possible_names: list, default: str = "") -> str:
    """Obtiene valor de columna buscando varios nombres posibles."""
    for name in possible_names:
        if name in row.index:
            return str(row[name])
        # Buscar de forma flexible
        for col in row.index:
            if name.lower() in col.lower():
                return str(row[col])
    return default


def create_search_context(row: pd.Series) -> str:
    """Crea el texto de contexto para vectorizar concatenando campos relevantes."""
    cargo = get_column_value(row, ["Cargo", "[Colaborador] Cargo"])
    cert = get_column_value(row, ["Certificacao", "Certificacao"])
    inst = get_column_value(row, ["Instituicao", "Instituicao"])
    pais = get_column_value(row, ["Pais", "[Colaborador] Pais"])
    
    parts = [cargo, cert, inst, pais]
    return " ".join(part.strip() for part in parts if part.strip())


def initialize_vector_db(force_rebuild: bool = False):
    """Inicializa la base de datos vectorial LanceDB."""
    global _db, _table
    
    model = get_model()
    
    # Crear directorio si no existe
    LANCEDB_PATH.mkdir(parents=True, exist_ok=True)
    
    # Conectar a LanceDB
    _db = lancedb.connect(str(LANCEDB_PATH))
    
    # Verificar si la tabla ya existe
    existing_tables = _db.table_names()
    
    if TABLE_NAME in existing_tables and not force_rebuild:
        logger.info(f"Tabla '{TABLE_NAME}' encontrada. Reutilizando datos existentes.")
        _table = _db.open_table(TABLE_NAME)
        logger.info(f"Tabla abierta con {_table.count_rows()} registros")
        return
    
    # Cargar y procesar datos
    df = load_and_process_data()
    
    if df.empty:
        logger.warning("No hay datos para indexar")
        return
    
    logger.info("Generando embeddings para los datos...")
    
    # Crear contexto de busqueda para cada fila
    df["search_context"] = df.apply(create_search_context, axis=1)
    
    # Generar embeddings
    contexts = df["search_context"].tolist()
    embeddings = model.encode(contexts, show_progress_bar=True)
    
    # Preparar datos para LanceDB
    records = []
    for idx, (_, row) in enumerate(df.iterrows()):
        records.append({
            "id": idx,
            "nombre": get_column_value(row, ["Nome", "[Colaborador] Nome"]),
            "cargo": get_column_value(row, ["Cargo", "[Colaborador] Cargo"]),
            "certificacion": get_column_value(row, ["Certificacao", "Certificacao"]),
            "institucion": get_column_value(row, ["Instituicao", "Instituicao"]),
            "pais": get_column_value(row, ["Pais", "[Colaborador] Pais"]),
            "fecha_emision": get_column_value(row, ["Data de emissao", "Data"]),
            "search_context": row["search_context"],
            "vector": embeddings[idx].tolist()
        })
    
    # Crear o reemplazar tabla
    if TABLE_NAME in existing_tables:
        _db.drop_table(TABLE_NAME)
    
    _table = _db.create_table(TABLE_NAME, records)
    logger.info(f"Tabla '{TABLE_NAME}' creada con {len(records)} registros")


def search_candidates(query: str, limit: int = 10) -> list:
    """Busca candidatos usando busqueda vectorial."""
    global _table
    
    if _table is None:
        raise RuntimeError("Base de datos no inicializada. Ejecute initialize_vector_db() primero.")
    
    model = get_model()
    
    # Convertir consulta a vector
    query_vector = model.encode([query])[0].tolist()
    
    # Buscar vecinos mas cercanos
    results = _table.search(query_vector).limit(limit).to_pandas()
    
    # Formatear resultados
    candidates = []
    for _, row in results.iterrows():
        candidates.append({
            "nombre": row["nombre"],
            "cargo": row["cargo"],
            "certificacion": row["certificacion"],
            "institucion": row["institucion"],
            "pais": row["pais"],
            "fecha_emision": row["fecha_emision"],
            "score": float(row.get("_distance", 0))
        })
    
    return candidates


def get_statistics() -> dict:
    """Obtiene estadisticas de la base de datos."""
    if _table is None:
        return None
    
    df = _table.to_pandas()
    
    return {
        "total_certificaciones": len(df),
        "total_colaboradores": df["nombre"].nunique(),
        "paises": df["pais"].value_counts().to_dict(),
        "instituciones_top_10": df["institucion"].value_counts().head(10).to_dict(),
        "cargos_top_10": df["cargo"].value_counts().head(10).to_dict()
    }


# ============================================
# FASTAPI REST API
# ============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager para inicializar la DB al arrancar."""
    logger.info("Iniciando servidor REST API: Buscador de Talento")
    try:
        initialize_vector_db()
    except FileNotFoundError:
        logger.warning(f"Archivo de datos no encontrado: {DATA_FILE}")
        logger.warning("El servidor se iniciara sin datos.")
    except Exception as e:
        logger.error(f"Error durante inicializacion: {e}")
        logger.warning("El servidor se iniciara en modo degradado.")
    
    yield
    
    logger.info("Servidor REST API detenido")


# Crear app FastAPI
app = FastAPI(
    title="MCP Talent Search API",
    description="API REST para busqueda semantica de talento basada en certificaciones",
    version="1.0.0",
    lifespan=lifespan
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check del servicio."""
    return HealthResponse(
        status="healthy" if _table is not None else "degraded",
        total_registros=_table.count_rows() if _table else 0,
        modelo_cargado=_model is not None
    )


@app.post("/search", response_model=TalentSearchResponse)
async def search_talent(request: TalentSearchRequest):
    """
    Busca candidatos idoneos basandose en una consulta en lenguaje natural.
    
    - **consulta**: Descripcion de las habilidades o perfil buscado
    - **limit**: Numero maximo de resultados (default: 10)
    """
    try:
        if _table is None:
            raise HTTPException(
                status_code=503,
                detail="Base de datos no inicializada. El servicio esta en modo degradado."
            )
        
        logger.info(f"Buscando talento con consulta: {request.consulta}")
        candidates = search_candidates(request.consulta, limit=request.limit)
        
        if not candidates:
            return TalentSearchResponse(
                exito=False,
                mensaje="No se encontraron candidatos que coincidan con la busqueda.",
                candidatos=[]
            )
        
        logger.info(f"Encontrados {len(candidates)} candidatos")
        
        return TalentSearchResponse(
            exito=True,
            mensaje=f"Se encontraron {len(candidates)} candidatos.",
            candidatos=[Candidato(**c) for c in candidates]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en busqueda: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/search", response_model=TalentSearchResponse)
async def search_talent_get(
    consulta: str = Query(..., description="Consulta en lenguaje natural"),
    limit: int = Query(10, ge=1, le=50, description="Numero maximo de resultados")
):
    """
    Busca candidatos (metodo GET para facilitar pruebas).
    """
    return await search_talent(TalentSearchRequest(consulta=consulta, limit=limit))


@app.get("/stats", response_model=StatsResponse)
async def get_stats():
    """Obtiene estadisticas de la base de datos de certificaciones."""
    try:
        stats = get_statistics()
        if stats is None:
            return StatsResponse(
                exito=False,
                mensaje="Base de datos no inicializada."
            )
        
        return StatsResponse(
            exito=True,
            estadisticas=stats
        )
    except Exception as e:
        logger.error(f"Error al obtener estadisticas: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/reindex")
async def reindex_database():
    """Reconstruye el indice vectorial desde el archivo Excel."""
    try:
        logger.info("Reiniciando indice vectorial...")
        initialize_vector_db(force_rebuild=True)
        
        if _table is not None:
            count = _table.count_rows()
            return {
                "exito": True,
                "mensaje": f"Indice reconstruido exitosamente con {count} registros."
            }
        else:
            return {
                "exito": False,
                "mensaje": "No se pudo reconstruir el indice. Verifique el archivo de datos."
            }
            
    except Exception as e:
        logger.error(f"Error al reiniciar indice: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# MCP TOOLS (si MCP esta disponible)
# ============================================

# Importar MCP solo si esta disponible
try:
    from mcp.server.fastmcp import FastMCP
    mcp = FastMCP("buscador-talento")
    MCP_AVAILABLE = True
    
    @mcp.tool()
    def buscar_talento(consulta: str) -> str:
        """
        Busca candidatos idoneos basandose en una consulta en lenguaje natural.
        
        Args:
            consulta: Descripcion de las habilidades o perfil buscado.
        
        Returns:
            JSON string con lista de candidatos encontrados.
        """
        try:
            candidates = search_candidates(consulta, limit=10)
            
            if not candidates:
                return json.dumps({
                    "exito": False,
                    "mensaje": "No se encontraron candidatos.",
                    "candidatos": []
                }, ensure_ascii=False, indent=2)
            
            return json.dumps({
                "exito": True,
                "mensaje": f"Se encontraron {len(candidates)} candidatos.",
                "candidatos": candidates
            }, ensure_ascii=False, indent=2)
            
        except Exception as e:
            return json.dumps({
                "exito": False,
                "mensaje": f"Error: {str(e)}",
                "candidatos": []
            }, ensure_ascii=False, indent=2)

    @mcp.tool()
    def reiniciar_indice() -> str:
        """Reconstruye el indice vectorial desde el archivo Excel."""
        try:
            initialize_vector_db(force_rebuild=True)
            if _table is not None:
                count = _table.count_rows()
                return json.dumps({
                    "exito": True,
                    "mensaje": f"Indice reconstruido con {count} registros."
                }, ensure_ascii=False)
            return json.dumps({
                "exito": False,
                "mensaje": "No se pudo reconstruir el indice."
            }, ensure_ascii=False)
        except Exception as e:
            return json.dumps({
                "exito": False,
                "mensaje": f"Error: {str(e)}"
            }, ensure_ascii=False)

    @mcp.tool()
    def estadisticas_base() -> str:
        """Obtiene estadisticas de la base de datos."""
        try:
            stats = get_statistics()
            if stats is None:
                return json.dumps({
                    "exito": False,
                    "mensaje": "Base de datos no inicializada."
                }, ensure_ascii=False)
            
            return json.dumps({
                "exito": True,
                "estadisticas": stats
            }, ensure_ascii=False, indent=2)
        except Exception as e:
            return json.dumps({
                "exito": False,
                "mensaje": f"Error: {str(e)}"
            }, ensure_ascii=False)

except ImportError:
    MCP_AVAILABLE = False
    mcp = None
    logger.info("MCP no disponible, solo API REST habilitada")


# ============================================
# MAIN
# ============================================

def main():
    """Punto de entrada principal."""
    mode = os.environ.get("MCP_MODE", "http").lower()
    
    if mode == "mcp" and MCP_AVAILABLE:
        # Modo MCP via stdio
        logger.info("Iniciando en modo MCP (stdio)")
        try:
            initialize_vector_db()
        except Exception as e:
            logger.error(f"Error inicializando: {e}")
        mcp.run()
    else:
        # Modo HTTP REST API (default)
        port = int(os.environ.get("MCP_PORT", "8083"))
        logger.info(f"Iniciando en modo HTTP REST API en puerto {port}")
        uvicorn.run(
            "server:app",
            host="0.0.0.0",
            port=port,
            reload=False,
            log_level="info"
        )


if __name__ == "__main__":
    main()
