from fastapi import UploadFile
import os
import tempfile
import pdfplumber
from exceptions import ExternalServiceError, InvalidFileError 


class FileUtil:
    
    @staticmethod
    def is_pdf(file: UploadFile) -> None:
        """
        Valida que el archivo subido sea un PDF y que no esté vacío (tamaño > 0).
        Lanza InvalidFileError si la validación falla.
        """
        if not file.filename or not file.filename.lower().endswith('.pdf'):
            raise InvalidFileError(detail="Solo se aceptan archivos PDF.") 

        if file.size is None or file.size == 0:
            raise InvalidFileError(detail="El archivo PDF no puede estar vacío.") 

    @staticmethod
    async def extract_text_from_pdf(file: UploadFile) -> str:
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
            raise ExternalServiceError(detail=f"Error interno al manejar el archivo temporal: {e.__class__.__name__}")
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)