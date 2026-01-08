"""
Servicio para procesamiento de documentos con Document AI.
"""

from typing import Dict, List
from google.cloud import documentai_v1 as documentai
from core.gcp_service import gcp_service
from core.config import settings
import logging

logger = logging.getLogger(__name__)


class DocumentAIService:
    """Servicio de Document AI."""
    
    def __init__(self):
        self.client = gcp_service.document_ai
        if self.client:
            self.processor_name = gcp_service.get_document_processor_name()
        else:
            self.processor_name = None
    
    def is_available(self) -> bool:
        """Verifica si Document AI está disponible."""
        return self.client is not None and self.processor_name is not None
    
    async def process_document(
        self,
        file_path: str,
        mime_type: str = None
    ) -> Dict[str, Any]:
        """
        Procesa un documento y extrae información estructurada.
        
        Returns:
            {
                'text': str,  # Texto completo
                'entities': List[Dict],  # Entidades detectadas
                'tables': List[Dict],  # Tablas extraídas
                'key_value_pairs': List[Dict],  # Pares clave-valor de formularios
                'pages': int,  # Número de páginas
                'confidence': float  # Confianza promedio
            }
        """
        try:
            # Leer archivo
            with open(file_path, "rb") as f:
                content = f.read()
            
            # Detectar MIME type si no se proporciona
            if not mime_type:
                mime_type = self._detect_mime_type(file_path)
            
            # Configurar request
            name = self._get_processor_name()
            raw_document = documentai.RawDocument(content=content, mime_type=mime_type)
            request = documentai.ProcessRequest(name=name, raw_document=raw_document)
            
            # Procesar documento
            logger.info(f"📄 Procesando documento con Document AI: {file_path}")
            result = self.client.process_document(request=request)
            document = result.document
            
            # Extraer información estructurada
            return {
                'text': document.text,
                'entities': self._extract_entities(document),
                'tables': self._extract_tables(document),
                'key_value_pairs': self._extract_form_fields(document),
                'pages': len(document.pages),
                'confidence': self._calculate_confidence(document)
            }
            
        except Exception as e:
            logger.error(f"❌ Error en Document AI: {e}")
            raise
    
    def extract_rfp_metadata(self, file_path: str) -> Dict[str, Any]:
        """
        Extrae metadata específica de RFPs.
        
        Returns:
            {
                'project_name': str,
                'due_date': str,
                'budget_range': str,
                'client_name': str,
                'contact_info': List[str],
                'requirements_count': int,
                'technical_sections': List[str],
                'deadlines': List[Dict]
            }
        """
        result = self.process_document(file_path)
        
        # Análisis específico para RFPs
        metadata = {
            'project_name': self._find_project_name(result['entities']),
            'due_date': self._find_due_date(result['entities']),
            'budget_range': self._find_budget(result['entities']),
            'client_name': self._find_client(result['entities']),
            'contact_info': self._find_contacts(result['entities']),
            'requirements_count': self._count_requirements(result['tables']),
            'technical_sections': self._identify_sections(result['text']),
            'deadlines': self._extract_deadlines(result['entities'])
        }
        
        return metadata
    
    def extract_requirements_table(self, file_path: str) -> List[Dict]:
        """
        Extrae tabla de requisitos de un RFP.
        
        Returns:
            [
                {
                    'id': 'REQ-001',
                    'description': 'Sistema debe...',
                    'type': 'Funcional',
                    'priority': 'Alta',
                    'compliance': 'Obligatorio'
                },
                ...
            ]
        """
        result = self.process_document(file_path)
        
        requirements = []
        for table in result['tables']:
            # Identificar si es tabla de requisitos
            if self._is_requirements_table(table):
                requirements.extend(self._parse_requirements_table(table))
        
        logger.info(f"📋 Extraídos {len(requirements)} requisitos")
        return requirements
    
    def _extract_entities(self, document) -> List[Dict]:
        """Extrae entidades detectadas."""
        entities = []
        for entity in document.entities:
            entities.append({
                'type': entity.type_,
                'text': entity.mention_text,
                'confidence': entity.confidence,
                'normalized_value': getattr(entity, 'normalized_value', None)
            })
        return entities
    
    def _extract_tables(self, document) -> List[Dict]:
        """Extrae tablas estructuradas."""
        tables = []
        for page in document.pages:
            for table in page.tables:
                table_data = {
                    'rows': len(table.body_rows),
                    'columns': len(table.header_rows[0].cells) if table.header_rows else 0,
                    'headers': [],
                    'data': []
                }
                
                # Headers
                if table.header_rows:
                    for cell in table.header_rows[0].cells:
                        table_data['headers'].append(self._get_cell_text(cell, document))
                
                # Rows
                for row in table.body_rows:
                    row_data = []
                    for cell in row.cells:
                        row_data.append(self._get_cell_text(cell, document))
                    table_data['data'].append(row_data)
                
                tables.append(table_data)
        
        return tables
    
    def _extract_form_fields(self, document) -> List[Dict]:
        """Extrae pares clave-valor de formularios."""
        fields = []
        for page in document.pages:
            for field in page.form_fields:
                fields.append({
                    'key': self._get_text(field.field_name, document),
                    'value': self._get_text(field.field_value, document),
                    'confidence': field.field_value.confidence
                })
        return fields
    
    def _get_cell_text(self, cell, document) -> str:
        """Obtiene texto de una celda de tabla."""
        text = ""
        for segment in cell.layout.text_anchor.text_segments:
            text += document.text[segment.start_index:segment.end_index]
        return text.strip()
    
    def _get_text(self, layout, document) -> str:
        """Obtiene texto de un layout."""
        if not layout or not layout.text_anchor:
            return ""
        
        text = ""
        for segment in layout.text_anchor.text_segments:
            text += document.text[segment.start_index:segment.end_index]
        return text.strip()
    
    def _calculate_confidence(self, document) -> float:
        """Calcula confianza promedio del OCR."""
        if not document.pages:
            return 0.0
        
        total_confidence = sum(page.layout.confidence for page in document.pages if page.layout)
        return total_confidence / len(document.pages) if document.pages else 0.0
    
    def _detect_mime_type(self, file_path: str) -> str:
        """Detecta MIME type del archivo."""
        ext = Path(file_path).suffix.lower()
        mime_types = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.tiff': 'image/tiff',
            '.gif': 'image/gif',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }
        return mime_types.get(ext, 'application/pdf')
    
    def _get_processor_name(self) -> str:
        """Obtiene nombre completo del procesador."""
        if self.processor_id:
            return f"projects/{self.project_id}/locations/{self.location}/processors/{self.processor_id}"
        # Usar procesador general si no hay ID específico
        return f"projects/{self.project_id}/locations/{self.location}/processors/general"
    
    def _find_project_name(self, entities: List[Dict]) -> Optional[str]:
        """Encuentra nombre del proyecto en entidades."""
        # Buscar entidades de tipo "project" o títulos prominentes
        for entity in entities:
            if entity['type'] in ['project', 'title'] and entity['confidence'] > 0.8:
                return entity['text']
        return None
    
    def _find_due_date(self, entities: List[Dict]) -> Optional[str]:
        """Encuentra fecha límite."""
        for entity in entities:
            if entity['type'] == 'date' and 'due' in entity['text'].lower():
                return entity['normalized_value'] or entity['text']
        return None
    
    def _find_budget(self, entities: List[Dict]) -> Optional[str]:
        """Encuentra presupuesto."""
        for entity in entities:
            if entity['type'] in ['money', 'price']:
                return entity['text']
        return None
    
    def _find_client(self, entities: List[Dict]) -> Optional[str]:
        """Encuentra nombre del cliente."""
        for entity in entities:
            if entity['type'] == 'organization' and entity['confidence'] > 0.9:
                return entity['text']
        return None
    
    def _find_contacts(self, entities: List[Dict]) -> List[str]:
        """Encuentra información de contacto."""
        contacts = []
        for entity in entities:
            if entity['type'] in ['email', 'phone_number', 'person']:
                contacts.append(entity['text'])
        return contacts
    
    def _count_requirements(self, tables: List[Dict]) -> int:
        """Cuenta requisitos en tablas."""
        total = 0
        for table in tables:
            if self._is_requirements_table(table):
                total += len(table['data'])
        return total
    
    def _is_requirements_table(self, table: Dict) -> bool:
        """Determina si una tabla contiene requisitos."""
        headers = [h.lower() for h in table.get('headers', [])]
        req_keywords = ['requisito', 'requirement', 'requerimiento', 'id', 'descripción']
        return any(keyword in ' '.join(headers) for keyword in req_keywords)
    
    def _parse_requirements_table(self, table: Dict) -> List[Dict]:
        """Parsea tabla de requisitos."""
        requirements = []
        headers = table['headers']
        
        for row in table['data']:
            req = {}
            for i, value in enumerate(row):
                if i < len(headers):
                    req[headers[i].lower()] = value
            requirements.append(req)
        
        return requirements
    
    def _identify_sections(self, text: str) -> List[str]:
        """Identifica secciones técnicas del documento."""
        sections = []
        common_sections = [
            'alcance', 'scope', 'requisitos', 'requirements',
            'arquitectura', 'architecture', 'tecnología', 'technology',
            'cronograma', 'timeline', 'presupuesto', 'budget'
        ]
        
        for section in common_sections:
            if section in text.lower():
                sections.append(section.title())
        
        return sections
    
    def _extract_deadlines(self, entities: List[Dict]) -> List[Dict]:
        """Extrae fechas importantes."""
        deadlines = []
        for entity in entities:
            if entity['type'] == 'date':
                deadlines.append({
                    'date': entity['normalized_value'] or entity['text'],
                    'context': entity['text'],
                    'confidence': entity['confidence']
                })
        return deadlines


# Singleton instance
_document_ai_service = None

def get_document_ai_service(project_id: str = None) -> DocumentAIService:
    """Obtiene instancia del servicio Document AI."""
    global _document_ai_service
    
    if _document_ai_service is None:
        from core.config import settings
        project_id = project_id or settings.GOOGLE_CLOUD_PROJECT
        _document_ai_service = DocumentAIService(project_id)
    
    return _document_ai_service
