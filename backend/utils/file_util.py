import os
import shutil
import tempfile
import logging
import pdfplumber
import docx
from pathlib import Path
from typing import Optional
from fastapi import UploadFile, HTTPException
from google.cloud import storage
from exceptions import ExternalServiceError, InvalidFileError

logger = logging.getLogger(__name__)

# Configuración de entorno
BUCKET_NAME = os.getenv("BUCKET_NAME")
# Directorio local de respaldo si no hay nube
UPLOAD_DIR = Path(__file__).parent.parent / "uploaded_files"

class FileUtil:
    
    @staticmethod
    def validate_supported_file(file: Optional[UploadFile] = None) -> None:
        """
        Valida que el archivo subido sea PDF o DOCX y que no esté vacío.
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

        if getattr(file, "size", None) is not None and file.size == 0:
            raise InvalidFileError(detail="El archivo no puede estar vacío.")

    @staticmethod
    async def save_upload_file(file: UploadFile, destination_filename: str) -> str:
        """
        Guarda el archivo. Si BUCKET_NAME existe, va a GCS. Si no, a disco local.
        Retorna la ruta (gs://... o ruta local absoluta).
        """
        try:
            # Asegurar que el puntero está al inicio antes de guardar
            await file.seek(0)

            # --- MODO NUBE (Google Cloud Storage) ---
            if BUCKET_NAME:
                logger.info(f"Subiendo archivo a GCS Bucket: {BUCKET_NAME}")
                client = storage.Client()
                bucket = client.bucket(BUCKET_NAME)
                blob = bucket.blob(destination_filename)
                
                # upload_from_file lee el archivo desde la posición actual
                blob.upload_from_file(file.file, content_type=file.content_type)
                
                return f"gs://{BUCKET_NAME}/{destination_filename}"

            # --- MODO LOCAL (Fallback) ---
            else:
                logger.info("Bucket no configurado. Guardando en local.")
                UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
                file_path = UPLOAD_DIR / destination_filename
                
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                
                return str(file_path)

        except Exception as e:
            logger.error(f"Error guardando archivo: {str(e)}")
            raise ExternalServiceError(detail=f"Error al guardar el archivo: {str(e)}")
        finally:
            # Opcional: regresar el puntero al inicio por si se usa después
            await file.seek(0)

    @staticmethod
    def delete_file(file_path: str):
        """Elimina el archivo local o del bucket de GCS"""
        try:
            if file_path.startswith("gs://"):
                # Formato: gs://bucket-name/filename.ext
                parts = file_path.replace("gs://", "").split("/", 1)
                if len(parts) < 2: 
                    return
                
                bucket_name_ref, blob_name = parts[0], parts[1]
                client = storage.Client()
                bucket = client.bucket(bucket_name_ref)
                blob = bucket.blob(blob_name)
                blob.delete()
                logger.info(f"Archivo eliminado de GCS: {blob_name}")
            else:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"Archivo local eliminado: {file_path}")
        except Exception as e:
            logger.error(f"Error eliminando archivo {file_path}: {str(e)}")
            # No lanzamos error para no romper flujos de limpieza, solo log

    @staticmethod
    async def extract_text(file: Optional[UploadFile] = None) -> str:
        """
        Extrae texto del archivo, soportando PDF y DOCX.
        Utiliza archivos temporales del sistema (/tmp) que son efímeros.
        """
        if not file:
            raise InvalidFileError(detail="No se proporcionó ningún archivo para extraer texto.")
        
        # Asegurar puntero al inicio
        await file.seek(0)

        filename = file.filename.lower()
        if filename.endswith(".pdf"):
            return await FileUtil.extract_text_from_pdf(file)
        
        elif filename.endswith(".xlsx") or filename.endswith(".csv"):
            return f"[Archivo {filename}: Tipo tabular detectado. Requiere procesamiento especializado]"
        
        elif filename.endswith(".txt"):
            content = await file.read()
            return content.decode('utf-8', errors='replace')
        
        elif filename.endswith(".docx"):
            tmp_path = None
            try:
                # Crear tempfile en disco (/tmp en linux/cloud run)
                with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as tmp_file:
                    content = await file.read()
                    logger.info(f"Procesando archivo DOCX ({len(content)} bytes)")
                    tmp_file.write(content)
                    tmp_path = tmp_file.name

                try:
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
                raise ExternalServiceError(detail=f"Error interno al manejar el archivo temporal DOCX: {e.__class__.__name__}")
            finally:
                if tmp_path and os.path.exists(tmp_path):
                    os.unlink(tmp_path)
                await file.seek(0) # Resetear puntero
        else:
            raise HTTPException(status_code=400, detail="Formato no soportado. Se acepta .pdf o .docx.")

    @staticmethod
    async def extract_text_from_pdf(file: Optional[UploadFile] = None) -> str:
        """
        Guarda el UploadFile temporalmente, extrae el texto del PDF y limpia el archivo.
        """
        tmp_path = None
        pdf_text = ""
        
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                content = await file.read() 
                tmp_file.write(content)
                tmp_path = tmp_file.name
            
            try:
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
            raise ExternalServiceError(detail=f"Error interno al manejar el archivo temporal PDF: {e.__class__.__name__}")
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)
            await file.seek(0) # Resetear puntero