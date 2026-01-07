"""
Servidor MCP: Buscador de Talento Semántico
Permite buscar candidatos idóneos en una base de datos de certificaciones usando RAG.
"""

import os
import json
import logging
from pathlib import Path

import pandas as pd
import lancedb
from sentence_transformers import SentenceTransformer
from mcp.server.fastmcp import FastMCP

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuración de rutas
BASE_DIR = Path(__file__).parent
DATA_FILE = BASE_DIR / "Capital Intelectual.xlsx"
LANCEDB_PATH = BASE_DIR / "lancedb_data"
TABLE_NAME = "certificaciones"

# Columnas del archivo (nombres exactos)
COL_CERTIFICACION = "Certificação"
COL_INSTITUCION = "Instituição"
COL_STATUS = "Status"
COL_NOMBRE = "[Colaborador] Nome"
COL_CARGO = "[Colaborador] Cargo"
COL_PAIS = "[Colaborador] País"
COL_FECHA_EMISION = "Data de emissão"

# Modelo multilingüe para embeddings (PT/ES)
EMBEDDING_MODEL = "paraphrase-multilingual-MiniLM-L12-v2"

# Inicializar FastMCP
mcp = FastMCP("buscador-talento")

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
        
        # Limpiar valores NaN
        df = df.fillna("")
        
        # FILTRO CRÍTICO: Solo procesar certificaciones verificadas
        if COL_STATUS in df.columns:
            df = df[df[COL_STATUS].str.strip().str.lower() == "verificado"]
            logger.info(f"Filas después de filtrar por 'Verificado': {len(df)}")
        else:
            logger.warning(f"Columna '{COL_STATUS}' no encontrada. Procesando todas las filas.")
        
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


def create_search_context(row: pd.Series) -> str:
    """Crea el texto de contexto para vectorizar concatenando campos relevantes."""
    parts = [
        str(row.get(COL_CARGO, "")),
        str(row.get(COL_CERTIFICACION, "")),
        str(row.get(COL_INSTITUCION, "")),
        str(row.get(COL_PAIS, ""))
    ]
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
    
    # Crear contexto de búsqueda para cada fila
    df["search_context"] = df.apply(create_search_context, axis=1)
    
    # Generar embeddings
    contexts = df["search_context"].tolist()
    embeddings = model.encode(contexts, show_progress_bar=True)
    
    # Preparar datos para LanceDB
    records = []
    for idx, (_, row) in enumerate(df.iterrows()):
        records.append({
            "id": idx,
            "nombre": str(row.get(COL_NOMBRE, "")),
            "cargo": str(row.get(COL_CARGO, "")),
            "certificacion": str(row.get(COL_CERTIFICACION, "")),
            "institucion": str(row.get(COL_INSTITUCION, "")),
            "pais": str(row.get(COL_PAIS, "")),
            "fecha_emision": str(row.get(COL_FECHA_EMISION, "")),
            "search_context": row["search_context"],
            "vector": embeddings[idx].tolist()
        })
    
    # Crear o reemplazar tabla
    if TABLE_NAME in existing_tables:
        _db.drop_table(TABLE_NAME)
    
    _table = _db.create_table(TABLE_NAME, records)
    logger.info(f"Tabla '{TABLE_NAME}' creada con {len(records)} registros")


def search_candidates(query: str, limit: int = 10) -> list[dict]:
    """Busca candidatos usando búsqueda vectorial."""
    global _table
    
    if _table is None:
        raise RuntimeError("Base de datos no inicializada. Ejecute initialize_vector_db() primero.")
    
    model = get_model()
    
    # Convertir consulta a vector
    query_vector = model.encode([query])[0].tolist()
    
    # Buscar vecinos más cercanos
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


