"""
Cliente HTTP para el servicio MCP de Busqueda de Talento

Este modulo proporciona una interfaz para comunicarse con el servicio MCP
que maneja la busqueda semantica de candidatos basada en certificaciones.
"""

import httpx
from typing import List, Dict, Optional, Any
from pydantic import BaseModel
import logging
from core.config import settings

logger = logging.getLogger(__name__)


# ============================================================================
# SCHEMAS - Compatibles con el servicio MCP
# ============================================================================

class Candidato(BaseModel):
    """Modelo de candidato encontrado en la busqueda."""
    nombre: str
    cargo: str
    certificacion: str
    institucion: str
    pais: str
    fecha_emision: str
    score: float


class TalentSearchRequest(BaseModel):
    """Request para busqueda de talento."""
    consulta: str
    limit: int = 10


class TalentSearchResponse(BaseModel):
    """Response de busqueda de talento."""
    exito: bool
    mensaje: str
    candidatos: List[Candidato]


class MCPHealthResponse(BaseModel):
    """Response de health check del MCP."""
    status: str
    total_registros: int
    modelo_cargado: bool


# ============================================================================
# CLIENTE MCP - IMPLEMENTACION
# ============================================================================

class MCPTalentClient:
    """
    Cliente para el servicio MCP de busqueda de talento.

    Proporciona metodos para:
    - Busqueda semantica de candidatos por skills/certificaciones
    - Verificacion de salud del servicio
    - Obtencion de estadisticas
    """

    def __init__(
        self,
        base_url: str = None,
        timeout: float = 30.0
    ):
        """
        Inicializa el cliente MCP.

        Args:
            base_url: URL base del servicio MCP
            timeout: Timeout en segundos para requests HTTP
        """
        self.base_url = (base_url or getattr(settings, 'MCP_SERVICE_URL', 'https://mcp-tivit.eastus2.cloudapp.azure.com')).rstrip('/')
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None
        self._enabled = getattr(settings, 'MCP_SERVICE_ENABLED', True)

        logger.info(f"MCP_CLIENT: Inicializado con base_url={self.base_url}, enabled={self._enabled}")

    async def _get_client(self) -> httpx.AsyncClient:
        """Obtiene o crea un cliente HTTP async"""
        if self._client is None:
            headers = {"Content-Type": "application/json"}
            self._client = httpx.AsyncClient(
                timeout=self.timeout,
                headers=headers
            )
        return self._client

    async def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Hace una peticion HTTP al servicio MCP"""
        if not self._enabled:
            logger.warning("MCP_CLIENT: Servicio deshabilitado")
            return {"exito": False, "mensaje": "Servicio MCP deshabilitado", "candidatos": []}

        client = await self._get_client()
        url = f"{self.base_url}{endpoint}"

        try:
            response = await client.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"MCP HTTP error {e.response.status_code}: {e.response.text}")
            raise Exception(f"MCP service error: {e.response.status_code}")
        except httpx.RequestError as e:
            logger.error(f"MCP request error: {e}")
            raise Exception(f"MCP service unavailable: {e}")
        except Exception as e:
            logger.error(f"MCP unexpected error: {e}")
            raise Exception(f"MCP service error: {e}")

    async def search_talent(
        self,
        consulta: str,
        limit: int = 10,
        pais: Optional[str] = None
    ) -> TalentSearchResponse:
        """
        Busca candidatos relevantes para una consulta.

        Args:
            consulta: Descripcion en lenguaje natural del perfil buscado
            limit: Numero maximo de resultados
            pais: Filtro opcional por pais

        Returns:
            TalentSearchResponse con los candidatos encontrados
        """
        try:
            payload = {
                "consulta": consulta,
                "limit": limit
            }
            if pais:
                payload["pais"] = pais

            response_data = await self._make_request("POST", "/search", json=payload)

            # Convertir respuesta
            candidatos = [Candidato(**c) for c in response_data.get("candidatos", [])]
            
            result = TalentSearchResponse(
                exito=response_data.get("exito", False),
                mensaje=response_data.get("mensaje", ""),
                candidatos=candidatos
            )

            logger.info(f"MCP search: {len(candidatos)} candidatos para '{consulta[:50]}...'")
            return result

        except Exception as e:
            logger.error(f"MCP search error: {e}")
            return TalentSearchResponse(
                exito=False,
                mensaje=f"Error en busqueda: {str(e)}",
                candidatos=[]
            )

    async def search_talent_for_role(
        self,
        rol: str,
        skills: List[str] = None,
        pais: str = None,
        limit: int = 5
    ) -> List[Candidato]:
        """
        Busca candidatos especificos para un rol de equipo.

        Args:
            rol: Nombre del rol (ej: "Arquitecto Cloud")
            skills: Lista de skills requeridos
            pais: Pais preferido (opcional)
            limit: Numero maximo de resultados

        Returns:
            Lista de candidatos encontrados
        """
        # Construir consulta semantica
        query_parts = [rol]
        if skills:
            query_parts.extend(skills[:3])  # Limitar a 3 skills principales
        if pais:
            query_parts.append(pais)
        
        consulta = " ".join(query_parts)
        
        result = await self.search_talent(consulta, limit=limit)
        return result.candidatos

    async def enrich_team_suggestions(
        self,
        equipo_sugerido: List[Dict[str, Any]],
        pais: str = None
    ) -> List[Dict[str, Any]]:
        """
        Enriquece las sugerencias de equipo con candidatos reales.

        Args:
            equipo_sugerido: Lista de roles sugeridos por el LLM
            pais: Pais del proyecto (para filtrar candidatos)

        Returns:
            Lista enriquecida con candidatos reales para cada rol
        """
        enriched_team = []
        
        for miembro in equipo_sugerido:
            rol = miembro.get("rol", "")
            skills = miembro.get("skills", [])
            cantidad = miembro.get("cantidad", 1)
            
            # Buscar candidatos para este rol
            candidatos = await self.search_talent_for_role(
                rol=rol,
                skills=skills,
                pais=pais,
                limit=min(cantidad * 3, 10)  # Buscar mas opciones
            )
            
            # Agregar candidatos al miembro
            enriched_miembro = {
                **miembro,
                "candidatos_sugeridos": [
                    {
                        "nombre": c.nombre,
                        "cargo_actual": c.cargo,
                        "certificacion": c.certificacion,
                        "institucion": c.institucion,
                        "pais": c.pais,
                        "match_score": round(1 - c.score, 2) if c.score < 1 else c.score  # Convertir distancia a score
                    }
                    for c in candidatos[:cantidad * 2]  # Dar opciones extra
                ]
            }
            
            enriched_team.append(enriched_miembro)
            logger.info(f"MCP: Encontrados {len(candidatos)} candidatos para rol '{rol}'")
        
        return enriched_team

    async def health_check(self) -> Dict[str, Any]:
        """
        Verifica el estado del servicio MCP.

        Returns:
            Dict con informacion de salud del servicio
        """
        try:
            response_data = await self._make_request("GET", "/health")
            return response_data
        except Exception as e:
            logger.error(f"MCP health check failed: {e}")
            return {"status": "error", "detail": str(e)}

    async def get_statistics(self) -> Dict[str, Any]:
        """
        Obtiene estadisticas de la base de datos de talento.

        Returns:
            Dict con estadisticas
        """
        try:
            response_data = await self._make_request("GET", "/stats")
            return response_data
        except Exception as e:
            logger.error(f"MCP stats error: {e}")
            return {"exito": False, "mensaje": str(e)}

    async def get_countries(self) -> Dict[str, Any]:
        """
        Obtiene la lista de paises disponibles para filtrar.

        Returns:
            Dict con lista de paises
        """
        try:
            response_data = await self._make_request("GET", "/countries")
            return response_data
        except Exception as e:
            logger.error(f"MCP countries error: {e}")
            return {"exito": False, "paises": [], "total": 0}

    async def close(self):
        """Cierra la conexion HTTP del cliente."""
        if self._client:
            await self._client.aclose()
            self._client = None
        logger.info("MCP_CLIENT: Conexion cerrada")


# ============================================================================
# INSTANCIA GLOBAL
# ============================================================================

mcp_talent_client = MCPTalentClient(
    base_url=getattr(settings, 'MCP_SERVICE_URL', 'https://mcp-tivit.eastus2.cloudapp.azure.com'),
    timeout=30.0
)

logger.info("MCP_CLIENT: Cliente de talento activado")
