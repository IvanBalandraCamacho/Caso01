import os
from pathlib import Path
import pandas as pd
import PyPDF2
import docx
import openpyxl
from pptx import Presentation
import pytesseract
from pdf2image import convert_from_path
from PIL import Image
from odf import text as odf_text, teletype
from odf.opendocument import load as odf_load
from striprtf.striprtf import rtf_to_text
from langdetect import detect, LangDetectException
import tempfile
import logging

logger = logging.getLogger(__name__)


def detect_language(text: str) -> str:
    """Detecta el idioma del texto"""
    try:
        if len(text.strip()) < 20:
            return "unknown"
        lang = detect(text)
        logger.info(f"Idioma detectado: {lang}")
        return lang
    except LangDetectException:
        logger.warning("No se pudo detectar el idioma")
        return "unknown"


def extract_tables_from_docx(doc) -> str:
    """Extrae tablas de un documento Word"""
    tables_text = ""
    for table in doc.tables:
        table_data = []
        for row in table.rows:
            row_data = [cell.text.strip() for cell in row.cells]
            table_data.append(row_data)
        
        # Formatear tabla
        if table_data:
            tables_text += "\n\n[TABLA]\n"
            for row in table_data:
                tables_text += " | ".join(row) + "\n"
            tables_text += "[/TABLA]\n"
    
    return tables_text


def ocr_pdf(file_path: Path) -> str:
    """Aplica OCR a un PDF escaneado"""
    logger.info(f"Aplicando OCR a {file_path}")
    text = ""
    
    try:
        # Convertir PDF a imágenes
        with tempfile.TemporaryDirectory() as temp_dir:
            images = convert_from_path(str(file_path), output_folder=temp_dir)
            
            for i, image in enumerate(images):
                logger.info(f"Procesando página {i+1}/{len(images)} con OCR")
                # Aplicar OCR a cada imagen
                page_text = pytesseract.image_to_string(image, lang='spa+eng')
                text += f"\n--- Página {i+1} ---\n{page_text}\n"
        
        return text
    except Exception as e:
        logger.error(f"Error en OCR: {e}")
        return ""


def extract_text_from_file(file_path: Path) -> str:
    """
    Extrae texto de un archivo (PDF, DOCX, XLSX, PPTX, ODT, RTF, TXT).
    Incluye OCR para PDFs escaneados, extracción de tablas y detección de idioma.
    """
    # Detectar tipo de archivo por extensión
    file_extension = str(file_path).split('.')[-1].lower()
    
    print(f"PARSER: Extrayendo texto de {file_path} (Extensión: {file_extension})")
    
    full_text = ""
    metadata = {}
    
    try:
        if file_extension == "pdf":
            # Intentar extracción normal primero
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    full_text += page.extract_text() + "\n"
            
            # Si el texto extraído es muy corto, puede ser un PDF escaneado
            if len(full_text.strip()) < 100:
                logger.warning("PDF parece escaneado, aplicando OCR...")
                ocr_text = ocr_pdf(file_path)
                if ocr_text:
                    full_text = ocr_text
        
        elif file_extension in ["docx", "doc"]:
            doc = docx.Document(file_path)
            # Extraer párrafos
            for para in doc.paragraphs:
                full_text += para.text + "\n"
            # Extraer tablas
            full_text += extract_tables_from_docx(doc)
        
        elif file_extension == "pptx":
            prs = Presentation(file_path)
            for i, slide in enumerate(prs.slides):
                full_text += f"\n--- Diapositiva {i+1} ---\n"
                for shape in slide.shapes:
                    if hasattr(shape, "text"):
                        full_text += shape.text + "\n"
        
        elif file_extension in ["xlsx", "xls"]:
            df = pd.read_excel(file_path)
            full_text = df.to_string()
        
        elif file_extension == "csv":
            df = pd.read_csv(file_path)
            full_text = df.to_string()
        
        elif file_extension == "odt":
            # Leer archivo ODT
            doc = odf_load(file_path)
            paragraphs = doc.getElementsByType(odf_text.P)
            for para in paragraphs:
                full_text += teletype.extractText(para) + "\n"
        
        elif file_extension == "rtf":
            # Leer archivo RTF
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                rtf_content = f.read()
                full_text = rtf_to_text(rtf_content)
            
        elif file_extension == "txt":
            with open(file_path, "r", encoding="utf-8") as f:
                full_text = f.read()
        
        else:
            print(f"PARSER: Extensión de archivo '{file_extension}' no soportada.")
            raise ValueError(f"Tipo de archivo no soportado: {file_extension}")
        
        # Detectar idioma del texto extraído
        if full_text.strip():
            metadata['language'] = detect_language(full_text)
            metadata['length'] = len(full_text)
        
        print(f"PARSER: Texto extraído exitosamente (Longitud: {len(full_text)} caracteres, Idioma: {metadata.get('language', 'unknown')})")
        return full_text

    except Exception as e:
        print(f"PARSER: Error al extraer texto de {file_path}: {e}")
        raise