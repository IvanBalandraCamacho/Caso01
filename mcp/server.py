"""
Servidor MCP: Buscador de Talento Semantico
Permite buscar candidatos idoneos en una base de datos de certificaciones usando RAG.

Expone:
1. Servidor MCP via stdio para integracion con agentes IA
2. API REST HTTP en puerto 8083 para integracion directa con backend

FILTROS OBLIGATORIOS:
- Status: Verificado
- Expirado: Nao
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

# Modelo multilingue para embeddings (PT/ES)
EMBEDDING_MODEL = "paraphrase-multilingual-MiniLM-L12-v2"


# ============================================
# MODELOS PYDANTIC PARA API REST
# ============================================

class TalentSearchRequest(BaseModel):
    """Request para busqueda de talento."""
    consulta: str
    limit: int = 10
    pais: Optional[str] = None  # Filtro opcional por pais


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


class CountriesResponse(BaseModel):
    """Response con lista de paises disponibles."""
    exito: bool
    paises: List[str]
    total: int


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
_available_countries: List[str] = []  # Cache de paises disponibles


def get_model() -> SentenceTransformer:
    """Carga el modelo de embeddings (singleton)."""
    global _model
    if _model is None:
        logger.info(f"Cargando modelo de embeddings: {EMBEDDING_MODEL}")
        _model = SentenceTransformer(EMBEDDING_MODEL)
        logger.info("Modelo cargado exitosamente")
    return _model


def find_column(df: pd.DataFrame, possible_names: list) -> Optional[str]:
    """Encuentra una columna por nombres posibles."""
    for name in possible_names:
        if name in df.columns:
            return name
        for col in df.columns:
            if name.lower() in col.lower():
                return col
    return None


def load_and_process_data() -> pd.DataFrame:
    """Carga y procesa el archivo Excel de certificaciones."""
    global _available_countries
    
    try:
        logger.info(f"Cargando datos desde: {DATA_FILE}")
        
        # Leer archivo Excel
        df = pd.read_excel(DATA_FILE, engine="openpyxl")
        logger.info(f"Archivo cargado: {len(df)} filas totales")
        logger.info(f"Columnas encontradas: {list(df.columns)}")
        
        # Limpiar valores NaN
        df = df.fillna("")
        
        # ============================================
        # FILTRO OBLIGATORIO 1: Status = Verificado
        # ============================================
        status_col = find_column(df, ["Status", "status"])
        if status_col:
            before_count = len(df)
            df = df[df[status_col].astype(str).str.strip().str.lower() == "verificado"]
            logger.info(f"Filtro Status=Verificado: {before_count} -> {len(df)} registros")
        else:
            logger.warning("Columna 'Status' no encontrada")
        
        # ============================================
        # FILTRO OBLIGATORIO 2: Expirado = Nao
        # ============================================
        expirado_col = find_column(df, ["Expirado", "expirado", "Expired"])
        if expirado_col:
            before_count = len(df)
            # Filtrar por "Nao" o "Não" (con tilde portugues)
            df = df[df[expirado_col].astype(str).str.strip().str.lower().isin(["nao", "não", "no", "n"])]
            logger.info(f"Filtro Expirado=Nao: {before_count} -> {len(df)} registros")
        else:
            logger.warning("Columna 'Expirado' no encontrada")
        
        if len(df) == 0:
            logger.warning("No se encontraron registros despues de aplicar filtros")
            return pd.DataFrame()
        
        # ============================================
        # Extraer paises disponibles para filtros
        # ============================================
        pais_col = find_column(df, ["[Colaborador] Pais", "Pais", "Country", "pais"])
        if pais_col:
            _available_countries = sorted(
                df[pais_col].astype(str).str.strip().unique().tolist()
            )
            _available_countries = [p for p in _available_countries if p]  # Remover vacios
            logger.info(f"Paises disponibles: {_available_countries}")
        
        return df
        
    except FileNotFoundError:
        logger.error(f"Archivo no encontrado: {DATA_FILE}")
        raise
    except Exception as e:
        logger.error(f"Error al cargar datos: {e}")
        raise


def get_column_value(row: pd.Series, possible_names: list, default: str = "") -> str:
    """Obtiene valor de columna buscando varios nombres posibles."""
    # Primero buscar coincidencia exacta
    for name in possible_names:
        if name in row.index:
            val = row[name]
            if pd.notna(val) and str(val).strip():
                return str(val).strip()
    
    # Luego buscar coincidencia parcial (case insensitive)
    for name in possible_names:
        for col in row.index:
            if name.lower() in col.lower():
                val = row[col]
                if pd.notna(val) and str(val).strip():
                    return str(val).strip()
    
    return default


def create_search_context(row: pd.Series) -> str:
    """Crea el texto de contexto para vectorizar concatenando campos relevantes."""
    cargo = get_column_value(row, ["[Colaborador] Cargo", "Cargo"])
    cert = get_column_value(row, ["Certificação", "Certificacao", "Certificación"])
    inst = get_column_value(row, ["Instituição", "Instituicao", "Institución"])
    pais = get_column_value(row, ["[Colaborador] País", "[Colaborador] Pais", "Pais", "País"])
    
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
        
        # Cargar paises disponibles desde la tabla
        global _available_countries
        try:
            df = _table.to_pandas()
            _available_countries = sorted(df["pais"].unique().tolist())
            _available_countries = [p for p in _available_countries if p]
        except:
            pass
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
        cert = get_column_value(row, ["Certificação", "Certificacao", "Certificación"])
        inst = get_column_value(row, ["Instituição", "Instituicao", "Institución"])
        
        # Debug: log de los primeros 3 registros
        if idx < 3:
            logger.info(f"Registro {idx}: certificacion='{cert}', institucion='{inst}'")
        
        records.append({
            "id": idx,
            "nombre": get_column_value(row, ["[Colaborador] Nome", "Nome"]),
            "cargo": get_column_value(row, ["[Colaborador] Cargo", "Cargo"]),
            "certificacion": cert,
            "institucion": inst,
            "pais": get_column_value(row, ["[Colaborador] País", "[Colaborador] Pais", "Pais", "País"]),
            "fecha_emision": get_column_value(row, ["Data de emissão", "Data de emissao", "Data"]),
            "search_context": row["search_context"],
            "vector": embeddings[idx].tolist()
        })
    
    # Crear o reemplazar tabla
    if TABLE_NAME in existing_tables:
        _db.drop_table(TABLE_NAME)
    
    _table = _db.create_table(TABLE_NAME, records)
    logger.info(f"Tabla '{TABLE_NAME}' creada con {len(records)} registros")


def search_candidates(query: str, limit: int = 10, pais: Optional[str] = None) -> list:
    """Busca candidatos usando busqueda vectorial."""
    global _table
    
    if _table is None:
        raise RuntimeError("Base de datos no inicializada. Ejecute initialize_vector_db() primero.")
    
    model = get_model()
    
    # Convertir consulta a vector
    query_vector = model.encode([query])[0].tolist()
    
    # Buscar vecinos mas cercanos (buscar mas si hay filtro de pais)
    search_limit = limit * 5 if pais else limit
    results = _table.search(query_vector).limit(search_limit).to_pandas()
    
    # Aplicar filtro de pais si se especifica
    if pais:
        results = results[results["pais"].str.lower() == pais.lower()]
    
    # Limitar resultados finales
    results = results.head(limit)
    
    # Formatear resultados
    candidates = []
    for _, row in results.iterrows():
        # Convertir distancia a score de similitud (0-1, donde 1 = mejor match)
        # LanceDB retorna _distance donde menor = mejor
        # Usamos formula: similarity = 1 / (1 + distance)
        distance = float(row.get("_distance", 0))
        similarity_score = 1 / (1 + distance)  # Siempre entre 0 y 1
        
        candidates.append({
            "nombre": row["nombre"],
            "cargo": row["cargo"],
            "certificacion": row["certificacion"],
            "institucion": row["institucion"],
            "pais": row["pais"],
            "fecha_emision": row["fecha_emision"],
            "score": similarity_score  # Ahora es 0-1 donde 1 = mejor
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
    logger.info("FILTROS ACTIVOS: Status=Verificado, Expirado=Nao")
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
    description="API REST para busqueda semantica de talento basada en certificaciones. Filtra automaticamente por Status=Verificado y Expirado=Nao.",
    version="1.1.0",
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


@app.get("/countries", response_model=CountriesResponse)
async def get_countries():
    """
    Obtiene la lista de paises disponibles para filtrar.
    Solo incluye paises de personas con Status=Verificado y Expirado=Nao.
    """
    return CountriesResponse(
        exito=True,
        paises=_available_countries,
        total=len(_available_countries)
    )


@app.post("/search", response_model=TalentSearchResponse)
async def search_talent(request: TalentSearchRequest):
    """
    Busca candidatos idoneos basandose en una consulta en lenguaje natural.
    
    - **consulta**: Descripcion de las habilidades o perfil buscado
    - **limit**: Numero maximo de resultados (default: 10)
    - **pais**: Filtro opcional por pais
    
    NOTA: Solo retorna personas con Status=Verificado y Expirado=Nao
    """
    try:
        if _table is None:
            raise HTTPException(
                status_code=503,
                detail="Base de datos no inicializada. El servicio esta en modo degradado."
            )
        
        logger.info(f"Buscando talento: '{request.consulta}' | pais={request.pais} | limit={request.limit}")
        candidates = search_candidates(request.consulta, limit=request.limit, pais=request.pais)
        
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
    limit: int = Query(10, ge=1, le=50, description="Numero maximo de resultados"),
    pais: Optional[str] = Query(None, description="Filtrar por pais")
):
    """
    Busca candidatos (metodo GET para facilitar pruebas).
    """
    return await search_talent(TalentSearchRequest(consulta=consulta, limit=limit, pais=pais))


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
                "mensaje": f"Indice reconstruido exitosamente con {count} registros.",
                "paises_disponibles": _available_countries
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

try:
    from mcp.server.fastmcp import FastMCP
    mcp = FastMCP("buscador-talento")
    MCP_AVAILABLE = True
    
    @mcp.tool()
    def buscar_talento(consulta: str, pais: str = None) -> str:
        """
        Busca candidatos idoneos basandose en una consulta en lenguaje natural.
        Solo retorna personas con Status=Verificado y Expirado=Nao.
        
        Args:
            consulta: Descripcion de las habilidades o perfil buscado.
            pais: Filtro opcional por pais.
        
        Returns:
            JSON string con lista de candidatos encontrados.
        """
        try:
            candidates = search_candidates(consulta, limit=10, pais=pais)
            
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
    def listar_paises() -> str:
        """Lista los paises disponibles para filtrar la busqueda."""
        return json.dumps({
            "exito": True,
            "paises": _available_countries,
            "total": len(_available_countries)
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
                    "mensaje": f"Indice reconstruido con {count} registros.",
                    "paises_disponibles": _available_countries
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
