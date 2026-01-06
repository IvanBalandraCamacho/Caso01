import json
from typing import Dict, Any, Optional
from fastapi import UploadFile, HTTPException, requests, status, File
from sqlalchemy.orm import Session
from api.service.proposals_service import ProposalsService
from prompts.proposals.analyze_prompts import AnalyzePrompts
from utils.file_util import FileUtil
from core import llm_service
from models.user import User
from models.workspace import Workspace
import logging

logger = logging.getLogger(__name__)
class ProposalsServiceImpl(ProposalsService):

    async def analyze(  
        self,  
        file: UploadFile,
        db: Session,
        user: User
    ) -> Dict[str, Any]:
        if file:
            logger.info(file)
            FileUtil.validate_supported_file(file)
            try:
                # Validar y extraer texto soportando PDF o DOCX
                document_text = await FileUtil.extract_text(file)
                prompt = AnalyzePrompts.create_analysis_JSON_prompt(document_text = document_text, max_length=8000)
                
                # 1. Ejecutar análisis IA
                analysis_result = self._analyze_with_ia(prompt)
                
                # 2. Persistir como Workspace
                try:
                    # Limpieza básica de datos antes de guardar
                    tvt_val = analysis_result.get("tvt")
                    if isinstance(tvt_val, str):
                        # Intentar limpiar símbolos de moneda si vienen
                        tvt_val = float(tvt_val.replace('$', '').replace(',', '').strip()) if tvt_val else 0.0
                    
                    tech_stack_val = analysis_result.get("stack_tecnologico")
                    # tech_stack en DB es JSON, SQLAlchemy maneja listas/dicts automáticamente si el dialecto lo soporta o si es JSON type
                    
                    new_workspace = Workspace(
                        name=f"Análisis RFP: {file.filename}",
                        description=f"Auto-generado del archivo {file.filename}. Cliente: {analysis_result.get('cliente', 'Desconocido')}",
                        owner_id=user.id,
                        is_active=True,
                        
                        # Campos estratégicos mapeados
                        client_company=analysis_result.get("cliente"),
                        country=analysis_result.get("pais"),
                        tvt=float(tvt_val) if tvt_val else None,
                        operation_name=analysis_result.get("nombre_operacion"),
                        tech_stack=tech_stack_val if isinstance(tech_stack_val, list) else [str(tech_stack_val)] if tech_stack_val else [],
                        opportunity_type="RFP",
                        category=analysis_result.get("categoria"),
                        
                        # Guardar resultado completo en instructions para contexto
                        instructions=json.dumps(analysis_result, ensure_ascii=False)
                    )
                    
                    db.add(new_workspace)
                    db.commit()
                    db.refresh(new_workspace)
                    
                    logger.info(f"Workspace creado automáticamente: {new_workspace.id}")
                    
                    # 3. Retornar ID junto con análisis
                    return {
                        "analysis": analysis_result,
                        "workspace_id": str(new_workspace.id)
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
    
    def _consume_api(self, response: str) -> list[str]:
        external_url = "http://localhost:8095/recomendations/recommend"
        payload = {
            "requirement": response,
            "limit": 3,
            "umbral": 2
        }

        try:
            api_result = requests.post(external_url, json=payload)
            api_result.raise_for_status()

            trabajadores = api_result.json() 
            textos = []

            for t in trabajadores:
                if isinstance(t, dict):
                    texto = "\n".join([
                        f"{k}: {v}" for k, v in t.items()
                    ])
                    textos.append(texto)
                else:
                    textos.append(str(t))

            return textos

        except Exception as e:
            logger.error(f"Error consumiendo API externa: {str(e)}")
            return []