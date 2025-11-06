import os
from pathlib import Path
import pandas as pd
import PyPDF2
import docx
import openpyxl # Necesario para que pandas lea .xlsx
import mimetypes

def extract_text_from_file(file_path: Path) -> str:
    """
    Extrae texto de un archivo (PDF, DOCX, XLSX, CSV, TXT).
    """
    file_type = mimetypes.guess_type(file_path)[0]
    
    print(f"PARSER: Extrayendo texto de {file_path} (Tipo: {file_type})")
    
    full_text = ""
    
    try:
        if file_type == "application/pdf":
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    full_text += page.extract_text() + "\n"
        
        elif file_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            doc = docx.Document(file_path)
            for para in doc.paragraphs:
                full_text += para.text + "\n"
        
        elif file_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
            df = pd.read_excel(file_path)
            full_text = df.to_string() # Convierte el dataframe entero a texto
        
        elif file_type == "text/csv":
            df = pd.read_csv(file_path)
            full_text = df.to_string()
            
        elif file_type == "text/plain":
            with open(file_path, "r", encoding="utf-8") as f:
                full_text = f.read()
        
        else:
            print(f"PARSER: Tipo de archivo '{file_type}' no soportado.")
            raise ValueError(f"Tipo de archivo no soportado: {file_type}")
        
        print(f"PARSER: Texto extraído exitosamente (Longitud: {len(full_text)} caracteres).")
        return full_text

    except Exception as e:
        print(f"PARSER: Error al extraer texto de {file_path}: {e}")
        raise