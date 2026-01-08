import json
import asyncio
from typing import Dict, Any, Optional, List
from fastapi import UploadFile, HTTPException, status, File
from sqlalchemy.orm import Session
from api.service.proposals_service import ProposalsService
from prompts.proposals.analyze_prompts import AnalyzePrompts
from utils.file_util import FileUtil
from core import llm_service
from core.mcp_client import mcp_talent_client
from models.user import User
from models.workspace import Workspace
from models.conversation import Conversation, Message
import logging

logger = logging.getLogger(__name__)

# Prompt para generar nombre del workspace
WORKSPACE_NAME_PROMPT = """Basándote en el siguiente análisis de un documento RFP/propuesta, genera un nombre corto y descriptivo para el workspace.

El nombre debe:
- Tener máximo 50 caracteres
- Ser descriptivo del proyecto/licitación
- Incluir el nombre del cliente si está disponible
- NO incluir la palabra "RFP" ni "Análisis"

Datos del análisis:
- Cliente: {cliente}
- Operación: {operacion}
- País: {pais}
- Categoría: {categoria}

Responde SOLO con el nombre, sin explicaciones ni comillas. Ejemplo: "Modernización TI Banco Nacional"
"""

# Prompt para generar resumen inicial del chat
INITIAL_CHAT_SUMMARY_PROMPT = """Genera un mensaje de bienvenida conciso para un chat de análisis de RFP.

Basándote en estos datos extraídos:
- Cliente: {cliente}
- Operación: {operacion}
- País: {pais}
- Objetivo: {objetivo}
- Presupuesto estimado: {presupuesto}
- Tecnologías: {tecnologias}
- Equipo sugerido: {equipo_count} roles

El mensaje debe:
1. Saludar brevemente
2. Resumir los puntos clave del RFP en 3-4 bullets
3. Preguntar cómo puede ayudar

Usa formato Markdown. Máximo 300 palabras.
"""
class ProposalsServiceImpl(ProposalsService):

    async def analyze(  
        self,  
        file: UploadFile,
        db: Session,
        user: User
    ) -> Dict[str, Any]:
        if file:
            FileUtil.validate_supported_file(file)
            try:
                # Validar y extraer texto soportando PDF o DOCX
                document_text = await FileUtil.extract_text(file)
                prompt = AnalyzePrompts.create_analysis_JSON_prompt(document_text = document_text, max_length=8000)
                
                # 1. Ejecutar análisis IA
                analysis_result = self._analyze_with_ia(prompt)
                
                # 1.5 Enriquecer equipo sugerido con candidatos reales (MCP)
                analysis_result = await self._enrich_team_with_mcp(
                    analysis_result, 
                    pais=analysis_result.get("pais")
                )
                
                # 2. Generar nombre del workspace con IA
                workspace_name = await self._generate_workspace_name(analysis_result)
                
                # 3. Persistir como Workspace
                try:
                    # Limpieza básica de datos antes de guardar
                    tvt_val = analysis_result.get("tvt")
                    if isinstance(tvt_val, str):
                        # Intentar limpiar símbolos de moneda si vienen
                        tvt_val = float(tvt_val.replace('$', '').replace(',', '').strip()) if tvt_val else 0.0
                    
                    tech_stack_val = analysis_result.get("stack_tecnologico")
                    # tech_stack en DB es JSON, SQLAlchemy maneja listas/dicts automáticamente si el dialecto lo soporta o si es JSON type
                    
                    new_workspace = Workspace(
                        name=workspace_name,  # Nombre generado por IA
                        description=f"Análisis automático. Cliente: {analysis_result.get('cliente', 'Desconocido')}",
                        owner_id=user.id,
                        is_active=True,
                        
                        # Campos estratégicos mapeados
                        client_company=analysis_result.get("cliente"),
                        country=analysis_result.get("pais"),
                        tvt=float(tvt_val) if tvt_val else None,
                        operation_name=analysis_result.get("nombre_operacion"),
                        tech_stack=tech_stack_val if isinstance(tech_stack_val, list) else [str(tech_stack_val)] if tech_stack_val else [],
                        opportunity_type=analysis_result.get("tipo_oportunidad", "RFP"),
                        category=analysis_result.get("categoria"),
                        objective=analysis_result.get("objetivo_general"),
                        estimated_time=analysis_result.get("tiempo_aproximado"),
                        resource_count=analysis_result.get("nro_recursos"),
                        
                        # Guardar resultado completo en instructions para contexto
                        instructions=json.dumps(analysis_result, ensure_ascii=False)
                    )
                    
                    db.add(new_workspace)
                    db.commit()
                    db.refresh(new_workspace)
                    
                    logger.info(f"Workspace creado: {new_workspace.id} - {workspace_name}")
                    
                    # 4. Crear conversación automática con resumen del análisis
                    conversation_id = await self._create_initial_conversation(
                        db=db,
                        workspace_id=str(new_workspace.id),
                        user_id=str(user.id),
                        analysis_result=analysis_result
                    )
                    
                    logger.info(f"Conversación inicial creada: {conversation_id}")
                    
                    # 5. Retornar ID junto con análisis
                    return {
                        "analysis": analysis_result,
                        "workspace_id": str(new_workspace.id),
                        "conversation_id": conversation_id
                    }
                    
                except Exception as db_error:
                    logger.error(f"Error persistiendo workspace: {db_error}")
                    # No fallar todo el proceso si solo falla el guardado, pero idealmente sí
                    # Para este fix, retornamos el análisis aun si falla la BD? 
                    # El requerimiento es "Persistencia Automática", así que si falla, debería ser error.
                    db.rollback()
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                        detail=f"Error guardando el análisis en base de datos: {str(db_error)}"
                    )

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error al analizar RFP: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error al analizar el documento: {str(e)}"
                )

    async def _generate_workspace_name(self, analysis_result: Dict[str, Any]) -> str:
        """
        Genera un nombre descriptivo para el workspace usando IA.
        
        Args:
            analysis_result: Resultado del análisis del RFP
            
        Returns:
            Nombre generado para el workspace
        """
        try:
            prompt = WORKSPACE_NAME_PROMPT.format(
                cliente=analysis_result.get("cliente", "No especificado"),
                operacion=analysis_result.get("nombre_operacion", "No especificado"),
                pais=analysis_result.get("pais", "No especificado"),
                categoria=analysis_result.get("categoria", "No especificado")
            )
            
            # Generar nombre con LLM
            name = llm_service.generate_response(query=prompt, context_chunks=[])
            name = name.strip().replace('"', '').replace("'", "")[:50]  # Limpiar y truncar
            
            if not name or len(name) < 5:
                # Fallback si el nombre es muy corto o vacío
                cliente = analysis_result.get("cliente", "")
                operacion = analysis_result.get("nombre_operacion", "")
                name = f"{cliente} - {operacion}"[:50] if cliente else f"Proyecto {operacion}"[:50]
            
            logger.info(f"Nombre de workspace generado: {name}")
            return name
            
        except Exception as e:
            logger.warning(f"Error generando nombre con IA, usando fallback: {e}")
            # Fallback: usar cliente + operación
            cliente = analysis_result.get("cliente", "Nuevo Proyecto")
            return f"{cliente}"[:50]

    async def _create_initial_conversation(
        self,
        db: Session,
        workspace_id: str,
        user_id: str,
        analysis_result: Dict[str, Any]
    ) -> str:
        """
        Crea una conversación inicial automática con el resumen del análisis.
        
        Args:
            db: Sesión de base de datos
            workspace_id: ID del workspace
            user_id: ID del usuario
            analysis_result: Resultado del análisis
            
        Returns:
            ID de la conversación creada
        """
        try:
            # Generar mensaje de bienvenida con IA
            equipo = analysis_result.get("equipo_sugerido", [])
            tecnologias = analysis_result.get("stack_tecnologico", [])
            if isinstance(tecnologias, list):
                tecnologias = ", ".join(tecnologias[:5])
            
            prompt = INITIAL_CHAT_SUMMARY_PROMPT.format(
                cliente=analysis_result.get("cliente", "No especificado"),
                operacion=analysis_result.get("nombre_operacion", "No especificado"),
                pais=analysis_result.get("pais", "No especificado"),
                objetivo=analysis_result.get("objetivo_general", "No especificado")[:200],
                presupuesto=analysis_result.get("tvt", "No especificado"),
                tecnologias=tecnologias,
                equipo_count=len(equipo) if isinstance(equipo, list) else 0
            )
            
            # Generar mensaje inicial
            try:
                initial_message = llm_service.generate_response(query=prompt, context_chunks=[])
            except Exception as llm_error:
                logger.warning(f"Error generando mensaje con IA: {llm_error}")
                # Fallback: mensaje genérico
                initial_message = self._generate_fallback_summary(analysis_result)
            
            # Crear conversación
            conversation = Conversation(
                workspace_id=workspace_id,
                user_id=user_id,
                title="Análisis del RFP",
                has_proposal=False
            )
            db.add(conversation)
            db.flush()  # Para obtener el ID
            
            # Crear mensaje inicial del asistente
            message = Message(
                conversation_id=str(conversation.id),
                role="assistant",
                content=initial_message
            )
            db.add(message)
            db.commit()
            
            return str(conversation.id)
            
        except Exception as e:
            logger.error(f"Error creando conversación inicial: {e}")
            db.rollback()
            # No fallar todo el proceso por esto
            return ""

    def _generate_fallback_summary(self, analysis_result: Dict[str, Any]) -> str:
        """Genera un resumen fallback si falla la IA."""
        cliente = analysis_result.get("cliente", "el cliente")
        operacion = analysis_result.get("nombre_operacion", "el proyecto")
        objetivo = analysis_result.get("objetivo_general", "")
        
        return f"""¡Hola! He analizado el documento del RFP.

**Resumen del análisis:**

- **Cliente:** {cliente}
- **Proyecto:** {operacion}
- **Objetivo principal:** {objetivo[:150] if objetivo else 'No especificado'}

He extraído los requisitos principales, tecnologías requeridas y he sugerido un equipo de trabajo.

¿En qué puedo ayudarte? Puedo:
- Responder preguntas sobre el RFP
- Ayudarte a completar los datos del análisis
- Generar una propuesta comercial
"""
                
    def analyze_stream(  
        self,  
        relevant_chunks: Dict[str, Any],
        query : str,
        workspace_instructions : str
    ):
        try:
            prompt = AnalyzePrompts.create_markdown_analysis_prompt()
            full_prompt = f"""
                prompt : {prompt}
                pregunta: {query}
                system_instructions: {workspace_instructions}
            """

            response = self._analyze_with_ia_stream(full_prompt, relevant_chunks)
            
            #response_text = json.dumps(response, ensure_ascii=False, indent=2)
            #nuevos_skills = self._consume_api(response_text)

            #if "equipo_sugerido" in response:
                #for miembro in response["equipo_sugerido"]:
                   # if "skills" in miembro and isinstance(miembro["skills"], list):
                       # miembro["skills"].extend(nuevos_skills)

            return response
        except Exception as e:
            logger.error(f"Error al analizar RFP: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al analizar el documento: {str(e)}"
            )
            

    def _analyze_with_ia_stream(self, prompt: str, relevant_chunks: Dict[str, Any]) -> Dict[str, Any]: 
        """Método auxiliar y privado para la lógica del LLM y el parseo."""
        try:
            response =  llm_service.generate_response_stream(query=prompt, context_chunks=relevant_chunks, model_override="") 
            logger.info(response)
            return response
        except Exception as e:
            logger.error(f"Error al analizar stream chunks: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error en la comunicación con la IA: {e.__class__.__name__}"
            )
            
    def _analyze_with_ia(self, prompt: str) -> Dict[str, Any]: 
        """Método auxiliar y privado para la lógica del LLM y el parseo."""
        try:
            response =  llm_service.generate_response(query=prompt, context_chunks=[]) 
            response_text = self._clean_llm_response(response)
            print("===== RESPUESTA DEL LLM =====")
            print(response_text)
            print("=============================")
            return json.loads(response_text)
                
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al procesar la respuesta del análisis (JSON inválido)."
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error en la comunicación con la IA: {e.__class__.__name__}"
            )

    def _clean_llm_response(self, response: str) -> str:
        """Helper para remover envoltorios de Markdown (`json)"""
        response_text = response.strip()
        # Simplificando la limpieza:
        if response_text.startswith(("```json", "```")):
            response_text = response_text.replace("```json", "", 1).replace("```", "", 1)
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        return response_text.strip()
    
    async def _enrich_team_with_mcp(
        self, 
        analysis_result: Dict[str, Any],
        pais: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Enriquece el equipo sugerido con candidatos reales del MCP.
        
        Args:
            analysis_result: Resultado del analisis LLM
            pais: Pais del proyecto para filtrar candidatos
            
        Returns:
            analysis_result con equipo_sugerido enriquecido
        """
        equipo_sugerido = analysis_result.get("equipo_sugerido", [])
        
        if not equipo_sugerido:
            logger.info("No hay equipo_sugerido para enriquecer")
            return analysis_result
        
        try:
            logger.info(f"Enriqueciendo {len(equipo_sugerido)} roles con MCP...")
            
            # Llamar al MCP para enriquecer cada rol
            enriched_team = await mcp_talent_client.enrich_team_suggestions(
                equipo_sugerido=equipo_sugerido,
                pais=pais
            )
            
            # Actualizar el resultado
            analysis_result["equipo_sugerido"] = enriched_team
            
            total_candidatos = sum(
                len(m.get("candidatos_sugeridos", [])) 
                for m in enriched_team
            )
            logger.info(f"Equipo enriquecido con {total_candidatos} candidatos sugeridos")
            
        except Exception as e:
            logger.warning(f"Error enriqueciendo equipo con MCP (continuando sin enriquecer): {e}")
            # No fallar el analisis si MCP no esta disponible
        
        return analysis_result
    
    def _consume_api(self, response: str) -> list:
        """Legacy method - kept for backwards compatibility but deprecated."""
        # Este metodo esta deprecado, usar MCP client en su lugar
        logger.warning("_consume_api is deprecated, use MCP client instead")
        return []