@mcp.tool()
def buscar_talento(consulta: str) -> str:
    """
    Busca candidatos idóneos basándose en una consulta en lenguaje natural.
    
    Args:
        consulta: Descripción de las habilidades o perfil buscado.
                  Ejemplo: "Busco experto en seguridad cloud en Colombia"
    
    Returns:
        JSON string con lista de candidatos encontrados (Nombre, Cargo, Certificación, País).
    """
    try:
        logger.info(f"Buscando talento con consulta: {consulta}")
        
        # Realizar búsqueda
        candidates = search_candidates(consulta, limit=10)
        
        if not candidates:
            return json.dumps({
                "exito": False,
                "mensaje": "No se encontraron candidatos que coincidan con la búsqueda.",
                "candidatos": []
            }, ensure_ascii=False, indent=2)
        
        logger.info(f"Encontrados {len(candidates)} candidatos")
        
        return json.dumps({
            "exito": True,
            "mensaje": f"Se encontraron {len(candidates)} candidatos.",
            "candidatos": candidates
        }, ensure_ascii=False, indent=2)
        
    except Exception as e:
        logger.error(f"Error en búsqueda: {e}")
        return json.dumps({
            "exito": False,
            "mensaje": f"Error al realizar la búsqueda: {str(e)}",
            "candidatos": []
        }, ensure_ascii=False, indent=2)


@mcp.tool()
def reiniciar_indice() -> str:
    """
    Reconstruye el índice vectorial desde el archivo Excel.
    Útil cuando se actualiza el archivo de datos.
    
    Returns:
        Mensaje indicando el resultado de la operación.
    """
    try:
        logger.info("Reiniciando índice vectorial...")
        initialize_vector_db(force_rebuild=True)
        
        if _table is not None:
            count = _table.count_rows()
            return json.dumps({
                "exito": True,
                "mensaje": f"Índice reconstruido exitosamente con {count} registros."
            }, ensure_ascii=False)
        else:
            return json.dumps({
                "exito": False,
                "mensaje": "No se pudo reconstruir el índice. Verifique el archivo de datos."
            }, ensure_ascii=False)
            
    except Exception as e:
        logger.error(f"Error al reiniciar índice: {e}")
        return json.dumps({
            "exito": False,
            "mensaje": f"Error al reconstruir el índice: {str(e)}"
        }, ensure_ascii=False)


@mcp.tool()
def estadisticas_base() -> str:
    """
    Obtiene estadísticas de la base de datos de certificaciones.
    
    Returns:
        JSON con estadísticas (total registros, países, instituciones, etc.)
    """
    try:
        if _table is None:
            return json.dumps({
                "exito": False,
                "mensaje": "Base de datos no inicializada."
            }, ensure_ascii=False)
        
        # Obtener todos los datos
        df = _table.to_pandas()
        
        stats = {
            "total_certificaciones": len(df),
            "total_colaboradores": df["nombre"].nunique(),
            "paises": df["pais"].value_counts().to_dict(),
            "instituciones_top_10": df["institucion"].value_counts().head(10).to_dict(),
            "cargos_top_10": df["cargo"].value_counts().head(10).to_dict()
        }
        
        return json.dumps({
            "exito": True,
            "estadisticas": stats
        }, ensure_ascii=False, indent=2)
        
    except Exception as e:
        logger.error(f"Error al obtener estadísticas: {e}")
        return json.dumps({
            "exito": False,
            "mensaje": f"Error: {str(e)}"
        }, ensure_ascii=False)


def main():
    """Punto de entrada principal del servidor MCP."""
    logger.info("Iniciando servidor MCP: Buscador de Talento")
    
    # Inicializar base de datos vectorial al arrancar
    try:
        initialize_vector_db()
    except FileNotFoundError:
        logger.warning(f"Archivo de datos no encontrado: {DATA_FILE}")
        logger.warning("El servidor se iniciará sin datos. Use reiniciar_indice() cuando el archivo esté disponible.")
    except Exception as e:
        logger.error(f"Error durante inicialización: {e}")
        logger.warning("El servidor se iniciará en modo degradado.")
    
    # Ejecutar servidor MCP
    mcp.run()


if __name__ == "__main__":
    main()
