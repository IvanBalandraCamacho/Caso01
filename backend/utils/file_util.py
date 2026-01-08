from fastapi import UploadFile, HTTPException
import os
import tempfile
import pdfplumber
from typing import Optional
from exceptions import ExternalServiceError, InvalidFileError 
import logging
import docx

logger = logging.getLogger(__name__)


class FileUtil:
    
    @staticmethod
    def validate_supported_file(file: Optional[UploadFile] = None) -> None:
        """
        Valida que el archivo subido sea PDF o DOCX y que no esté vacío.
        Lanza InvalidFileError o HTTPException si la validación falla.
        """
        
        if not file or not getattr(file, "filename", None):
            raise InvalidFileError(detail="No se proporcionó ningún archivo.")

        filename = file.filename.lower()
        if filename.endswith(".pdf") or filename.endswith(".docx"):
            pass
        elif filename.endswith(".doc"):
            raise HTTPException(status_code=400, detail="Formato .doc no soportado. Por favor convierta a .docx y vuelva a intentar.")
        else:
            raise HTTPException(status_code=400, detail="Formato no soportado. Se acepta .pdf o .docx.")

        # si el objeto UploadFile tiene size (según implementaciones), validar > 0
        if getattr(file, "size", None) is not None and file.size == 0:
            raise InvalidFileError(detail="El archivo no puede estar vacío.")
        
    @staticmethod
    async def extract_text(file: Optional[UploadFile] = None) -> str:
        """
        Extrae texto del archivo, soportando PDF y DOCX.
        """
        if not file:
            raise InvalidFileError(detail="No se proporcionó ningún archivo para extraer texto.")

        # Validar y extraer texto soportando PDF, DOCX, XLSX, CSV, TXT
        filename = file.filename.lower()
        if filename.endswith(".pdf"):
            return await FileUtil.extract_text_from_pdf(file)
        elif filename.endswith(".xlsx") or filename.endswith(".csv"):
            # Excel/CSV: retornar mensaje informativo
            return f"[Archivo {filename}: Tipo tabular detectado. Requiere procesamiento especializado]"
        elif filename.endswith(".txt"):
            # TXT: lectura directa
            content = await file.read()
            return content.decode('utf-8', errors='replace')
        elif filename.endswith(".docx"):
            tmp_path = None
            try:
                # Crear un archivo temporal con extensión .docx
                with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as tmp_file:
                    content = await file.read()
                    logger.info(f"Procesando archivo DOCX ({len(content)} bytes)")
                    tmp_file.write(content)
                    tmp_path = tmp_file.name

                try:
                    # Extraer texto del archivo .docx
                    doc = docx.Document(tmp_path)
                    paragraphs = [p.text for p in doc.paragraphs if p.text]
                    doc_text = "\n".join(paragraphs)
                except Exception as e:
                    raise InvalidFileError(detail=f"Error al procesar el DOCX: {str(e)}")

                if not doc_text.strip():
                    raise InvalidFileError(detail="El DOCX no contiene texto extraíble.")

                return doc_text

            except InvalidFileError:
                raise
            except Exception as e:
                raise ExternalServiceError(detail=f"Error interno al manejar el archivo temporal: {e.__class__.__name__}")
            finally:
                if tmp_path and os.path.exists(tmp_path):
                    os.unlink(tmp_path)
        else:
            # no debería llegar aquí si se chequeó previamente
            raise HTTPException(status_code=400, detail="Formato no soportado. Se acepta .pdf o .docx.")

    @staticmethod
    async def extract_text_from_pdf(file: Optional[UploadFile] = None) -> str:
        """
        Guarda el UploadFile temporalmente, extrae el texto del PDF y limpia el archivo.
        """
        tmp_path = None
        pdf_text = ""
        
        try:
            # Crear un archivo temporal con extensión .pdf
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                content = await file.read()
                tmp_file.write(content)
                tmp_path = tmp_file.name
            try:
                # Extraer texto del archivo .pdf
                with pdfplumber.open(tmp_path) as pdf:
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            pdf_text += page_text + "\n"
            except Exception as e:
                raise InvalidFileError(detail=f"Error al procesar el PDF (extracción de texto): {str(e)}") 
            
            if not pdf_text.strip():
                raise InvalidFileError(detail="El PDF no contiene texto extraíble.") 

            return pdf_text

        except InvalidFileError:
            raise
        except Exception as e:
            raise ExternalServiceError(detail=f"Error interno al manejar el archivo temporal: {e.__class__.__name__}")
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)